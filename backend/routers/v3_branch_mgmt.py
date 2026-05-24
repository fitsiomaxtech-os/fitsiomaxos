from fastapi import APIRouter, Depends, HTTPException
from typing import Optional, List, Dict, Any
from pydantic import BaseModel, Field
import uuid

from database import v3_col
from utils import now_iso
from deps import v3_require_roles
from schemas.v3 import V3UserOut


router = APIRouter(prefix="/api/v3/branch-mgmt")


class BranchAssignedCreate(BaseModel):
    branch_name: str
    address: str
    admin_user_id: str = Field(..., description="Existing user with role=branch_admin")
    admin_phone: Optional[str] = ""
    vertical: Optional[str] = "offline_physiotherapy"


class AssignAdmin(BaseModel):
    admin_user_id: str


@router.get("")
async def list_branches_full(_: V3UserOut = Depends(v3_require_roles("super_admin", "business_dev", "marketing_head"))):
    branches = await v3_col("branches").find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    # Enrich each branch with stats
    out = []
    for b in branches:
        bid = b["id"]
        leads_total = await v3_col("leads").count_documents({"branch_id": bid})
        leads_open = await v3_col("leads").count_documents({"branch_id": bid, "stage": {"$nin": ["Completed", "Lost"]}})
        leads_completed = await v3_col("leads").count_documents({"branch_id": bid, "stage": "Completed"})
        appointments = await v3_col("appointments").count_documents({"branch_id": bid})
        doctors = await v3_col("doctors").count_documents({"branch_id": bid})
        out.append({
            **b,
            "leads_total": leads_total,
            "leads_open": leads_open,
            "leads_completed": leads_completed,
            "appointments_count": appointments,
            "doctors_count": doctors,
        })
    return out


@router.post("/with-existing-admin")
async def create_branch_with_existing_admin(payload: BranchAssignedCreate, _: V3UserOut = Depends(v3_require_roles("super_admin"))):
    user = await v3_col("users").find_one({"id": payload.admin_user_id, "is_active": True}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="Branch admin user not found")
    if user.get("role") != "branch_admin":
        raise HTTPException(status_code=400, detail=f"User role is '{user.get('role')}', must be 'branch_admin'")
    # Soft check: warn if user already assigned to another branch
    already = await v3_col("branches").find_one({"admin_user_id": payload.admin_user_id}, {"_id": 0, "id": 1, "branch_name": 1})
    if already:
        raise HTTPException(status_code=409, detail=f"User already assigned to branch '{already.get('branch_name')}'")

    branch_id = str(uuid.uuid4())
    branch = {
        "id": branch_id,
        "branch_name": payload.branch_name,
        "address": payload.address,
        "admin_user_id": payload.admin_user_id,
        "admin_name": user.get("full_name", ""),
        "admin_email": user.get("email", ""),
        "admin_phone": payload.admin_phone or "",
        "vertical": payload.vertical or "offline_physiotherapy",
        "created_at": now_iso(),
    }
    await v3_col("branches").insert_one(branch.copy())
    # Update user.branch_id
    await v3_col("users").update_one({"id": payload.admin_user_id}, {"$set": {"branch_id": branch_id}})
    return branch


@router.patch("/{branch_id}/admin")
async def reassign_branch_admin(branch_id: str, payload: AssignAdmin, _: V3UserOut = Depends(v3_require_roles("super_admin"))):
    branch = await v3_col("branches").find_one({"id": branch_id}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")
    user = await v3_col("users").find_one({"id": payload.admin_user_id, "is_active": True}, {"_id": 0, "password": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("role") != "branch_admin":
        raise HTTPException(status_code=400, detail=f"User role must be branch_admin (current: {user.get('role')})")
    other = await v3_col("branches").find_one({"admin_user_id": payload.admin_user_id, "id": {"$ne": branch_id}}, {"_id": 0, "branch_name": 1})
    if other:
        raise HTTPException(status_code=409, detail=f"User already manages '{other.get('branch_name')}'")

    # Unlink previous admin (if any) from this branch
    prev_admin_id = branch.get("admin_user_id")
    if prev_admin_id and prev_admin_id != payload.admin_user_id:
        await v3_col("users").update_one({"id": prev_admin_id}, {"$set": {"branch_id": None}})

    await v3_col("branches").update_one(
        {"id": branch_id},
        {"$set": {
            "admin_user_id": payload.admin_user_id,
            "admin_name": user.get("full_name", ""),
            "admin_email": user.get("email", ""),
        }},
    )
    await v3_col("users").update_one({"id": payload.admin_user_id}, {"$set": {"branch_id": branch_id}})
    return await v3_col("branches").find_one({"id": branch_id}, {"_id": 0})


@router.get("/{branch_id}/performance")
async def branch_performance(branch_id: str, _: V3UserOut = Depends(v3_require_roles("super_admin", "business_dev", "marketing_head"))):
    branch = await v3_col("branches").find_one({"id": branch_id}, {"_id": 0})
    if not branch:
        raise HTTPException(status_code=404, detail="Branch not found")

    leads_total = await v3_col("leads").count_documents({"branch_id": branch_id})
    leads_pipeline = [
        {"$match": {"branch_id": branch_id}},
        {"$group": {"_id": "$stage", "n": {"$sum": 1}}},
    ]
    stage_breakdown: Dict[str, int] = {}
    async for row in v3_col("leads").aggregate(leads_pipeline):
        stage_breakdown[row["_id"] or "Unknown"] = row["n"]

    appointments_total = await v3_col("appointments").count_documents({"branch_id": branch_id})
    appointments_completed = await v3_col("appointments").count_documents({"branch_id": branch_id, "status": "completed"})
    completed = stage_breakdown.get("Completed", 0)
    conversion = (completed / leads_total * 100.0) if leads_total else 0.0

    # Revenue: consultation_fee + package_amount on this branch's leads
    revenue_pipeline = [
        {"$match": {"branch_id": branch_id}},
        {"$group": {"_id": None,
                    "consultation_fees": {"$sum": {"$ifNull": ["$consultation_fee", 0]}},
                    "package_revenue": {"$sum": {"$ifNull": ["$package_amount", 0]}}}},
    ]
    rev_rows = await v3_col("leads").aggregate(revenue_pipeline).to_list(1)
    revenue = rev_rows[0] if rev_rows else {"consultation_fees": 0, "package_revenue": 0}

    doctors = await v3_col("doctors").count_documents({"branch_id": branch_id})
    physios = await v3_col("users").count_documents({"branch_id": branch_id, "role": "physio", "is_active": True})
    head_physios = await v3_col("users").count_documents({"branch_id": branch_id, "role": "head_physio", "is_active": True})

    return {
        "branch": branch,
        "kpis": {
            "leads_total": leads_total,
            "leads_completed": completed,
            "conversion_rate": round(conversion, 1),
            "appointments_total": appointments_total,
            "appointments_completed": appointments_completed,
            "consultation_fees": revenue.get("consultation_fees", 0),
            "package_revenue": revenue.get("package_revenue", 0),
            "total_revenue": (revenue.get("consultation_fees", 0) or 0) + (revenue.get("package_revenue", 0) or 0),
            "doctors": doctors,
            "physios": physios,
            "head_physios": head_physios,
        },
        "stage_breakdown": [{"stage": k, "count": v} for k, v in stage_breakdown.items()],
    }


@router.get("/performance-summary")
async def performance_summary(_: V3UserOut = Depends(v3_require_roles("super_admin", "business_dev", "marketing_head"))):
    branches = await v3_col("branches").find({}, {"_id": 0}).to_list(500)
    summary: List[Dict[str, Any]] = []
    for b in branches:
        bid = b["id"]
        leads_total = await v3_col("leads").count_documents({"branch_id": bid})
        completed = await v3_col("leads").count_documents({"branch_id": bid, "stage": "Completed"})
        conversion = (completed / leads_total * 100.0) if leads_total else 0.0
        rev_rows = await v3_col("leads").aggregate([
            {"$match": {"branch_id": bid}},
            {"$group": {"_id": None,
                        "consultation_fees": {"$sum": {"$ifNull": ["$consultation_fee", 0]}},
                        "package_revenue": {"$sum": {"$ifNull": ["$package_amount", 0]}}}},
        ]).to_list(1)
        rev = rev_rows[0] if rev_rows else {"consultation_fees": 0, "package_revenue": 0}
        total_rev = (rev.get("consultation_fees", 0) or 0) + (rev.get("package_revenue", 0) or 0)
        summary.append({
            "branch_id": bid,
            "branch_name": b.get("branch_name"),
            "admin_name": b.get("admin_name"),
            "address": b.get("address"),
            "leads_total": leads_total,
            "leads_completed": completed,
            "conversion_rate": round(conversion, 1),
            "total_revenue": total_rev,
        })
    return summary
