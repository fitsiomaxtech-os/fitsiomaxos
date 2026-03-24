import { useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  Database,
  GitBranch,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Stethoscope,
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
  assignLeadBranch,
  bookLeadAppointment,
  completeAppointment,
  confirmLead,
  createBranch,
  createDoctor,
  createManualLead,
  createSheetConnection,
  createVertical,
  getAppointments,
  getAvailableDoctors,
  getBranchBoard,
  getBranches,
  getDoctors,
  getLeads,
  getMasterBoard,
  getSheetConnections,
  getVerticals,
  qualifyLead,
  saveSheetMapping,
  syncSheetConnection,
} from "@/lib/api";

const LOGO_URL =
  "https://customer-assets.emergentagent.com/job_therapy-crm-board/artifacts/u4bafq34_Fitsiomax-logo.webp";

const ROLE_LABEL = {
  super_admin: "Super Admin",
  business_dev: "Business Development",
  pre_sales: "Pre Sales",
  branch_admin: "Branch Admin",
  head_physio: "Head Physio",
  physio: "Physio",
};

const stageFlow = [
  "New Lead",
  "Pre-sales Qualified",
  "Assigned to Branch",
  "Branch Confirmed",
  "Appointment Booked",
  "Completed",
];

const defaultLead = {
  name: "",
  phone: "",
  email: "",
  vertical: "offline_physiotherapy",
  notes: "",
  source_tab: "",
};

const defaultBranch = {
  branch_name: "",
  address: "",
  admin_name: "",
  admin_email: "",
  admin_password: "",
  admin_phone: "",
  vertical: "offline_physiotherapy",
};

const defaultDoctor = {
  full_name: "",
  profile_type: "physio",
  branch_id: "",
  specialization: "",
};

const defaultVertical = {
  name: "",
  active: true,
};

const defaultSheetConnection = {
  connection_name: "",
  spreadsheet_id: "",
  sync_interval_minutes: 30,
};

const defaultMapping = {
  name: "name",
  phone: "phone",
  email: "email",
  vertical: "vertical",
};

const defaultSyncPayload = `{
  "tabs": [
    {
      "tab_name": "Instagram",
      "rows": [
        {
          "name": "Lead from Instagram",
          "phone": "9000012345",
          "email": "insta@example.com",
          "vertical": "offline_physiotherapy"
        }
      ]
    }
  ]
}`;

export const CRMPage = ({ auth, onLogout }) => {
  const [activeTab, setActiveTab] = useState("master_board");

  const [verticals, setVerticals] = useState([]);
  const [branches, setBranches] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [leads, setLeads] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sheetConnections, setSheetConnections] = useState([]);
  const [masterBoard, setMasterBoard] = useState({ stage_counts: {} });
  const [branchBoard, setBranchBoard] = useState({ stage_counts: {} });

  const [leadForm, setLeadForm] = useState(defaultLead);
  const [branchForm, setBranchForm] = useState(defaultBranch);
  const [doctorForm, setDoctorForm] = useState(defaultDoctor);
  const [verticalForm, setVerticalForm] = useState(defaultVertical);
  const [sheetConnectionForm, setSheetConnectionForm] = useState(defaultSheetConnection);

  const [slotDoctorId, setSlotDoctorId] = useState("");
  const [slotDateTime, setSlotDateTime] = useState("");

  const [leadSearch, setLeadSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [branchFilter, setBranchFilter] = useState("");

  const [assignBranchSelection, setAssignBranchSelection] = useState({});

  const [bookingLeadId, setBookingLeadId] = useState("");
  const [bookingSlotTime, setBookingSlotTime] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState("");

  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [mappingFields, setMappingFields] = useState(defaultMapping);
  const [sheetSyncPayload, setSheetSyncPayload] = useState(defaultSyncPayload);

  const [appointmentView, setAppointmentView] = useState("all");
  const [loading, setLoading] = useState(false);

  const userRole = auth.user.role;
  const isAdmin = userRole === "super_admin";

  const tabs = useMemo(() => {
    if (userRole === "super_admin") {
      return [
        { key: "master_board", label: "Master Board", icon: LayoutDashboard },
        { key: "leads", label: "Lead Master", icon: Users },
        { key: "pre_sales", label: "Pre Sales Board", icon: Users },
        { key: "branch_board", label: "Branch Board", icon: GitBranch },
        { key: "appointments", label: "Appointments", icon: CalendarDays },
        { key: "doctors", label: "Doctors", icon: Stethoscope },
        { key: "sheets", label: "Sheets Connector", icon: Database },
        { key: "branches", label: "Branches", icon: GitBranch },
        { key: "verticals", label: "Business Verticals", icon: LayoutDashboard },
      ];
    }
    if (userRole === "business_dev") {
      return [
        { key: "master_board", label: "Master Board", icon: LayoutDashboard },
        { key: "leads", label: "Lead Master", icon: Users },
        { key: "sheets", label: "Sheets Connector", icon: Database },
        { key: "branches", label: "Branches", icon: GitBranch },
      ];
    }
    if (userRole === "pre_sales") {
      return [
        { key: "pre_sales", label: "Pre Sales Board", icon: Users },
        { key: "leads", label: "Lead Master", icon: Users },
      ];
    }
    if (userRole === "branch_admin") {
      return [
        { key: "branch_board", label: "Branch Board", icon: GitBranch },
        { key: "appointments", label: "Appointments", icon: CalendarDays },
        { key: "doctors", label: "Doctors", icon: Stethoscope },
      ];
    }
    if (userRole === "head_physio") {
      return [
        { key: "appointments", label: "Appointments", icon: CalendarDays },
        { key: "doctors", label: "Doctors", icon: Stethoscope },
      ];
    }
    return [{ key: "appointments", label: "Appointments", icon: CalendarDays }];
  }, [userRole]);

  const safeCall = async (fn, fallback) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const loadAll = async () => {
    setLoading(true);
    const leadsParams = {
      stage: stageFilter || undefined,
      branch_id: branchFilter || undefined,
    };

    const canManageSheets = ["business_dev", "super_admin"].includes(userRole);

    const connectionsPromise = canManageSheets ? safeCall(() => getSheetConnections(), []) : Promise.resolve([]);

    const [verticalRows, branchRows, doctorRows, leadRows, appointmentRows, masterRows, connectionRows] = await Promise.all([
      safeCall(() => getVerticals(), []),
      safeCall(() => getBranches(), []),
      safeCall(() => getDoctors({}), []),
      safeCall(() => getLeads(leadsParams), []),
      safeCall(() => getAppointments(appointmentView === "all" ? {} : { view: appointmentView }), []),
      safeCall(() => getMasterBoard(), { stage_counts: {} }),
      connectionsPromise,
    ]);

    setVerticals(verticalRows);
    setBranches(branchRows);
    setDoctors(doctorRows);
    setLeads(leadRows);
    setAppointments(appointmentRows);
    setMasterBoard(masterRows);
    setSheetConnections(connectionRows);

    const branchIdForBoard = userRole === "branch_admin" ? auth.user.branch_id : (branchFilter || branchRows[0]?.id);
    if (branchIdForBoard) {
      const board = await safeCall(() => getBranchBoard(branchIdForBoard), { stage_counts: {} });
      setBranchBoard(board);
    }

    setLoading(false);
  };

  useEffect(() => {
    if (tabs.length) {
      setActiveTab(tabs[0].key);
    }
  }, [tabs]);

  useEffect(() => {
    loadAll();
  }, [stageFilter, branchFilter, appointmentView]);

  const logout = async () => {
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
      await createManualLead({ ...leadForm, source_type: "manual" });
      setLeadForm(defaultLead);
      toast.success("Manual lead created");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Lead creation failed");
    }
  };

  const doQualify = async (leadId) => {
    try {
      await qualifyLead(leadId);
      toast.success("Lead moved to Pre-sales Qualified");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Qualify failed");
    }
  };

  const doAssignBranch = async (leadId) => {
    const branchId = assignBranchSelection[leadId];
    if (!branchId) {
      toast.error("Select branch first");
      return;
    }
    try {
      await assignLeadBranch(leadId, { branch_id: branchId });
      toast.success("Lead assigned to branch");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Assign failed");
    }
  };

  const doConfirmLead = async (leadId) => {
    try {
      await confirmLead(leadId);
      toast.success("Lead confirmed by branch");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Confirm failed");
    }
  };

  const checkAvailability = async () => {
    const lead = leads.find((item) => item.id === bookingLeadId);
    const branchId = lead?.branch_id || auth.user.branch_id;
    if (!branchId || !bookingSlotTime) {
      toast.error("Select lead and slot time");
      return;
    }
    try {
      const result = await getAvailableDoctors({ branch_id: branchId, slot_time: bookingSlotTime });
      setAvailableDoctors(result.available_doctors || []);
      if ((result.available_doctors || []).length === 0) {
        toast.error("No doctors available for this slot");
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Availability check failed");
    }
  };

  const doBookAppointment = async () => {
    if (!bookingLeadId || !selectedDoctorForBooking || !bookingSlotTime) {
      toast.error("Select lead, slot, and available doctor");
      return;
    }
    try {
      await bookLeadAppointment(bookingLeadId, { doctor_id: selectedDoctorForBooking, slot_time: bookingSlotTime });
      toast.success("Appointment booked");
      setBookingLeadId("");
      setBookingSlotTime("");
      setSelectedDoctorForBooking("");
      setAvailableDoctors([]);
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Booking failed");
    }
  };

  const submitBranch = async (event) => {
    event.preventDefault();
    try {
      await createBranch(branchForm);
      setBranchForm(defaultBranch);
      toast.success("Branch and Branch Admin created");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Branch creation failed");
    }
  };

  const submitDoctor = async (event) => {
    event.preventDefault();
    try {
      await createDoctor({ ...doctorForm, branch_id: doctorForm.branch_id || null });
      setDoctorForm(defaultDoctor);
      toast.success("Doctor profile created");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Doctor creation failed");
    }
  };

  const submitSlot = async (event) => {
    event.preventDefault();
    try {
      await addDoctorSlots(slotDoctorId, { slots: [slotDateTime] });
      setSlotDateTime("");
      toast.success("Doctor slot added");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Slot add failed");
    }
  };

  const submitVertical = async (event) => {
    event.preventDefault();
    try {
      await createVertical(verticalForm);
      setVerticalForm(defaultVertical);
      toast.success("Business vertical added");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Vertical creation failed");
    }
  };

  const submitSheetConnection = async (event) => {
    event.preventDefault();
    try {
      await createSheetConnection(sheetConnectionForm);
      setSheetConnectionForm(defaultSheetConnection);
      toast.success("Sheet connection added");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Connection failed");
    }
  };

  const submitMapping = async () => {
    if (!selectedConnectionId) {
      toast.error("Select sheet connection");
      return;
    }
    try {
      await saveSheetMapping(selectedConnectionId, { field_map: mappingFields, create_new_fields: true });
      toast.success("Field mapping saved");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Mapping save failed");
    }
  };

  const runSheetSync = async () => {
    if (!selectedConnectionId) {
      toast.error("Select sheet connection");
      return;
    }
    try {
      const parsed = JSON.parse(sheetSyncPayload);
      await syncSheetConnection(selectedConnectionId, parsed);
      toast.success("Sheet sync complete (tab->source applied)");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Sync failed: verify JSON and mapping");
    }
  };

  const completeAppt = async (appointmentId) => {
    try {
      await completeAppointment(appointmentId);
      toast.success("Appointment marked completed");
      await loadAll();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Complete action failed");
    }
  };

  return (
    <div className="min-h-screen bg-[linear-gradient(140deg,#020617,#0a1f44)] px-4 py-6 text-slate-100 md:px-8 md:py-8" data-testid="fitsiomax-os-page">
      <Toaster richColors position="top-right" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-2xl border border-sky-500/20 bg-slate-950/70 p-4 md:p-6" data-testid="os-header">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3" data-testid="os-brand-row">
              <div className="rounded-lg bg-white p-1" data-testid="os-logo-wrap">
                <img src={LOGO_URL} alt="Fitsiomax" className="h-12 w-12 object-contain" data-testid="os-logo-image" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-sky-300" data-testid="os-brand-subtitle">
                  FITSIOMAX OS · Blue/Black Operations Layer
                </p>
                <h1 className="font-heading text-4xl text-white" data-testid="os-brand-title">
                  CRM View
                </h1>
                <p className="text-sm text-slate-300" data-testid="os-user-role-label">
                  {auth.user.full_name} · {ROLE_LABEL[auth.user.role]}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={loadAll} className="border-slate-700 bg-slate-900" data-testid="os-refresh-button">
                <RefreshCw className="h-4 w-4" />
              </Button>
              <Button variant="outline" onClick={logout} className="border-slate-700 bg-slate-900" data-testid="os-logout-button">
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </header>

        <nav className="flex flex-wrap gap-2" data-testid="os-main-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm transition-colors ${
                  active ? "border-sky-400 bg-sky-500 text-slate-950" : "border-slate-700 bg-slate-900 text-slate-200"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "master_board" && (
          <Card className="border-slate-800 bg-slate-950/70" data-testid="master-board-card">
            <CardHeader>
              <CardTitle className="text-base text-slate-200" data-testid="master-board-title">Lead Master Board</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {stageFlow.map((stage) => (
                <div key={stage} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`master-stage-${stage}`}>
                  <p className="text-xs text-slate-400" data-testid={`master-stage-label-${stage}`}>{stage}</p>
                  <p className="text-2xl font-semibold text-sky-300" data-testid={`master-stage-value-${stage}`}>
                    {masterBoard.stage_counts?.[stage] || 0}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeTab === "leads" && (
          <div className="space-y-4" data-testid="leads-tab">
            {(isAdmin || ["business_dev", "pre_sales", "branch_admin"].includes(userRole)) && (
              <Card className="border-slate-800 bg-slate-950/70" data-testid="manual-lead-card">
                <CardHeader>
                  <CardTitle className="text-base text-slate-200" data-testid="manual-lead-title">Manual Lead Creation</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-3 md:grid-cols-3" onSubmit={submitLead} data-testid="manual-lead-form">
                    <Input value={leadForm.name} onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))} placeholder="Lead name" className="border-slate-700 bg-slate-900" data-testid="manual-lead-name-input" />
                    <Input value={leadForm.phone} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" className="border-slate-700 bg-slate-900" data-testid="manual-lead-phone-input" />
                    <Input value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" className="border-slate-700 bg-slate-900" data-testid="manual-lead-email-input" />

                    <select value={leadForm.vertical} onChange={(e) => setLeadForm((p) => ({ ...p, vertical: e.target.value }))} className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="manual-lead-vertical-select">
                      {verticals.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
                    </select>
                    <Input value={leadForm.source_tab} onChange={(e) => setLeadForm((p) => ({ ...p, source_tab: e.target.value }))} placeholder="Source tab (optional)" className="border-slate-700 bg-slate-900" data-testid="manual-lead-source-tab-input" />
                    <Input value={leadForm.notes} onChange={(e) => setLeadForm((p) => ({ ...p, notes: e.target.value }))} placeholder="Notes" className="border-slate-700 bg-slate-900" data-testid="manual-lead-notes-input" />

                    <div className="md:col-span-3">
                      <Button type="submit" className="bg-sky-500 text-slate-950 hover:bg-sky-400" data-testid="manual-lead-submit-button">Create Lead</Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-800 bg-slate-950/70" data-testid="lead-list-card">
              <CardHeader>
                <div className="grid gap-3 md:grid-cols-3">
                  <Input value={leadSearch} onChange={(e) => setLeadSearch(e.target.value)} placeholder="Local search (UI)" className="border-slate-700 bg-slate-900" data-testid="lead-search-input" />
                  <select value={stageFilter} onChange={(e) => setStageFilter(e.target.value)} className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="lead-stage-filter-select">
                    <option value="">All stages</option>
                    {stageFlow.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                  </select>
                  <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)} className="h-9 rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="lead-branch-filter-select">
                    <option value="">All branches</option>
                    {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                  </select>
                </div>
              </CardHeader>
              <CardContent>
                <Table data-testid="lead-table">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Vertical</TableHead>
                      <TableHead>Stage</TableHead>
                      <TableHead>Branch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads
                      .filter((lead) => {
                        if (!leadSearch) return true;
                        const txt = `${lead.name} ${lead.phone} ${lead.source_tab || ""}`.toLowerCase();
                        return txt.includes(leadSearch.toLowerCase());
                      })
                      .map((lead) => (
                        <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                          <TableCell data-testid={`lead-name-${lead.id}`}>{lead.name} · {lead.phone}</TableCell>
                          <TableCell data-testid={`lead-source-${lead.id}`}>{lead.source_tab || lead.source_type}</TableCell>
                          <TableCell data-testid={`lead-vertical-${lead.id}`}>{lead.vertical}</TableCell>
                          <TableCell data-testid={`lead-stage-${lead.id}`}>{lead.stage}</TableCell>
                          <TableCell data-testid={`lead-branch-${lead.id}`}>{branches.find((b) => b.id === lead.branch_id)?.branch_name || "Unassigned"}</TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "pre_sales" && (
          <Card className="border-slate-800 bg-slate-950/70" data-testid="pre-sales-board-card">
            <CardHeader>
              <CardTitle className="text-base text-slate-200" data-testid="pre-sales-board-title">
                Pre Sales Qualification & Branch Assignment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {leads.filter((lead) => ["New Lead", "Pre-sales Qualified"].includes(lead.stage)).map((lead) => (
                <div key={lead.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`pre-sales-row-${lead.id}`}>
                  <p className="text-sm text-slate-100" data-testid={`pre-sales-name-${lead.id}`}>{lead.name} · {lead.phone}</p>
                  <p className="text-xs text-slate-400" data-testid={`pre-sales-stage-${lead.id}`}>{lead.stage}</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="sm" onClick={() => doQualify(lead.id)} className="bg-sky-500 text-slate-950" data-testid={`pre-sales-qualify-${lead.id}`}>Qualify</Button>
                    <select value={assignBranchSelection[lead.id] || ""} onChange={(e) => setAssignBranchSelection((p) => ({ ...p, [lead.id]: e.target.value }))} className="h-8 rounded-md border border-slate-700 bg-slate-900 px-2 text-xs" data-testid={`pre-sales-branch-select-${lead.id}`}>
                      <option value="">Select branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                    </select>
                    <Button size="sm" onClick={() => doAssignBranch(lead.id)} variant="outline" className="border-slate-700" data-testid={`pre-sales-assign-${lead.id}`}>Assign Branch</Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {activeTab === "branch_board" && (
          <div className="space-y-4" data-testid="branch-board-tab">
            <Card className="border-slate-800 bg-slate-950/70" data-testid="branch-board-summary-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="branch-board-summary-title">Branch Board Stage Summary</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                {stageFlow.map((stage) => (
                  <div key={stage} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`branch-stage-${stage}`}>
                    <p className="text-xs text-slate-400">{stage}</p>
                    <p className="text-2xl font-semibold text-sky-300">{branchBoard.stage_counts?.[stage] || 0}</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70" data-testid="branch-confirm-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200" data-testid="branch-confirm-title">Branch Confirm & Book</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {leads.filter((lead) => ["Assigned to Branch", "Branch Confirmed"].includes(lead.stage)).map((lead) => (
                  <div key={lead.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`branch-lead-${lead.id}`}>
                    <p className="text-sm text-slate-100">{lead.name} · {lead.phone}</p>
                    <p className="text-xs text-slate-400">{lead.stage}</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => doConfirmLead(lead.id)} className="bg-sky-500 text-slate-950" data-testid={`branch-confirm-${lead.id}`}>Confirm</Button>
                      <Button size="sm" variant="outline" className="border-slate-700" onClick={() => setBookingLeadId(lead.id)} data-testid={`branch-select-for-book-${lead.id}`}>Select for Booking</Button>
                    </div>
                  </div>
                ))}

                <div className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid="branch-booking-panel">
                  <p className="mb-2 text-sm text-slate-200" data-testid="branch-booking-title">Book Appointment for Selected Lead</p>
                  <div className="grid gap-2 md:grid-cols-4">
                    <Input value={bookingLeadId} onChange={(e) => setBookingLeadId(e.target.value)} placeholder="Lead ID" className="border-slate-700 bg-slate-950" data-testid="branch-booking-lead-id-input" />
                    <Input type="datetime-local" value={bookingSlotTime} onChange={(e) => setBookingSlotTime(e.target.value)} className="border-slate-700 bg-slate-950" data-testid="branch-booking-slot-input" />
                    <Button variant="outline" className="border-slate-700" onClick={checkAvailability} data-testid="branch-check-availability-button">Check Available Doctors</Button>
                    <select value={selectedDoctorForBooking} onChange={(e) => setSelectedDoctorForBooking(e.target.value)} className="h-9 rounded-md border border-slate-700 bg-slate-950 px-3 text-sm" data-testid="branch-available-doctor-select">
                      <option value="">Choose available doctor</option>
                      {availableDoctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.id}>
                          {`${String(doctor.full_name)} (${String(doctor.profile_type || "physio")})`}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Button className="mt-2 bg-sky-500 text-slate-950" onClick={doBookAppointment} data-testid="branch-book-appointment-button">Book Appointment</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "doctors" && (
          <div className="grid gap-4 md:grid-cols-2" data-testid="doctors-tab">
            {(isAdmin || ["branch_admin", "head_physio"].includes(userRole)) && (
              <Card className="border-slate-800 bg-slate-950/70" data-testid="doctor-create-card">
                <CardHeader>
                  <CardTitle className="text-base text-slate-200">Head Physio / Physio Profile</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="space-y-3" onSubmit={submitDoctor} data-testid="doctor-create-form">
                    <Input value={doctorForm.full_name} onChange={(e) => setDoctorForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Full name" className="border-slate-700 bg-slate-900" data-testid="doctor-full-name-input" />
                    <select value={doctorForm.profile_type} onChange={(e) => setDoctorForm((p) => ({ ...p, profile_type: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="doctor-profile-type-select">
                      <option value="head_physio">Head Physio</option>
                      <option value="physio">Physio</option>
                    </select>
                    <select value={doctorForm.branch_id} onChange={(e) => setDoctorForm((p) => ({ ...p, branch_id: e.target.value }))} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="doctor-branch-select">
                      <option value="">Choose branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                    </select>
                    <Input value={doctorForm.specialization} onChange={(e) => setDoctorForm((p) => ({ ...p, specialization: e.target.value }))} placeholder="Specialization" className="border-slate-700 bg-slate-900" data-testid="doctor-specialization-input" />
                    <Button type="submit" className="bg-sky-500 text-slate-950" data-testid="doctor-create-submit-button">Create Profile</Button>
                  </form>

                  <form className="mt-4 space-y-2" onSubmit={submitSlot} data-testid="doctor-slot-form">
                    <select value={slotDoctorId} onChange={(e) => setSlotDoctorId(e.target.value)} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="doctor-slot-doctor-select">
                      <option value="">Select doctor for slot</option>
                      {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
                    </select>
                    <Input type="datetime-local" value={slotDateTime} onChange={(e) => setSlotDateTime(e.target.value)} className="border-slate-700 bg-slate-900" data-testid="doctor-slot-datetime-input" />
                    <Button type="submit" variant="outline" className="border-slate-700" data-testid="doctor-slot-submit-button">Add Slot</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-800 bg-slate-950/70" data-testid="doctor-list-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Doctor Profiles</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {doctors.map((doctor) => (
                  <div key={doctor.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`doctor-row-${doctor.id}`}>
                    <p className="text-sm text-slate-100" data-testid={`doctor-name-${doctor.id}`}>{doctor.full_name}</p>
                    <p className="text-xs text-sky-300" data-testid={`doctor-type-${doctor.id}`}>{doctor.profile_type}</p>
                    <p className="text-xs text-slate-400" data-testid={`doctor-branch-${doctor.id}`}>{branches.find((b) => b.id === doctor.branch_id)?.branch_name || doctor.branch_id}</p>
                    <p className="text-xs text-slate-400" data-testid={`doctor-slot-count-${doctor.id}`}>Slots: {doctor.slots.length}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "appointments" && (
          <Card className="border-slate-800 bg-slate-950/70" data-testid="appointments-tab">
            <CardHeader>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base text-slate-200">Appointments</CardTitle>
                <Button size="sm" variant={appointmentView === "all" ? "default" : "outline"} onClick={() => setAppointmentView("all")} data-testid="appointments-filter-all">All</Button>
                <Button size="sm" variant={appointmentView === "today" ? "default" : "outline"} onClick={() => setAppointmentView("today")} data-testid="appointments-filter-today">Today</Button>
                <Button size="sm" variant={appointmentView === "new" ? "default" : "outline"} onClick={() => setAppointmentView("new")} data-testid="appointments-filter-new">New</Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table data-testid="appointments-table">
                <TableHeader>
                  <TableRow>
                    <TableHead>Lead</TableHead>
                    <TableHead>Doctor</TableHead>
                    <TableHead>Slot</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {appointments.map((appointment) => (
                    <TableRow key={appointment.id} data-testid={`appointment-row-${appointment.id}`}>
                      <TableCell data-testid={`appointment-lead-${appointment.id}`}>{appointment.lead_name}</TableCell>
                      <TableCell data-testid={`appointment-doctor-${appointment.id}`}>{appointment.doctor_name}</TableCell>
                      <TableCell data-testid={`appointment-slot-${appointment.id}`}>{appointment.slot_time}</TableCell>
                      <TableCell data-testid={`appointment-status-${appointment.id}`}>{appointment.status}</TableCell>
                      <TableCell>
                        {(isAdmin || ["head_physio", "physio"].includes(userRole)) && appointment.status !== "completed" ? (
                          <Button size="sm" onClick={() => completeAppt(appointment.id)} data-testid={`appointment-complete-${appointment.id}`}>Complete</Button>
                        ) : (
                          <span className="text-xs text-slate-400">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {activeTab === "sheets" && (
          <div className="grid gap-4 md:grid-cols-2" data-testid="sheets-tab">
            <Card className="border-slate-800 bg-slate-950/70" data-testid="sheet-connection-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Business Development Sheets Connector</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-slate-400" data-testid="sheet-callback-info">
                  Callback URL: https://therapy-crm-board.preview.emergentagent.com/api/oauth/sheets/callback
                </p>
                <form className="space-y-2" onSubmit={submitSheetConnection} data-testid="sheet-connection-form">
                  <Input value={sheetConnectionForm.connection_name} onChange={(e) => setSheetConnectionForm((p) => ({ ...p, connection_name: e.target.value }))} placeholder="Connection name" className="border-slate-700 bg-slate-900" data-testid="sheet-connection-name-input" />
                  <Input value={sheetConnectionForm.spreadsheet_id} onChange={(e) => setSheetConnectionForm((p) => ({ ...p, spreadsheet_id: e.target.value }))} placeholder="Spreadsheet ID" className="border-slate-700 bg-slate-900" data-testid="sheet-spreadsheet-id-input" />
                  <Input type="number" value={sheetConnectionForm.sync_interval_minutes} onChange={(e) => setSheetConnectionForm((p) => ({ ...p, sync_interval_minutes: Number(e.target.value) }))} className="border-slate-700 bg-slate-900" data-testid="sheet-sync-interval-input" />
                  <Button type="submit" className="bg-sky-500 text-slate-950" data-testid="sheet-create-connection-button">Add Sheet Connection</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70" data-testid="sheet-mapping-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Field Mapping & Sync</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <select value={selectedConnectionId} onChange={(e) => setSelectedConnectionId(e.target.value)} className="h-9 w-full rounded-md border border-slate-700 bg-slate-900 px-3 text-sm" data-testid="sheet-connection-select">
                  <option value="">Select connection</option>
                  {sheetConnections.map((conn) => <option key={conn.id} value={conn.id}>{conn.connection_name}</option>)}
                </select>

                <Input value={mappingFields.name} onChange={(e) => setMappingFields((p) => ({ ...p, name: e.target.value }))} placeholder="Sheet column for Name" className="border-slate-700 bg-slate-900" data-testid="mapping-name-input" />
                <Input value={mappingFields.phone} onChange={(e) => setMappingFields((p) => ({ ...p, phone: e.target.value }))} placeholder="Sheet column for Phone" className="border-slate-700 bg-slate-900" data-testid="mapping-phone-input" />
                <Input value={mappingFields.email} onChange={(e) => setMappingFields((p) => ({ ...p, email: e.target.value }))} placeholder="Sheet column for Email" className="border-slate-700 bg-slate-900" data-testid="mapping-email-input" />
                <Input value={mappingFields.vertical} onChange={(e) => setMappingFields((p) => ({ ...p, vertical: e.target.value }))} placeholder="Sheet column for Vertical" className="border-slate-700 bg-slate-900" data-testid="mapping-vertical-input" />
                <Button onClick={submitMapping} variant="outline" className="border-slate-700" data-testid="sheet-save-mapping-button">Save Mapping</Button>

                <textarea value={sheetSyncPayload} onChange={(e) => setSheetSyncPayload(e.target.value)} className="min-h-[160px] w-full rounded-md border border-slate-700 bg-slate-900 p-3 text-xs" data-testid="sheet-sync-json-textarea" />
                <Button onClick={runSheetSync} className="bg-sky-500 text-slate-950" data-testid="sheet-sync-run-button">Sync Tabs to Leads</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "branches" && (
          <div className="grid gap-4 md:grid-cols-2" data-testid="branches-tab">
            <Card className="border-slate-800 bg-slate-950/70" data-testid="branch-create-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Offline Physio Branch Creation</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-2" onSubmit={submitBranch} data-testid="branch-create-form">
                  <Input value={branchForm.branch_name} onChange={(e) => setBranchForm((p) => ({ ...p, branch_name: e.target.value }))} placeholder="Branch name" className="border-slate-700 bg-slate-900" data-testid="branch-name-input" />
                  <Input value={branchForm.address} onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" className="border-slate-700 bg-slate-900" data-testid="branch-address-input" />
                  <Input value={branchForm.admin_name} onChange={(e) => setBranchForm((p) => ({ ...p, admin_name: e.target.value }))} placeholder="Admin name" className="border-slate-700 bg-slate-900" data-testid="branch-admin-name-input" />
                  <Input value={branchForm.admin_email} onChange={(e) => setBranchForm((p) => ({ ...p, admin_email: e.target.value }))} placeholder="Admin email" className="border-slate-700 bg-slate-900" data-testid="branch-admin-email-input" />
                  <Input value={branchForm.admin_password} onChange={(e) => setBranchForm((p) => ({ ...p, admin_password: e.target.value }))} placeholder="Admin password" className="border-slate-700 bg-slate-900" data-testid="branch-admin-password-input" />
                  <Input value={branchForm.admin_phone} onChange={(e) => setBranchForm((p) => ({ ...p, admin_phone: e.target.value }))} placeholder="Admin phone" className="border-slate-700 bg-slate-900" data-testid="branch-admin-phone-input" />
                  <Button type="submit" className="bg-sky-500 text-slate-950" data-testid="branch-create-submit-button">Create Branch + Admin</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70" data-testid="branch-list-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Branches</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {branches.map((branch) => (
                  <div key={branch.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`branch-row-${branch.id}`}>
                    <p className="text-sm text-slate-100" data-testid={`branch-name-${branch.id}`}>{branch.branch_name}</p>
                    <p className="text-xs text-slate-400" data-testid={`branch-address-${branch.id}`}>{branch.address}</p>
                    <p className="text-xs text-slate-400" data-testid={`branch-admin-${branch.id}`}>{branch.admin_name} · {branch.admin_email}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "verticals" && (
          <div className="grid gap-4 md:grid-cols-2" data-testid="verticals-tab">
            <Card className="border-slate-800 bg-slate-950/70" data-testid="vertical-create-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Create Business Vertical</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-2" onSubmit={submitVertical} data-testid="vertical-create-form">
                  <Input value={verticalForm.name} onChange={(e) => setVerticalForm((p) => ({ ...p, name: e.target.value }))} placeholder="vertical_name" className="border-slate-700 bg-slate-900" data-testid="vertical-name-input" />
                  <Button type="submit" className="bg-sky-500 text-slate-950" data-testid="vertical-submit-button">Add Vertical</Button>
                </form>
              </CardContent>
            </Card>

            <Card className="border-slate-800 bg-slate-950/70" data-testid="vertical-list-card">
              <CardHeader>
                <CardTitle className="text-base text-slate-200">Vertical List</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {verticals.map((vertical) => (
                  <div key={vertical.id} className="rounded-md border border-slate-800 bg-slate-900 p-3" data-testid={`vertical-row-${vertical.id}`}>
                    <p className="text-sm text-slate-100" data-testid={`vertical-name-${vertical.id}`}>{vertical.name}</p>
                    <p className="text-xs text-slate-400" data-testid={`vertical-active-${vertical.id}`}>{vertical.active ? "Active" : "Inactive"}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {loading && (
        <div className="fixed bottom-4 right-4 rounded-md bg-slate-900 px-4 py-2 text-sm text-slate-100" data-testid="global-loading-indicator">
          Loading FITSIOMAX OS...
        </div>
      )}
    </div>
  );
};
