from fastapi import FastAPI, APIRouter, HTTPException, Depends, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Literal
import uuid
from datetime import datetime, timezone
import asyncio
import warnings
from google_auth_oauthlib.flow import Flow
from googleapiclient.discovery import build
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")


SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets",
    "openid",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
]

GOOGLE_CLIENT_ID = os.environ.get("GOOGLE_CLIENT_ID")
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET")
GOOGLE_REDIRECT_URI = os.environ.get("GOOGLE_REDIRECT_URI")


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def now_iso() -> str:
    return now_utc().isoformat()


class AuthUser(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    email: str
    role: Literal["super_admin", "pre_sales", "sales"]
    branch_id: Optional[str] = None
    is_active: bool = True
    created_at: str


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    user: AuthUser


class BranchCreate(BaseModel):
    name: str
    city: Optional[str] = ""


class BranchOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    city: Optional[str] = ""
    is_active: bool = True
    created_at: str


class UserCreate(BaseModel):
    full_name: str
    email: str
    password: str
    role: Literal["pre_sales", "sales", "super_admin"]
    branch_id: Optional[str] = None


class StageCreate(BaseModel):
    name: str
    pipeline: Literal["pre_sales", "sales"]
    order: Optional[int] = None


class StageOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    pipeline: Literal["pre_sales", "sales"]
    order: int
    created_at: str


class StageUpdate(BaseModel):
    name: Optional[str] = None
    order: Optional[int] = None


class LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    source: Optional[str] = "Manual"
    branch_id: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = ""


class LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    source: Optional[str] = None
    branch_id: Optional[str] = None
    assigned_to: Optional[str] = None
    notes: Optional[str] = None
    consultation_fee: Optional[float] = None
    appointment_datetime: Optional[str] = None


class MoveStageRequest(BaseModel):
    pipeline: Literal["pre_sales", "sales"]
    stage: str


class AppointmentBookingRequest(BaseModel):
    appointment_datetime: str
    consultation_fee: float = 0
    branch_id: Optional[str] = None
    assigned_to_sales: Optional[str] = None


class LeadOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    phone: str
    email: Optional[str] = ""
    source: str
    branch_id: Optional[str] = None
    assigned_to: Optional[str] = None
    pre_sales_stage: str
    sales_stage: str
    current_owner: Literal["pre_sales", "sales"]
    status: str
    consultation_fee: float
    appointment_datetime: Optional[str] = None
    notes: Optional[str] = ""
    created_at: str
    updated_at: str


class DashboardMetrics(BaseModel):
    total_leads: int
    pre_sales_open: int
    sales_open: int
    appointments_booked: int
    package_sold: int


class BranchMetric(BaseModel):
    branch_id: str
    branch_name: str
    lead_count: int


class DashboardSummary(BaseModel):
    metrics: DashboardMetrics
    branch_breakdown: List[BranchMetric]


class SheetsConfigInput(BaseModel):
    spreadsheet_id: str
    sheet_name: str = "Leads"
    column_mapping: Dict[str, str]


class SheetsConfigOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    spreadsheet_id: str
    sheet_name: str
    column_mapping: Dict[str, str]
    last_sync: Optional[str] = None


class SheetsStatusOut(BaseModel):
    connected: bool
    has_oauth_keys: bool
    spreadsheet_id: Optional[str] = None
    last_sync: Optional[str] = None
    mapped_fields: List[str]
    message: str


async def get_default_stage_name(pipeline: str) -> str:
    stage = await db.stages.find_one({"pipeline": pipeline}, {"_id": 0}, sort=[("order", 1)])
    if not stage:
        raise HTTPException(status_code=400, detail=f"No stages configured for {pipeline}")
    return stage["name"]


async def get_current_user(authorization: str = Header(...)) -> AuthUser:
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")

    token = authorization.split(" ", 1)[1].strip()
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Session expired. Please login again.")

    user_doc = await db.users.find_one(
        {"id": session["user_id"], "is_active": True},
        {"_id": 0, "password": 0},
    )
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    return AuthUser(**user_doc)


def require_roles(*roles: str):
    async def checker(user: AuthUser = Depends(get_current_user)) -> AuthUser:
        if user.role not in roles:
            raise HTTPException(status_code=403, detail="You do not have permission for this action")
        return user

    return checker


async def ensure_seed_data() -> None:
    users_count = await db.users.count_documents({})
    if users_count == 0:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "full_name": "Super Admin",
                "email": "admin@physiofit.com",
                "password": "admin123",
                "role": "super_admin",
                "branch_id": None,
                "is_active": True,
                "created_at": now_iso(),
            }
        )

    stages_count = await db.stages.count_documents({})
    if stages_count == 0:
        base_stages = [
            {"name": "New Lead", "pipeline": "pre_sales", "order": 1},
            {"name": "Follow Up", "pipeline": "pre_sales", "order": 2},
            {"name": "Appointment Booked", "pipeline": "pre_sales", "order": 3},
            {"name": "New Appointment", "pipeline": "sales", "order": 1},
            {"name": "Discussion", "pipeline": "sales", "order": 2},
            {"name": "Package Purchased", "pipeline": "sales", "order": 3},
        ]
        for item in base_stages:
            await db.stages.insert_one(
                {
                    "id": str(uuid.uuid4()),
                    "name": item["name"],
                    "pipeline": item["pipeline"],
                    "order": item["order"],
                    "created_at": now_iso(),
                }
            )

    await db.sheets_configs.update_one(
        {"singleton": "global"},
        {
            "$setOnInsert": {
                "singleton": "global",
                "spreadsheet_id": "",
                "sheet_name": "Leads",
                "column_mapping": {},
                "last_sync": None,
                "updated_at": now_iso(),
            }
        },
        upsert=True,
    )

# Add your routes to the router instead of directly to app
@api_router.get("/")
async def root():
    return {"message": "PhysioFit CRM API is running"}


@api_router.post("/auth/login", response_model=LoginResponse)
async def login(payload: LoginRequest):
    user_doc = await db.users.find_one(
        {"email": payload.email.lower(), "is_active": True},
        {"_id": 0},
    )
    if not user_doc or user_doc.get("password") != payload.password:
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = str(uuid.uuid4())
    await db.sessions.delete_many({"user_id": user_doc["id"]})
    await db.sessions.insert_one(
        {
            "token": token,
            "user_id": user_doc["id"],
            "created_at": now_iso(),
        }
    )

    user_public = {k: v for k, v in user_doc.items() if k != "password"}
    return LoginResponse(token=token, user=AuthUser(**user_public))


@api_router.get("/auth/me", response_model=AuthUser)
async def me(user: AuthUser = Depends(get_current_user)):
    return user


@api_router.post("/auth/logout")
async def logout(user: AuthUser = Depends(get_current_user), authorization: str = Header(...)):
    token = authorization.split(" ", 1)[1].strip()
    await db.sessions.delete_one({"token": token, "user_id": user.id})
    return {"message": "Logged out"}


@api_router.get("/branches", response_model=List[BranchOut])
async def list_branches(_: AuthUser = Depends(get_current_user)):
    docs = await db.branches.find({"is_active": True}, {"_id": 0}).sort("created_at", 1).to_list(1000)
    return [BranchOut(**doc) for doc in docs]


@api_router.post("/branches", response_model=BranchOut)
async def create_branch(payload: BranchCreate, _: AuthUser = Depends(require_roles("super_admin"))):
    name = payload.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Branch name is required")

    exists = await db.branches.find_one({"name": {"$regex": f"^{name}$", "$options": "i"}}, {"_id": 0})
    if exists:
        raise HTTPException(status_code=409, detail="Branch already exists")

    branch = {
        "id": str(uuid.uuid4()),
        "name": name,
        "city": payload.city or "",
        "is_active": True,
        "created_at": now_iso(),
    }
    await db.branches.insert_one(branch.copy())
    return BranchOut(**branch)


@api_router.get("/users", response_model=List[AuthUser])
async def list_users(
    branch_id: Optional[str] = None,
    role: Optional[str] = None,
    _: AuthUser = Depends(get_current_user),
):
    query: Dict[str, object] = {"is_active": True}
    if branch_id:
        query["branch_id"] = branch_id
    if role:
        query["role"] = role

    docs = await db.users.find(query, {"_id": 0, "password": 0}).sort("created_at", -1).to_list(1000)
    return [AuthUser(**doc) for doc in docs]


@api_router.post("/users", response_model=AuthUser)
async def create_user(payload: UserCreate, _: AuthUser = Depends(require_roles("super_admin"))):
    email = payload.email.lower().strip()
    if not email:
        raise HTTPException(status_code=400, detail="Email is required")

    exists = await db.users.find_one({"email": email}, {"_id": 0})
    if exists:
        raise HTTPException(status_code=409, detail="User with this email already exists")

    user_doc = {
        "id": str(uuid.uuid4()),
        "full_name": payload.full_name.strip(),
        "email": email,
        "password": payload.password,
        "role": payload.role,
        "branch_id": payload.branch_id,
        "is_active": True,
        "created_at": now_iso(),
    }
    await db.users.insert_one(user_doc.copy())

    user_out = {k: v for k, v in user_doc.items() if k != "password"}
    return AuthUser(**user_out)


@api_router.get("/stages", response_model=List[StageOut])
async def list_stages(pipeline: Optional[Literal["pre_sales", "sales"]] = None, _: AuthUser = Depends(get_current_user)):
    query = {"pipeline": pipeline} if pipeline else {}
    docs = await db.stages.find(query, {"_id": 0}).sort([("pipeline", 1), ("order", 1)]).to_list(1000)
    return [StageOut(**doc) for doc in docs]


@api_router.post("/stages", response_model=StageOut)
async def create_stage(payload: StageCreate, _: AuthUser = Depends(require_roles("super_admin"))):
    stage_name = payload.name.strip()
    if not stage_name:
        raise HTTPException(status_code=400, detail="Stage name is required")

    duplicate = await db.stages.find_one(
        {
            "pipeline": payload.pipeline,
            "name": {"$regex": f"^{stage_name}$", "$options": "i"},
        },
        {"_id": 0},
    )
    if duplicate:
        raise HTTPException(status_code=409, detail="Stage already exists")

    if payload.order is None:
        latest = await db.stages.find_one(
            {"pipeline": payload.pipeline},
            {"_id": 0, "order": 1},
            sort=[("order", -1)],
        )
        order = (latest.get("order", 0) + 1) if latest else 1
    else:
        order = payload.order

    doc = {
        "id": str(uuid.uuid4()),
        "name": stage_name,
        "pipeline": payload.pipeline,
        "order": order,
        "created_at": now_iso(),
    }
    await db.stages.insert_one(doc.copy())
    return StageOut(**doc)


@api_router.put("/stages/{stage_id}", response_model=StageOut)
async def update_stage(stage_id: str, payload: StageUpdate, _: AuthUser = Depends(require_roles("super_admin"))):
    updates: Dict[str, object] = {}
    if payload.name is not None:
        updates["name"] = payload.name.strip()
    if payload.order is not None:
        updates["order"] = payload.order

    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    result = await db.stages.update_one({"id": stage_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Stage not found")

    updated = await db.stages.find_one({"id": stage_id}, {"_id": 0})
    return StageOut(**updated)


@api_router.get("/leads", response_model=List[LeadOut])
async def list_leads(
    pipeline: Optional[Literal["pre_sales", "sales"]] = None,
    branch_id: Optional[str] = None,
    stage: Optional[str] = None,
    search: Optional[str] = None,
    _: AuthUser = Depends(get_current_user),
):
    query: Dict[str, object] = {}

    if pipeline:
        query["current_owner"] = pipeline
    if branch_id:
        query["branch_id"] = branch_id
    if stage and pipeline == "pre_sales":
        query["pre_sales_stage"] = stage
    if stage and pipeline == "sales":
        query["sales_stage"] = stage
    if search:
        query["$or"] = [
            {"name": {"$regex": search, "$options": "i"}},
            {"phone": {"$regex": search, "$options": "i"}},
            {"email": {"$regex": search, "$options": "i"}},
        ]

    docs = await db.leads.find(query, {"_id": 0}).sort("updated_at", -1).to_list(1000)
    return [LeadOut(**doc) for doc in docs]


@api_router.post("/leads", response_model=LeadOut)
async def create_lead(payload: LeadCreate, _: AuthUser = Depends(require_roles("super_admin", "pre_sales"))):
    pre_sales_stage = await get_default_stage_name("pre_sales")
    sales_stage = await get_default_stage_name("sales")

    doc = {
        "id": str(uuid.uuid4()),
        "name": payload.name.strip(),
        "phone": payload.phone.strip(),
        "email": (payload.email or "").strip(),
        "source": payload.source or "Manual",
        "branch_id": payload.branch_id,
        "assigned_to": payload.assigned_to,
        "pre_sales_stage": pre_sales_stage,
        "sales_stage": sales_stage,
        "current_owner": "pre_sales",
        "status": "new",
        "consultation_fee": 0,
        "appointment_datetime": None,
        "notes": payload.notes or "",
        "created_at": now_iso(),
        "updated_at": now_iso(),
    }

    await db.leads.insert_one(doc.copy())
    return LeadOut(**doc)


@api_router.put("/leads/{lead_id}", response_model=LeadOut)
async def update_lead(lead_id: str, payload: LeadUpdate, _: AuthUser = Depends(require_roles("super_admin", "pre_sales", "sales"))):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail="No updates provided")

    updates["updated_at"] = now_iso()
    result = await db.leads.update_one({"id": lead_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return LeadOut(**updated)


@api_router.post("/leads/{lead_id}/book-appointment", response_model=LeadOut)
async def book_appointment(
    lead_id: str,
    payload: AppointmentBookingRequest,
    _: AuthUser = Depends(require_roles("super_admin", "pre_sales")),
):
    lead = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    if not lead:
        raise HTTPException(status_code=404, detail="Lead not found")

    sales_stage = lead.get("sales_stage") or await get_default_stage_name("sales")
    updates: Dict[str, object] = {
        "appointment_datetime": payload.appointment_datetime,
        "consultation_fee": payload.consultation_fee,
        "pre_sales_stage": "Appointment Booked",
        "sales_stage": sales_stage,
        "current_owner": "sales",
        "status": "appointment_booked",
        "updated_at": now_iso(),
    }
    if payload.branch_id is not None:
        updates["branch_id"] = payload.branch_id
    if payload.assigned_to_sales is not None:
        updates["assigned_to"] = payload.assigned_to_sales

    await db.leads.update_one({"id": lead_id}, {"$set": updates})
    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return LeadOut(**updated)


@api_router.post("/leads/{lead_id}/move-stage", response_model=LeadOut)
async def move_stage(
    lead_id: str,
    payload: MoveStageRequest,
    _: AuthUser = Depends(require_roles("super_admin", "pre_sales", "sales")),
):
    stage_exists = await db.stages.find_one(
        {"pipeline": payload.pipeline, "name": payload.stage},
        {"_id": 0},
    )
    if not stage_exists:
        raise HTTPException(status_code=404, detail="Stage does not exist")

    updates: Dict[str, object] = {"updated_at": now_iso()}
    if payload.pipeline == "pre_sales":
        updates["pre_sales_stage"] = payload.stage
        updates["current_owner"] = "pre_sales"
        updates["status"] = "pre_sales_progress"
    else:
        updates["sales_stage"] = payload.stage
        updates["current_owner"] = "sales"
        if payload.stage.lower() == "package purchased":
            updates["status"] = "package_sold"
        else:
            updates["status"] = "sales_progress"

    result = await db.leads.update_one({"id": lead_id}, {"$set": updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Lead not found")

    updated = await db.leads.find_one({"id": lead_id}, {"_id": 0})
    return LeadOut(**updated)


@api_router.get("/dashboard/summary", response_model=DashboardSummary)
async def dashboard_summary(_: AuthUser = Depends(get_current_user)):
    branches = await db.branches.find({"is_active": True}, {"_id": 0}).to_list(1000)
    branch_name_map = {b["id"]: b["name"] for b in branches}

    total_leads = await db.leads.count_documents({})
    pre_sales_open = await db.leads.count_documents({"current_owner": "pre_sales"})
    sales_open = await db.leads.count_documents({"current_owner": "sales"})
    appointments_booked = await db.leads.count_documents({"appointment_datetime": {"$ne": None}})
    package_sold = await db.leads.count_documents({"status": "package_sold"})

    pipeline = [
        {"$group": {"_id": "$branch_id", "lead_count": {"$sum": 1}}},
        {"$sort": {"lead_count": -1}},
    ]
    branch_rows = await db.leads.aggregate(pipeline).to_list(100)
    breakdown = [
        BranchMetric(
            branch_id=row.get("_id") or "unassigned",
            branch_name=branch_name_map.get(row.get("_id"), "Unassigned"),
            lead_count=row.get("lead_count", 0),
        )
        for row in branch_rows
    ]

    return DashboardSummary(
        metrics=DashboardMetrics(
            total_leads=total_leads,
            pre_sales_open=pre_sales_open,
            sales_open=sales_open,
            appointments_booked=appointments_booked,
            package_sold=package_sold,
        ),
        branch_breakdown=breakdown,
    )


@api_router.get("/sheets/status", response_model=SheetsStatusOut)
async def sheets_status(user: AuthUser = Depends(get_current_user)):
    config = await db.sheets_configs.find_one({"singleton": "global"}, {"_id": 0})
    token_doc = await db.sheets_tokens.find_one({"user_id": user.id}, {"_id": 0})

    has_oauth_keys = all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI])
    connected = bool(token_doc and config and config.get("spreadsheet_id"))
    message = (
        "Google Sheets connected and ready"
        if connected
        else "Connection pending: add OAuth keys and connect from Super Admin"
    )

    return SheetsStatusOut(
        connected=connected,
        has_oauth_keys=has_oauth_keys,
        spreadsheet_id=(config or {}).get("spreadsheet_id"),
        last_sync=(config or {}).get("last_sync"),
        mapped_fields=list((config or {}).get("column_mapping", {}).keys()),
        message=message,
    )


@api_router.get("/sheets/config", response_model=SheetsConfigOut)
async def get_sheets_config(_: AuthUser = Depends(require_roles("super_admin"))):
    config = await db.sheets_configs.find_one({"singleton": "global"}, {"_id": 0})
    if not config:
        raise HTTPException(status_code=404, detail="Google Sheets config not found")

    return SheetsConfigOut(
        spreadsheet_id=config.get("spreadsheet_id", ""),
        sheet_name=config.get("sheet_name", "Leads"),
        column_mapping=config.get("column_mapping", {}),
        last_sync=config.get("last_sync"),
    )


@api_router.post("/sheets/config", response_model=SheetsConfigOut)
async def save_sheets_config(payload: SheetsConfigInput, _: AuthUser = Depends(require_roles("super_admin"))):
    update_doc = {
        "spreadsheet_id": payload.spreadsheet_id.strip(),
        "sheet_name": payload.sheet_name.strip() or "Leads",
        "column_mapping": payload.column_mapping,
        "updated_at": now_iso(),
    }
    await db.sheets_configs.update_one({"singleton": "global"}, {"$set": update_doc}, upsert=True)

    config = await db.sheets_configs.find_one({"singleton": "global"}, {"_id": 0})
    return SheetsConfigOut(
        spreadsheet_id=config.get("spreadsheet_id", ""),
        sheet_name=config.get("sheet_name", "Leads"),
        column_mapping=config.get("column_mapping", {}),
        last_sync=config.get("last_sync"),
    )


@api_router.get("/oauth/sheets/login")
async def sheets_login(user: AuthUser = Depends(require_roles("super_admin"))):
    if not all([GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REDIRECT_URI]):
        raise HTTPException(status_code=400, detail="Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )

    url, state = flow.authorization_url(access_type="offline", prompt="consent")
    await db.oauth_states.update_one(
        {"state": state},
        {
            "$set": {
                "state": state,
                "user_id": user.id,
                "expires_at": now_iso(),
            }
        },
        upsert=True,
    )
    return {"auth_url": url}


@api_router.get("/oauth/sheets/callback")
async def sheets_callback(code: str, state: str):
    state_doc = await db.oauth_states.find_one({"state": state}, {"_id": 0})
    if not state_doc:
        raise HTTPException(status_code=400, detail="Invalid OAuth state")

    flow = Flow.from_client_config(
        {
            "web": {
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "auth_uri": "https://accounts.google.com/o/oauth2/auth",
                "token_uri": "https://oauth2.googleapis.com/token",
            }
        },
        scopes=SCOPES,
        redirect_uri=GOOGLE_REDIRECT_URI,
    )

    with warnings.catch_warnings():
        warnings.simplefilter("ignore")
        flow.fetch_token(code=code)

    creds = flow.credentials
    required_scopes = {"https://www.googleapis.com/auth/spreadsheets"}
    granted_scopes = set(creds.scopes or [])
    if not required_scopes.issubset(granted_scopes):
        missing = required_scopes - granted_scopes
        raise HTTPException(status_code=400, detail=f"Missing required sheets scopes: {', '.join(missing)}")

    expires = creds.expiry or now_utc()
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    await db.sheets_tokens.update_one(
        {"user_id": state_doc["user_id"]},
        {
            "$set": {
                "user_id": state_doc["user_id"],
                "access_token": creds.token,
                "refresh_token": creds.refresh_token,
                "expires_at": expires.isoformat(),
                "client_id": GOOGLE_CLIENT_ID,
                "client_secret": GOOGLE_CLIENT_SECRET,
                "token_uri": "https://oauth2.googleapis.com/token",
                "scopes": list(granted_scopes),
                "updated_at": now_iso(),
            }
        },
        upsert=True,
    )

    await db.oauth_states.delete_one({"state": state})
    return RedirectResponse(url="/")


async def get_sheets_creds(user_id: str) -> Credentials:
    token = await db.sheets_tokens.find_one({"user_id": user_id}, {"_id": 0})
    if not token:
        raise HTTPException(status_code=400, detail="Google Sheets not connected")

    creds = Credentials(
        token=token["access_token"],
        refresh_token=token.get("refresh_token"),
        token_uri=token["token_uri"],
        client_id=token["client_id"],
        client_secret=token["client_secret"],
        scopes=token.get("scopes", SCOPES),
    )

    expires = datetime.fromisoformat(token["expires_at"])
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)

    if now_utc() >= expires and creds.refresh_token:
        creds.refresh(GoogleRequest())
        fresh_expiry = creds.expiry or now_utc()
        if fresh_expiry.tzinfo is None:
            fresh_expiry = fresh_expiry.replace(tzinfo=timezone.utc)

        await db.sheets_tokens.update_one(
            {"user_id": user_id},
            {
                "$set": {
                    "access_token": creds.token,
                    "expires_at": fresh_expiry.isoformat(),
                    "updated_at": now_iso(),
                }
            },
        )

    return creds


@api_router.post("/sheets/sync/import")
async def import_from_sheets(user: AuthUser = Depends(require_roles("super_admin"))):
    config = await db.sheets_configs.find_one({"singleton": "global"}, {"_id": 0})
    if not config or not config.get("spreadsheet_id"):
        raise HTTPException(status_code=400, detail="Spreadsheet ID is not configured")

    if not config.get("column_mapping"):
        raise HTTPException(status_code=400, detail="Column mapping is required before sync")

    creds = await get_sheets_creds(user.id)
    range_name = f"{config.get('sheet_name', 'Leads')}!A1:Z2000"

    def read_values() -> List[List[str]]:
        service = build("sheets", "v4", credentials=creds, cache_discovery=False)
        result = service.spreadsheets().values().get(
            spreadsheetId=config["spreadsheet_id"],
            range=range_name,
        ).execute()
        return result.get("values", [])

    values = await asyncio.to_thread(read_values)
    if len(values) <= 1:
        return {"imported_count": 0, "skipped_count": 0, "message": "No lead rows found"}

    header = values[0]
    header_index = {col: idx for idx, col in enumerate(header)}
    existing = await db.leads.find({}, {"_id": 0, "phone": 1}).to_list(10000)
    existing_phones = {item.get("phone") for item in existing if item.get("phone")}

    pre_sales_stage = await get_default_stage_name("pre_sales")
    sales_stage = await get_default_stage_name("sales")

    import_rows = []
    skipped_count = 0
    for row in values[1:]:
        mapped: Dict[str, str] = {}
        for lead_field, sheet_column in config["column_mapping"].items():
            idx = header_index.get(sheet_column)
            if idx is not None and idx < len(row):
                mapped[lead_field] = row[idx]

        phone = (mapped.get("phone") or "").strip()
        if not phone or phone in existing_phones:
            skipped_count += 1
            continue

        lead_doc = {
            "id": str(uuid.uuid4()),
            "name": (mapped.get("name") or "Unknown Lead").strip(),
            "phone": phone,
            "email": (mapped.get("email") or "").strip(),
            "source": (mapped.get("source") or "Google Sheets").strip(),
            "branch_id": mapped.get("branch_id"),
            "assigned_to": mapped.get("assigned_to"),
            "pre_sales_stage": pre_sales_stage,
            "sales_stage": sales_stage,
            "current_owner": "pre_sales",
            "status": "new",
            "consultation_fee": 0,
            "appointment_datetime": None,
            "notes": mapped.get("notes", "Imported from Google Sheets"),
            "created_at": now_iso(),
            "updated_at": now_iso(),
        }
        import_rows.append(lead_doc)
        existing_phones.add(phone)

    if import_rows:
        await db.leads.insert_many([row.copy() for row in import_rows])

    await db.sheets_configs.update_one(
        {"singleton": "global"},
        {"$set": {"last_sync": now_iso(), "updated_at": now_iso()}},
    )

    return {
        "imported_count": len(import_rows),
        "skipped_count": skipped_count,
        "message": "Google Sheets import completed",
    }


@app.on_event("startup")
async def startup_seed_data():
    await ensure_seed_data()

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()