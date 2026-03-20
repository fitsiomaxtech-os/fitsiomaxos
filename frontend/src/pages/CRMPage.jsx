import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  ClipboardList,
  Clock3,
  LogOut,
  RefreshCw,
  Stethoscope,
  UserRound,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Toaster, toast } from "@/components/ui/sonner";
import {
  addDoctorSlots,
  apiLogout,
  createAppointment,
  createDoctor,
  createLead,
  createService,
  getAppointments,
  getDashboardSummary,
  getDoctorAvailability,
  getDoctors,
  getLeads,
  getLocations,
  getServices,
  getSheetsStatus,
  importLeads,
} from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_therapy-crm-board/artifacts/u4bafq34_Fitsiomax-logo.webp";

const leadCategoryOptions = [
  { value: "online_fitness", label: "Online Fitness" },
  { value: "online_physio", label: "Physio Therapy Online" },
  { value: "offline_physio", label: "Offline Physio Therapy" },
  { value: "offline_fitness_gym", label: "Offline Fitness GYM" },
];

const roleOptions = [
  { value: "online_fitness", label: "Online Fitness" },
  { value: "online_physio", label: "Online Physio" },
  { value: "offline_physio", label: "Offline Physio" },
];

const ROLE_LABEL = {
  super_admin: "Super Admin",
  online_fitness: "Online Fitness",
  online_physio: "Online Physio Therapy",
  offline_physio: "Offline Physio Therapy",
};

const defaultLead = {
  name: "",
  phone: "",
  email: "",
  lead_category: "online_fitness",
  preferred_location: "",
  service_interest: "",
  notes: "",
};

const defaultDoctor = {
  full_name: "",
  specialty_role: "online_fitness",
  location: "",
};

const defaultService = {
  name: "",
  mode: "online",
  category: "fitness_program",
};

const defaultAppointment = {
  lead_id: "",
  patient_name: "",
  doctor_id: "",
  slot_time: "",
  service_id: "",
  location: "",
  notes: "",
};

export const CRMPage = ({ auth, onLogout }) => {
  const isAdmin = auth.user.role === "super_admin";
  const [activeTab, setActiveTab] = useState("overview");

  const [summary, setSummary] = useState(null);
  const [locations, setLocations] = useState([]);
  const [services, setServices] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sheetsStatus, setSheetsStatus] = useState(null);

  const [leadForm, setLeadForm] = useState(defaultLead);
  const [doctorForm, setDoctorForm] = useState(defaultDoctor);
  const [serviceForm, setServiceForm] = useState(defaultService);
  const [appointmentForm, setAppointmentForm] = useState(defaultAppointment);

  const [leadSearch, setLeadSearch] = useState("");
  const [adminLeadRoleFilter, setAdminLeadRoleFilter] = useState("");

  const [slotDoctorId, setSlotDoctorId] = useState("");
  const [slotValue, setSlotValue] = useState("");
  const [availability, setAvailability] = useState(null);
  const [csvText, setCsvText] = useState("");
  const [loading, setLoading] = useState(false);

  const tabs = useMemo(() => {
    const base = [
      { key: "overview", label: "Overview", icon: ClipboardList },
      { key: "leads", label: "Leads", icon: Users },
      { key: "appointments", label: "Appointments", icon: CalendarDays },
      { key: "doctors", label: "Doctor Calendar", icon: Stethoscope },
    ];
    return isAdmin
      ? [...base, { key: "services", label: "Services", icon: UserRound }, { key: "import", label: "Import", icon: Clock3 }]
      : base;
  }, [isAdmin]);

  const visibleLeads = useMemo(() => leads, [leads]);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [summaryRes, locationsRes, servicesRes, doctorsRes, appointmentsRes, sheetsRes] = await Promise.all([
        getDashboardSummary(),
        getLocations(),
        getServices(),
        getDoctors(),
        getAppointments(),
        getSheetsStatus(),
      ]);
      setSummary(summaryRes);
      setLocations(locationsRes.locations || []);
      setServices(servicesRes);
      setDoctors(doctorsRes);
      setAppointments(appointmentsRes);
      setSheetsStatus(sheetsRes);
      await loadLeads();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const rows = await getLeads({
        assigned_role: isAdmin ? adminLeadRoleFilter || undefined : undefined,
        search: leadSearch || undefined,
      });
      setLeads(rows);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load leads");
    }
  };

  const refreshAvailability = async (doctorId) => {
    if (!doctorId) {
      setAvailability(null);
      return;
    }
    try {
      const data = await getDoctorAvailability(doctorId);
      setAvailability(data);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Could not load doctor calendar");
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [leadSearch, adminLeadRoleFilter]);

  useEffect(() => {
    refreshAvailability(appointmentForm.doctor_id);
  }, [appointmentForm.doctor_id]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // ignore
    }
    onLogout();
  };

  const submitLead = async (event) => {
    event.preventDefault();
    try {
      await createLead({ ...leadForm, source: "manual", preferred_location: leadForm.preferred_location || null });
      toast.success("Manual lead added");
      setLeadForm(defaultLead);
      await loadLeads();
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Lead creation failed");
    }
  };

  const submitService = async (event) => {
    event.preventDefault();
    try {
      await createService(serviceForm);
      toast.success("Service saved");
      setServiceForm(defaultService);
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Service creation failed");
    }
  };

  const submitDoctor = async (event) => {
    event.preventDefault();
    try {
      await createDoctor({ ...doctorForm, location: doctorForm.location || null });
      toast.success("Doctor added");
      setDoctorForm(defaultDoctor);
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Doctor creation failed");
    }
  };

  const submitSlot = async (event) => {
    event.preventDefault();
    try {
      await addDoctorSlots(slotDoctorId, { slots: [slotValue] });
      toast.success("Doctor slot added");
      setSlotValue("");
      await loadAll();
      await refreshAvailability(slotDoctorId);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Slot add failed");
    }
  };

  const submitAppointment = async (event) => {
    event.preventDefault();
    try {
      await createAppointment({
        ...appointmentForm,
        lead_id: appointmentForm.lead_id || null,
        patient_name: appointmentForm.patient_name || null,
        service_id: appointmentForm.service_id || null,
        location: appointmentForm.location || null,
      });
      toast.success("Appointment booked");
      setAppointmentForm(defaultAppointment);
      setAvailability(null);
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Appointment booking failed");
    }
  };

  const parseCsvAndImport = async () => {
    try {
      const normalizeCategory = (value) => {
        const clean = (value || "").trim().toLowerCase();
        if (["online fitness", "online_fitness"].includes(clean)) return "online_fitness";
        if (["physio therapy online", "online physio", "online_physio"].includes(clean)) return "online_physio";
        if (["offline physio therapy", "offline_physio"].includes(clean)) return "offline_physio";
        if (["offline fitness gym", "offline_fitness_gym"].includes(clean)) return "offline_fitness_gym";
        return "online_fitness";
      };

      const lines = csvText
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean);
      if (lines.length < 2) {
        toast.error("Add CSV header + at least one row");
        return;
      }
      const headers = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const obj = {};
        headers.forEach((h, index) => {
          obj[h.toLowerCase()] = values[index] || "";
        });
        return {
          name: obj.name || "",
          phone: obj.phone || "",
          email: obj.email || "",
          lead_category: normalizeCategory(obj.lead_category || obj.category),
          preferred_location: obj.preferred_location || "",
          service_interest: obj.service_interest || "",
          notes: obj.notes || "",
        };
      });

      await importLeads({ rows, source: "google_sheet" });
      toast.success("CSV imported to lead system");
      setCsvText("");
      setLeadSearch("");
      setAdminLeadRoleFilter("");
      setActiveTab("leads");
      const freshLeads = await getLeads({});
      setLeads(freshLeads);
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "CSV import failed. Check field values.");
    }
  };

  const chooseSlot = (slot) => {
    setAppointmentForm((prev) => ({ ...prev, slot_time: slot }));
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(145deg,#020617,#0a1b38)] px-4 py-6 text-slate-100 md:px-8 md:py-8" data-testid="fitsiomax-crm-page">
      <Toaster richColors position="top-right" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-sky-500/20 bg-slate-950/70 p-4 md:p-6" data-testid="crm-header">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3" data-testid="crm-brand-block">
              <div className="rounded-lg bg-white p-1" data-testid="crm-logo-wrap">
                <img src={LOGO_URL} alt="Fitsiomax" className="h-12 w-12 object-contain" data-testid="crm-logo-image" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-sky-300" data-testid="crm-brand-subtitle">
                  FITSIOMAX · Physio Care & Fitness Centre
                </p>
                <h1 className="font-heading text-4xl text-white" data-testid="crm-brand-title">
                  Appointment Book System · CRM View
                </h1>
                <p className="text-sm text-slate-300" data-testid="crm-user-role-display">
                  {auth.user.full_name} · {ROLE_LABEL[auth.user.role]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadAll} className="border-slate-700 bg-slate-900 text-slate-200" data-testid="crm-refresh-button">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={handleLogout} className="border-slate-700 bg-slate-900 text-slate-200" data-testid="crm-logout-button">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" data-testid="crm-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
                  active
                    ? "border-sky-400 bg-sky-500 text-slate-950"
                    : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
                }`}
                data-testid={`crm-tab-${tab.key}`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "overview" && (
          <div className="grid gap-4 md:grid-cols-4" data-testid="overview-tab">
            <MetricCard title="Total Leads" value={summary?.metrics?.total_leads || 0} testId="metric-total-leads" />
            <MetricCard title="New Leads" value={summary?.metrics?.new_leads || 0} testId="metric-new-leads" />
            <MetricCard title="Appointments" value={summary?.metrics?.appointments_booked || 0} testId="metric-appointments" />
            <MetricCard title="CSV Mode" value={sheetsStatus?.mode || "loading"} testId="metric-csv-mode" isText />

            <Card className="md:col-span-4 border-slate-800 bg-slate-950/70" data-testid="lead-split-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="lead-split-title">
                  Lead Flow Split
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-3">
                <SplitItem label="Online Fitness" value={summary?.lead_split?.online_fitness || 0} testId="split-online-fitness" />
                <SplitItem label="Online Physio" value={summary?.lead_split?.online_physio || 0} testId="split-online-physio" />
                <SplitItem label="Offline Physio" value={summary?.lead_split?.offline_physio || 0} testId="split-offline-physio" />
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "leads" && (
          <div className="space-y-4" data-testid="leads-tab">
            <Card className="border-slate-800 bg-slate-950/70" data-testid="lead-create-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="lead-create-title">
                  + New Lead (Manual)
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-3 md:grid-cols-3" onSubmit={submitLead} data-testid="lead-create-form">
                  <Input value={leadForm.name} onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))} placeholder="Lead name" className="border-slate-700 bg-slate-900" data-testid="lead-name-input" />
                  <Input value={leadForm.phone} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="border-slate-700 bg-slate-900" data-testid="lead-phone-input" />
                  <Input value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="border-slate-700 bg-slate-900" data-testid="lead-email-input" />

                  <select value={leadForm.lead_category} onChange={(e) => setLeadForm((p) => ({ ...p, lead_category: e.target.value }))} className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="lead-category-select">
                    {leadCategoryOptions.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>

                  <select value={leadForm.preferred_location} onChange={(e) => setLeadForm((p) => ({ ...p, preferred_location: e.target.value }))} className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="lead-location-select">
                    <option value="">Preferred location</option>
                    {locations.map((location) => <option key={location} value={location}>{location}</option>)}
                  </select>

                  <Input value={leadForm.service_interest} onChange={(e) => setLeadForm((p) => ({ ...p, service_interest: e.target.value }))} placeholder="Service interest" className="border-slate-700 bg-slate-900" data-testid="lead-service-input" />

                  <div className="md:col-span-3">
                    <Button type="submit" className="bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="lead-submit-button">Save Lead</Button>
                  </div>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70" data-testid="lead-list-card">
              <CardHeader>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Search leads" className="border-slate-700 bg-slate-900" data-testid="lead-search-input" />
                  {isAdmin ? (
                    <select value={adminLeadRoleFilter} onChange={(e) => setAdminLeadRoleFilter(e.target.value)} className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="lead-admin-role-filter">
                      <option value="">All role queues</option>
                      {roleOptions.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  ) : <div />}
                  <Button variant="outline" onClick={loadLeads} className="border-slate-700 bg-slate-900" data-testid="lead-refresh-button">Refresh</Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table data-testid="lead-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Lead</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Assigned Queue</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Source</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleLeads.map((lead) => (
                      <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                        <TableCell data-testid={`lead-name-${lead.id}`}>{lead.name} · {lead.phone}</TableCell>
                        <TableCell data-testid={`lead-category-${lead.id}`}>{lead.lead_category}</TableCell>
                        <TableCell data-testid={`lead-assigned-role-${lead.id}`}>{lead.assigned_role}</TableCell>
                        <TableCell data-testid={`lead-status-${lead.id}`}>{lead.status}</TableCell>
                        <TableCell data-testid={`lead-source-${lead.id}`}>{lead.source}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {visibleLeads.length === 0 && <p className="mt-3 text-sm text-slate-400" data-testid="lead-empty">No leads yet.</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "appointments" && (
          <div className="grid gap-4 lg:grid-cols-5" data-testid="appointments-tab">
            <Card className="border-slate-800 bg-slate-950/70 lg:col-span-2" data-testid="appointment-create-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="appointment-create-title">Manual Appointment Booking</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={submitAppointment} data-testid="appointment-form">
                  <select value={appointmentForm.lead_id} onChange={(e) => setAppointmentForm((p) => ({ ...p, lead_id: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="appointment-lead-select">
                    <option value="">Select existing lead (optional)</option>
                    {leads.map((lead) => <option key={lead.id} value={lead.id}>{lead.name} · {lead.phone}</option>)}
                  </select>

                  <Input value={appointmentForm.patient_name} onChange={(e) => setAppointmentForm((p) => ({ ...p, patient_name: e.target.value }))} placeholder="Patient name (if no lead selected)" className="border-slate-700 bg-slate-900" data-testid="appointment-patient-input" />

                  <select value={appointmentForm.doctor_id} onChange={(e) => setAppointmentForm((p) => ({ ...p, doctor_id: e.target.value, slot_time: "" }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="appointment-doctor-select">
                    <option value="">Choose doctor</option>
                    {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name} ({doctor.specialty_role})</option>)}
                  </select>

                  <select value={appointmentForm.service_id} onChange={(e) => setAppointmentForm((p) => ({ ...p, service_id: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="appointment-service-select">
                    <option value="">Choose service</option>
                    {services.map((service) => <option key={service.id} value={service.id}>{service.name}</option>)}
                  </select>

                  <select value={appointmentForm.location} onChange={(e) => setAppointmentForm((p) => ({ ...p, location: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="appointment-location-select">
                    <option value="">Location</option>
                    {locations.map((location) => <option key={location} value={location}>{location}</option>)}
                  </select>

                  <Input value={appointmentForm.slot_time} readOnly placeholder="Select slot from calendar" className="border-slate-700 bg-slate-900" data-testid="appointment-slot-input" />

                  <Button type="submit" className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="appointment-submit-button">
                    Confirm Appointment
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70 lg:col-span-3" data-testid="doctor-calendar-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="doctor-calendar-title">
                  Doctor Calendar (Select Slot)
                </CardTitle>
              </CardHeader>
              <CardContent>
                {availability ? (
                  <div className="space-y-3" data-testid="doctor-calendar-grid">
                    {Object.keys(availability.grouped_slots).length === 0 && (
                      <p className="text-sm text-slate-400" data-testid="doctor-calendar-empty">No slots added for this doctor yet.</p>
                    )}
                    {Object.entries(availability.grouped_slots).map(([date, slots]) => (
                      <div key={date} className="rounded-md border border-slate-800 bg-slate-900/70 p-3" data-testid={`calendar-date-${date}`}>
                        <p className="mb-2 text-sm font-semibold text-sky-300" data-testid={`calendar-date-title-${date}`}>{date}</p>
                        <div className="flex flex-wrap gap-2">
                          {slots.map((slotObj) => (
                            <button
                              key={slotObj.slot}
                              type="button"
                              onClick={() => !slotObj.booked && chooseSlot(slotObj.slot)}
                              disabled={slotObj.booked}
                              className={`rounded px-3 py-1 text-xs ${slotObj.booked ? "bg-slate-700 text-slate-400" : "bg-sky-900 text-sky-100 hover:bg-sky-800"}`}
                              data-testid={`slot-${slotObj.slot}`}
                            >
                              {slotObj.slot.split("T")[1] || slotObj.slot} {slotObj.booked ? "(Booked)" : ""}
                            </button>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400" data-testid="doctor-calendar-placeholder">Choose a doctor to view available slots.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70 lg:col-span-5" data-testid="appointment-list-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="appointment-list-title">Booked Appointments</CardTitle>
              </CardHeader>
              <CardContent>
                <Table data-testid="appointment-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Patient</TableHead>
                      <TableHead>Doctor</TableHead>
                      <TableHead>Slot</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Flow</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {appointments.map((appointment) => (
                      <TableRow key={appointment.id} data-testid={`appointment-row-${appointment.id}`}>
                        <TableCell data-testid={`appointment-patient-${appointment.id}`}>{appointment.patient_name}</TableCell>
                        <TableCell data-testid={`appointment-doctor-${appointment.id}`}>{appointment.doctor_name}</TableCell>
                        <TableCell data-testid={`appointment-slot-${appointment.id}`}>{appointment.slot_time}</TableCell>
                        <TableCell data-testid={`appointment-location-${appointment.id}`}>{appointment.location || "-"}</TableCell>
                        <TableCell data-testid={`appointment-role-${appointment.id}`}>{appointment.pipeline_role}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "doctors" && (
          <div className="grid gap-4 lg:grid-cols-3" data-testid="doctors-tab">
            {isAdmin && (
              <>
                <Card className="border-slate-800 bg-slate-950/70" data-testid="doctor-create-card">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-200" data-testid="doctor-create-title">+ Add Doctor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-3" onSubmit={submitDoctor} data-testid="doctor-form">
                      <Input value={doctorForm.full_name} onChange={(e) => setDoctorForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Doctor name" className="border-slate-700 bg-slate-900" data-testid="doctor-name-input" />
                      <select value={doctorForm.specialty_role} onChange={(e) => setDoctorForm((p) => ({ ...p, specialty_role: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="doctor-role-select">
                        {roleOptions.map((role) => <option key={role.value} value={role.value}>{role.label}</option>)}
                      </select>
                      <select value={doctorForm.location} onChange={(e) => setDoctorForm((p) => ({ ...p, location: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="doctor-location-select">
                        <option value="">Select location</option>
                        {locations.map((location) => <option key={location} value={location}>{location}</option>)}
                      </select>
                      <Button type="submit" className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="doctor-submit-button">Save Doctor</Button>
                    </form>
                  </CardContent>
                </Card>

                <Card className="border-slate-800 bg-slate-950/70" data-testid="slot-create-card">
                  <CardHeader>
                    <CardTitle className="text-base text-slate-200" data-testid="slot-create-title">+ Add Doctor Slot</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form className="space-y-3" onSubmit={submitSlot} data-testid="slot-form">
                      <select value={slotDoctorId} onChange={(e) => setSlotDoctorId(e.target.value)} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="slot-doctor-select">
                        <option value="">Select doctor</option>
                        {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
                      </select>
                      <Input type="datetime-local" value={slotValue} onChange={(e) => setSlotValue(e.target.value)} className="border-slate-700 bg-slate-900" data-testid="slot-datetime-input" />
                      <Button type="submit" className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="slot-submit-button">Add Slot</Button>
                    </form>
                  </CardContent>
                </Card>
              </>
            )}

            <Card className="border-slate-800 bg-slate-950/70 lg:col-span-1" data-testid="doctor-list-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="doctor-list-title">Doctors</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`doctor-row-${doctor.id}`}>
                    <p className="text-sm font-medium text-slate-100" data-testid={`doctor-name-${doctor.id}`}>{doctor.full_name}</p>
                    <p className="text-xs text-sky-300" data-testid={`doctor-specialty-${doctor.id}`}>{doctor.specialty_role}</p>
                    <p className="text-xs text-slate-400" data-testid={`doctor-location-${doctor.id}`}>{doctor.location || "No location"}</p>
                    <p className="text-xs text-slate-400" data-testid={`doctor-slot-count-${doctor.id}`}>Slots: {doctor.slots.length}</p>
                  </div>
                ))}
                {doctors.length === 0 && <p className="text-sm text-slate-400" data-testid="doctor-empty-state">No doctors yet.</p>}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "services" && isAdmin && (
          <div className="grid gap-4 md:grid-cols-2" data-testid="services-tab">
            <Card className="border-slate-800 bg-slate-950/70" data-testid="service-create-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="service-create-title">+ New Service</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={submitService} data-testid="service-form">
                  <Input value={serviceForm.name} onChange={(e) => setServiceForm((p) => ({ ...p, name: e.target.value }))} placeholder="Service name" className="border-slate-700 bg-slate-900" data-testid="service-name-input" />
                  <select value={serviceForm.mode} onChange={(e) => setServiceForm((p) => ({ ...p, mode: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="service-mode-select">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                  </select>
                  <select value={serviceForm.category} onChange={(e) => setServiceForm((p) => ({ ...p, category: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="service-category-select">
                    <option value="fitness_program">Fitness Program</option>
                    <option value="physio_therapy">Physio Therapy</option>
                    <option value="offline_fitness_gym">Offline Fitness GYM</option>
                  </select>
                  <Button type="submit" className="w-full bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="service-submit-button">Save Service</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70" data-testid="service-list-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="service-list-title">Services</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {services.map((service) => (
                  <div key={service.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`service-row-${service.id}`}>
                    <p className="text-sm font-medium text-slate-100" data-testid={`service-name-${service.id}`}>{service.name}</p>
                    <p className="text-xs text-sky-300" data-testid={`service-mode-${service.id}`}>{service.mode}</p>
                    <p className="text-xs text-slate-400" data-testid={`service-category-${service.id}`}>{service.category}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "import" && isAdmin && (
          <Card className="border-slate-800 bg-slate-950/70" data-testid="import-tab">
            <CardHeader>
              <CardTitle className="text-base text-slate-200" data-testid="import-title">Google Sheet CSV Import (Phase 1)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-slate-300" data-testid="import-help-text">
                Paste CSV with headers: name,phone,email,lead_category,preferred_location,service_interest,notes
              </p>
              <textarea value={csvText} onChange={(e) => setCsvText(e.target.value)} className="min-h-[180px] w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-sm" data-testid="import-csv-textarea" />
              <Button onClick={parseCsvAndImport} className="bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="import-submit-button">Import Leads</Button>
            </CardContent>
          </Card>
        )}
      </div>

      {loading && (
        <div className="fixed bottom-4 right-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-slate-100" data-testid="global-loading-indicator">
          Loading FITSIOMAX data...
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, testId, isText = false }) => (
  <Card className="border-slate-800 bg-slate-950/70" data-testid={testId}>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-400" data-testid={`${testId}-label`}>{title}</p>
      <p className={`mt-1 ${isText ? "text-base" : "text-3xl"} font-semibold text-sky-300`} data-testid={`${testId}-value`}>
        {value}
      </p>
    </CardContent>
  </Card>
);

const SplitItem = ({ label, value, testId }) => (
  <div className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={testId}>
    <p className="text-xs text-slate-400" data-testid={`${testId}-label`}>{label}</p>
    <p className="text-2xl font-semibold text-sky-300" data-testid={`${testId}-value`}>{value}</p>
  </div>
);
