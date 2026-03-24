from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Literal


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
