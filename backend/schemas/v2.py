from pydantic import BaseModel, ConfigDict
from typing import List, Optional, Dict, Literal


class V2UserOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    email: str
    role: Literal["super_admin", "online_fitness", "online_physio", "offline_physio"]
    created_at: str


class V2LoginRequest(BaseModel):
    email: str
    password: str


class V2LoginResponse(BaseModel):
    token: str
    user: V2UserOut


class V2ServiceCreate(BaseModel):
    name: str
    mode: Literal["online", "offline"]
    category: Literal["fitness_program", "physio_therapy", "offline_fitness_gym"]


class V2ServiceOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    mode: str
    category: str
    created_at: str


class V2DoctorCreate(BaseModel):
    full_name: str
    specialty_role: Literal["online_fitness", "online_physio", "offline_physio"]
    location: Optional[str] = None


class V2DoctorSlotsInput(BaseModel):
    slots: List[str]


class V2DoctorOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    full_name: str
    specialty_role: str
    location: Optional[str] = None
    slots: List[str]
    created_at: str


class V2LeadCreate(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    lead_category: Literal["online_fitness", "online_physio", "offline_physio", "offline_fitness_gym"]
    source: Literal["manual", "google_sheet"] = "manual"
    preferred_location: Optional[str] = None
    service_interest: Optional[str] = ""
    notes: Optional[str] = ""


class V2LeadImportRow(BaseModel):
    name: str
    phone: str
    email: Optional[str] = ""
    lead_category: Literal["online_fitness", "online_physio", "offline_physio", "offline_fitness_gym"]
    preferred_location: Optional[str] = None
    service_interest: Optional[str] = ""
    notes: Optional[str] = ""


class V2LeadImportInput(BaseModel):
    rows: List[V2LeadImportRow]
    source: Literal["google_sheet", "manual_csv"] = "google_sheet"


class V2LeadOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    name: str
    phone: str
    email: Optional[str] = ""
    lead_category: str
    assigned_role: str
    source: str
    preferred_location: Optional[str] = None
    service_interest: Optional[str] = ""
    status: str
    notes: Optional[str] = ""
    created_at: str
    updated_at: str


class V2AppointmentCreate(BaseModel):
    lead_id: Optional[str] = None
    patient_name: Optional[str] = None
    doctor_id: str
    slot_time: str
    service_id: Optional[str] = None
    location: Optional[str] = None
    notes: Optional[str] = ""


class V2AppointmentOut(BaseModel):
    model_config = ConfigDict(extra="ignore")

    id: str
    lead_id: Optional[str] = None
    patient_name: str
    doctor_id: str
    doctor_name: str
    slot_time: str
    location: Optional[str] = None
    service_id: Optional[str] = None
    service_name: Optional[str] = None
    pipeline_role: str
    created_by_role: str
    status: str
    notes: Optional[str] = ""
    created_at: str


class V2DashboardSummary(BaseModel):
    metrics: Dict[str, int]
    lead_split: Dict[str, int]
