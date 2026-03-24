from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Literal


class V3UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    email: str
    role: Literal["super_admin", "business_dev", "pre_sales", "branch_admin", "head_physio", "physio"]
    branch_id: Optional[str] = None
    created_at: str


class V3LoginRequest(BaseModel):
    email: str
    password: str


class V3LoginResponse(BaseModel):
    token: str
    user: V3UserOut


class V3VerticalCreate(BaseModel):
    name: str
    active: bool = True


class V3VerticalOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    active: bool
    created_at: str


class V3BranchCreate(BaseModel):
    branch_name: str
    address: str
    admin_name: str
    admin_email: str
    admin_password: str
    admin_phone: Optional[str] = ""
    vertical: str = "offline_physiotherapy"


class V3BranchOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    branch_name: str
    address: str
    admin_user_id: str
    admin_name: str
    admin_email: str
    admin_phone: Optional[str] = ""
    vertical: str
    created_at: str


class V3BranchUpdate(BaseModel):
    branch_name: Optional[str] = None
    address: Optional[str] = None
    admin_name: Optional[str] = None
    admin_email: Optional[str] = None
    admin_phone: Optional[str] = None
    vertical: Optional[str] = None


class V3DoctorCreate(BaseModel):
    full_name: str
    profile_type: Literal["head_physio", "physio"]
    branch_id: Optional[str] = None
    specialization: Optional[str] = ""


class V3DoctorSlotsInput(BaseModel):
    slots: List[str]


class V3DoctorOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    profile_type: str
    branch_id: str
    specialization: Optional[str] = ""
    slots: List[str]
    created_at: str


class V3LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    vertical: str = "offline_physiotherapy"
    source_tab: Optional[str] = None
    source_type: Literal["manual", "google_sheet"] = "manual"
    branch_id: Optional[str] = None
    notes: Optional[str] = ""
    extra_fields: Optional[Dict[str, str]] = None


class V3LeadUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    vertical: Optional[str] = None
    source_tab: Optional[str] = None
    notes: Optional[str] = None
    stage: Optional[str] = None
    branch_id: Optional[str] = None
    extra_fields: Optional[Dict[str, str]] = None


class V3LeadOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    phone: str
    email: Optional[str] = ""
    vertical: str
    source_tab: Optional[str] = None
    source_type: str
    stage: str
    branch_stage: Optional[str] = None
    branch_id: Optional[str] = None
    notes: Optional[str] = ""
    extra_fields: Dict[str, str]
    consultation_fee: Optional[float] = None
    package_amount: Optional[float] = None
    package_weeks: Optional[int] = None
    assigned_physio_id: Optional[str] = None
    assigned_physio_name: Optional[str] = None
    created_at: str
    updated_at: str


class V3AssignBranchInput(BaseModel):
    branch_id: str


class V3BookAppointmentInput(BaseModel):
    doctor_id: str
    slot_time: str


class V3AppointmentOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    lead_id: str
    lead_name: str
    branch_id: str
    doctor_id: str
    doctor_name: str
    slot_time: str
    status: str
    created_by_role: str
    created_at: str


class V3TeamMemberCreate(BaseModel):
    full_name: str
    email: str
    team_type: Literal["pre_sales", "sales"]


class V3TeamMemberOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    email: str
    team_type: str
    created_at: str


class V3SheetConnectionCreate(BaseModel):
    connection_name: str
    spreadsheet_id: str
    sync_interval_minutes: int = 30


class V3SheetMappingInput(BaseModel):
    field_map: Dict[str, str]
    create_new_fields: bool = True


class V3SheetTabRows(BaseModel):
    tab_name: str
    rows: List[Dict[str, str]]


class V3SheetSyncInput(BaseModel):
    tabs: List[V3SheetTabRows]


class V3RemarkCreate(BaseModel):
    text: str


class V3FollowUpCreate(BaseModel):
    note: str
    scheduled_date: str


class V3MoveStageInput(BaseModel):
    stage: str


class V3BranchStageInput(BaseModel):
    branch_stage: str


class V3CollectFeeInput(BaseModel):
    fee_type: Literal["consultation", "package"]
    amount: float
    package_weeks: Optional[int] = None


class V3AssignPhysioInput(BaseModel):
    physio_id: str
