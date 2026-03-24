import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Briefcase,
  Building2,
  CalendarDays,
  Database,
  GitBranch,
  Headphones,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Stethoscope,
  Users,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { toast, Toaster } from "@/components/ui/sonner";

const ROLE_META = {
  super_admin: { label: "Super Admin", icon: ShieldCheck },
  business_dev: { label: "Business Development", icon: Briefcase },
  pre_sales: { label: "Pre-sales", icon: Headphones },
  branch_admin: { label: "Branch Admin", icon: Building2 },
  head_physio: { label: "Head Physio", icon: Stethoscope },
  physio: { label: "Physio", icon: Activity },
};

const PIPELINE_STAGES = [
  "New Lead",
  "Pre-sales Qualified",
  "Assigned to Branch",
  "Branch Confirmed",
  "Appointment Booked",
  "Completed",
];

const verticalDefaults = [
  "offline_physiotherapy",
  "online_physiotherapy",
  "online_fitness",
  "offline_fitness_gym",
];

const defaultLead = {
  name: "",
  phone: "",
  email: "",
  vertical: "offline_physiotherapy",
  source_tab: "Manual",
  notes: "",
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
          "name": "Priya",
          "phone": "9000010001",
          "email": "priya@example.com",
          "vertical": "offline_physiotherapy",
          "campaign": "meta_1"
        }
      ]
    }
  ]
}`;

export const CRMPage = ({ auth, onLogout }) => {
  const [masterBoard, setMasterBoard] = useState({ stage_counts: {} });
  const [branchBoard, setBranchBoard] = useState({ stage_counts: {} });
  const [verticals, setVerticals] = useState([]);
  const [branches, setBranches] = useState([]);
  const [leads, setLeads] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [sheetConnections, setSheetConnections] = useState([]);

  const [leadForm, setLeadForm] = useState(defaultLead);
  const [branchForm, setBranchForm] = useState(defaultBranch);
  const [doctorForm, setDoctorForm] = useState(defaultDoctor);
  const [verticalName, setVerticalName] = useState("");
  const [slotDoctorId, setSlotDoctorId] = useState("");
  const [slotTime, setSlotTime] = useState("");

  const [assignBranchSelection, setAssignBranchSelection] = useState({});
  const [selectedLeadForBooking, setSelectedLeadForBooking] = useState("");
  const [bookingTime, setBookingTime] = useState("");
  const [availableDoctors, setAvailableDoctors] = useState([]);
  const [selectedDoctorForBooking, setSelectedDoctorForBooking] = useState("");

  const [sheetConnectionForm, setSheetConnectionForm] = useState(defaultSheetConnection);
  const [selectedConnectionId, setSelectedConnectionId] = useState("");
  const [mappingFields, setMappingFields] = useState(defaultMapping);
  const [syncPayload, setSyncPayload] = useState(defaultSyncPayload);

  const [leadStageFilter, setLeadStageFilter] = useState("");
  const [leadBranchFilter, setLeadBranchFilter] = useState("");
  const [appointmentFilter, setAppointmentFilter] = useState("all");
  const [loading, setLoading] = useState(false);

  const role = auth.user.role;
  const roleLabel = ROLE_META[role]?.label || role;

  const roleCards = useMemo(
    () =>
      Object.entries(ROLE_META).map(([key, value]) => ({
        key,
        ...value,
      })),
    [],
  );

  const safeCall = async (fn, fallback) => {
    try {
      return await fn();
    } catch {
      return fallback;
    }
  };

  const loadEverything = async () => {
    setLoading(true);
    const canManageSheets = ["super_admin", "business_dev"].includes(role);

    const [masterData, branchRows, leadRows, doctorRows, appointmentRows, verticalRows, sheetRows] =
      await Promise.all([
        safeCall(() => getMasterBoard(), { stage_counts: {} }),
        safeCall(() => getBranches(), []),
        safeCall(() =>
          getLeads({
            stage: leadStageFilter || undefined,
            branch_id: leadBranchFilter || undefined,
          }),
        []),
        safeCall(() => getDoctors({}), []),
        safeCall(() => getAppointments(appointmentFilter === "all" ? {} : { view: appointmentFilter }), []),
        safeCall(() => getVerticals(), []),
        canManageSheets ? safeCall(() => getSheetConnections(), []) : Promise.resolve([]),
      ]);

    setMasterBoard(masterData);
    setBranches(branchRows);
    setLeads(leadRows);
    setDoctors(doctorRows);
    setAppointments(appointmentRows);
    setVerticals(verticalRows.length ? verticalRows : verticalDefaults.map((name) => ({ id: name, name })));
    setSheetConnections(sheetRows);

    const branchId = role === "branch_admin" ? auth.user.branch_id : branchRows[0]?.id;
    if (branchId) {
      const data = await safeCall(() => getBranchBoard(branchId), { stage_counts: {} });
      setBranchBoard(data);
    } else {
      setBranchBoard({ stage_counts: {} });
    }

    setLoading(false);
  };

  useEffect(() => {
    loadEverything();
  }, [leadStageFilter, leadBranchFilter, appointmentFilter]);

  const logout = async () => {
    try {
      await apiLogout();
    } catch {
      // no-op
    }
    onLogout();
  };

  const createLeadNow = async (event) => {
    event.preventDefault();
    try {
      await createManualLead({ ...leadForm, source_type: "manual" });
      setLeadForm(defaultLead);
      toast.success("Lead created");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Lead create failed");
    }
  };

  const createBranchNow = async (event) => {
    event.preventDefault();
    try {
      await createBranch(branchForm);
      setBranchForm(defaultBranch);
      toast.success("Branch and branch admin created");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Branch create failed");
    }
  };

  const createDoctorNow = async (event) => {
    event.preventDefault();
    try {
      await createDoctor({ ...doctorForm, branch_id: doctorForm.branch_id || null });
      setDoctorForm(defaultDoctor);
      toast.success("Doctor profile created");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Doctor create failed");
    }
  };

  const addSlotNow = async (event) => {
    event.preventDefault();
    try {
      await addDoctorSlots(slotDoctorId, { slots: [slotTime] });
      setSlotTime("");
      toast.success("Slot added");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Slot add failed");
    }
  };

  const addVerticalNow = async (event) => {
    event.preventDefault();
    if (!verticalName.trim()) {
      toast.error("Vertical name required");
      return;
    }
    try {
      await createVertical({ name: verticalName.trim(), active: true });
      setVerticalName("");
      toast.success("Vertical created");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Vertical create failed");
    }
  };

  const qualifyNow = async (leadId) => {
    try {
      await qualifyLead(leadId);
      toast.success("Lead qualified");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Qualify failed");
    }
  };

  const assignBranchNow = async (leadId) => {
    const branchId = assignBranchSelection[leadId];
    if (!branchId) {
      toast.error("Select branch first");
      return;
    }
    try {
      await assignLeadBranch(leadId, { branch_id: branchId });
      toast.success("Assigned to branch");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Assign failed");
    }
  };

  const confirmNow = async (leadId) => {
    try {
      await confirmLead(leadId);
      toast.success("Branch confirmed lead");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Confirm failed");
    }
  };

  const checkDoctorsNow = async () => {
    const lead = leads.find((item) => item.id === selectedLeadForBooking);
    const branchId = lead?.branch_id || auth.user.branch_id;
    if (!branchId || !bookingTime) {
      toast.error("Pick lead and booking time");
      return;
    }
    try {
      const result = await getAvailableDoctors({ branch_id: branchId, slot_time: bookingTime });
      setAvailableDoctors(result.available_doctors || []);
      if (!(result.available_doctors || []).length) {
        toast.error("No doctors available at selected slot");
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Availability check failed");
    }
  };

  const bookNow = async () => {
    if (!selectedLeadForBooking || !selectedDoctorForBooking || !bookingTime) {
      toast.error("Lead, slot and doctor required");
      return;
    }
    try {
      await bookLeadAppointment(selectedLeadForBooking, {
        doctor_id: selectedDoctorForBooking,
        slot_time: bookingTime,
      });
      toast.success("Appointment booked");
      setSelectedLeadForBooking("");
      setBookingTime("");
      setSelectedDoctorForBooking("");
      setAvailableDoctors([]);
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Booking failed");
    }
  };

  const completeNow = async (appointmentId) => {
    try {
      await completeAppointment(appointmentId);
      toast.success("Appointment completed");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Complete failed");
    }
  };

  const createSheetConnectionNow = async (event) => {
    event.preventDefault();
    try {
      await createSheetConnection(sheetConnectionForm);
      setSheetConnectionForm(defaultSheetConnection);
      toast.success("Sheet connection created");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Sheet connection failed");
    }
  };

  const saveMappingNow = async () => {
    if (!selectedConnectionId) {
      toast.error("Select a sheet connection first");
      return;
    }
    try {
      await saveSheetMapping(selectedConnectionId, {
        field_map: mappingFields,
        create_new_fields: true,
      });
      toast.success("Mapping saved");
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Save mapping failed");
    }
  };

  const runSyncNow = async () => {
    if (!selectedConnectionId) {
      toast.error("Select a sheet connection first");
      return;
    }
    try {
      const parsed = JSON.parse(syncPayload);
      await syncSheetConnection(selectedConnectionId, parsed);
      toast.success("Sheet sync complete");
      await loadEverything();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Sync failed: verify JSON");
    }
  };

  const showSuperAdminBoard = role === "super_admin";
  const showBusinessDevBoard = role === "business_dev";
  const showPreSalesBoard = role === "pre_sales";
  const showBranchBoard = role === "branch_admin";
  const showHeadPhysioBoard = role === "head_physio";
  const showPhysioBoard = role === "physio";

  const filteredAppointmentsForPhysioBoards = appointments;

  const liveLeadPreview = useMemo(
    () => ({
      leads_preview: leads.slice(0, 5).map((lead) => ({
        id: lead.id,
        name: lead.name,
        phone: lead.phone,
        source_tab: lead.source_tab || lead.source_type,
        stage: lead.stage,
        vertical: lead.vertical,
      })),
    }),
    [leads],
  );

  return (
    <div className="min-h-screen bg-white px-4 py-6 md:px-8 md:py-10" data-testid="role-board-page">
      <Toaster richColors position="top-right" />

      <div className="mx-auto max-w-7xl space-y-6">
        <header className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm" data-testid="role-board-header">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.14em] text-sky-600" data-testid="role-board-brand-subtitle">
                FITSIOMAX OS
              </p>
              <h1 className="font-heading text-4xl text-slate-900" data-testid="role-board-title">
                {roleLabel} Board
              </h1>
              <p className="text-sm text-slate-600" data-testid="role-board-user-info">
                {auth.user.full_name} · {auth.user.email}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={loadEverything}
                className="border-slate-200 bg-white"
                data-testid="role-board-refresh-button"
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
              <Button
                variant="outline"
                onClick={logout}
                className="border-slate-200 bg-white"
                data-testid="role-board-logout-button"
              >
                <LogOut className="mr-2 h-4 w-4" /> Logout
              </Button>
            </div>
          </div>
        </header>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" data-testid="role-board-role-cards">
          {roleCards.map((item) => {
            const Icon = item.icon;
            const active = item.key === role;
            return (
              <div
                key={item.key}
                className={`rounded-lg border p-4 ${active ? "border-sky-400 bg-sky-50" : "border-slate-200 bg-white"}`}
                data-testid={`role-board-card-${item.key}`}
              >
                <div className="inline-flex rounded-md bg-sky-100 p-2 text-sky-600" data-testid={`role-board-card-icon-${item.key}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="mt-2 text-sm font-semibold text-slate-900" data-testid={`role-board-card-title-${item.key}`}>
                  {item.label}
                </p>
                <p className={`text-xs ${active ? "text-sky-700" : "text-slate-500"}`} data-testid={`role-board-card-state-${item.key}`}>
                  {active ? "Active board" : "Other user board"}
                </p>
              </div>
            );
          })}
        </section>

        {(showSuperAdminBoard || showBusinessDevBoard) && (
          <Card className="border-slate-200 bg-white" data-testid="top-board-card">
            <CardHeader>
              <CardTitle className="text-base text-slate-900" data-testid="top-board-title">
                Master Flow Snapshot
              </CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-3">
              {PIPELINE_STAGES.map((stage) => (
                <div key={stage} className="rounded-md border border-slate-200 bg-slate-50 p-3" data-testid={`top-board-stage-${stage}`}>
                  <p className="text-xs text-slate-500" data-testid={`top-board-stage-label-${stage}`}>{stage}</p>
                  <p className="text-2xl font-semibold text-sky-600" data-testid={`top-board-stage-value-${stage}`}>
                    {masterBoard.stage_counts?.[stage] || 0}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {showSuperAdminBoard && (
          <div className="grid gap-4 lg:grid-cols-2" data-testid="super-admin-board-section">
            <Card className="border-slate-200 bg-white" data-testid="super-admin-vertical-card">
              <CardHeader>
                <CardTitle className="text-base">Business Verticals</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <form className="flex gap-2" onSubmit={addVerticalNow} data-testid="super-admin-vertical-form">
                  <Input value={verticalName} onChange={(e) => setVerticalName(e.target.value)} placeholder="new_vertical" data-testid="super-admin-vertical-input" />
                  <Button type="submit" data-testid="super-admin-vertical-submit">Add</Button>
                </form>
                <div className="space-y-1">
                  {verticals.map((item) => (
                    <div key={item.id} className="rounded border border-slate-200 bg-slate-50 px-2 py-1 text-sm" data-testid={`super-admin-vertical-row-${item.id}`}>
                      {item.name}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white" data-testid="super-admin-branch-card">
              <CardHeader>
                <CardTitle className="text-base">Create Branch</CardTitle>
              </CardHeader>
              <CardContent>
                <form className="grid gap-2 md:grid-cols-2" onSubmit={createBranchNow} data-testid="super-admin-branch-form">
                  <Input value={branchForm.branch_name} onChange={(e) => setBranchForm((p) => ({ ...p, branch_name: e.target.value }))} placeholder="Branch Name" data-testid="super-admin-branch-name-input" />
                  <Input value={branchForm.address} onChange={(e) => setBranchForm((p) => ({ ...p, address: e.target.value }))} placeholder="Address" data-testid="super-admin-branch-address-input" />
                  <Input value={branchForm.admin_name} onChange={(e) => setBranchForm((p) => ({ ...p, admin_name: e.target.value }))} placeholder="Admin Name" data-testid="super-admin-branch-admin-name-input" />
                  <Input value={branchForm.admin_email} onChange={(e) => setBranchForm((p) => ({ ...p, admin_email: e.target.value }))} placeholder="Admin Email" data-testid="super-admin-branch-admin-email-input" />
                  <Input value={branchForm.admin_password} onChange={(e) => setBranchForm((p) => ({ ...p, admin_password: e.target.value }))} placeholder="Admin Password" data-testid="super-admin-branch-admin-password-input" />
                  <Input value={branchForm.admin_phone} onChange={(e) => setBranchForm((p) => ({ ...p, admin_phone: e.target.value }))} placeholder="Admin Phone" data-testid="super-admin-branch-admin-phone-input" />
                  <div className="md:col-span-2">
                    <Button type="submit" data-testid="super-admin-branch-submit">Create Branch</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {showBusinessDevBoard && (
          <div className="grid gap-4 lg:grid-cols-2" data-testid="business-dev-board-section">
            <Card className="border-slate-200 bg-white" data-testid="business-dev-connection-card">
              <CardHeader>
                <CardTitle className="text-base">Google Sheets Connections</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <form className="space-y-2" onSubmit={createSheetConnectionNow} data-testid="business-dev-connection-form">
                  <Input value={sheetConnectionForm.connection_name} onChange={(e) => setSheetConnectionForm((p) => ({ ...p, connection_name: e.target.value }))} placeholder="Connection Name" data-testid="business-dev-connection-name-input" />
                  <Input value={sheetConnectionForm.spreadsheet_id} onChange={(e) => setSheetConnectionForm((p) => ({ ...p, spreadsheet_id: e.target.value }))} placeholder="Spreadsheet ID" data-testid="business-dev-spreadsheet-id-input" />
                  <Input type="number" value={sheetConnectionForm.sync_interval_minutes} onChange={(e) => setSheetConnectionForm((p) => ({ ...p, sync_interval_minutes: Number(e.target.value) }))} data-testid="business-dev-sync-interval-input" />
                  <Button type="submit" data-testid="business-dev-connection-submit-button">Add Connection</Button>
                </form>
                <div className="space-y-1">
                  {sheetConnections.map((conn) => (
                    <div key={conn.id} className="rounded border border-slate-200 bg-slate-50 p-2 text-xs" data-testid={`business-dev-connection-row-${conn.id}`}>
                      {conn.connection_name} · {conn.spreadsheet_id}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white" data-testid="business-dev-mapping-card">
              <CardHeader>
                <CardTitle className="text-base">Field Mapping + Sync</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <select value={selectedConnectionId} onChange={(e) => setSelectedConnectionId(e.target.value)} className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm" data-testid="business-dev-connection-select">
                  <option value="">Select connection</option>
                  {sheetConnections.map((conn) => (
                    <option key={conn.id} value={conn.id}>{conn.connection_name}</option>
                  ))}
                </select>
                <Input value={mappingFields.name} onChange={(e) => setMappingFields((p) => ({ ...p, name: e.target.value }))} placeholder="Name column" data-testid="business-dev-map-name-input" />
                <Input value={mappingFields.phone} onChange={(e) => setMappingFields((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone column" data-testid="business-dev-map-phone-input" />
                <Input value={mappingFields.email} onChange={(e) => setMappingFields((p) => ({ ...p, email: e.target.value }))} placeholder="Email column" data-testid="business-dev-map-email-input" />
                <Input value={mappingFields.vertical} onChange={(e) => setMappingFields((p) => ({ ...p, vertical: e.target.value }))} placeholder="Vertical column" data-testid="business-dev-map-vertical-input" />
                <Button variant="outline" onClick={saveMappingNow} data-testid="business-dev-save-mapping-button">Save Mapping</Button>
                <textarea value={syncPayload} onChange={(e) => setSyncPayload(e.target.value)} className="min-h-[180px] w-full rounded-md border border-slate-200 p-3 text-xs" data-testid="business-dev-sync-payload-textarea" />
                <Button onClick={runSyncNow} data-testid="business-dev-run-sync-button">Run Sync</Button>
              </CardContent>
            </Card>
          </div>
        )}

        {(showSuperAdminBoard || showPreSalesBoard || showBranchBoard) && (
          <Card className="border-slate-200 bg-white" data-testid="lead-master-card">
            <CardHeader>
              <CardTitle className="text-base">Lead Master Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2 md:grid-cols-4">
                <Input value={leadForm.name} onChange={(e) => setLeadForm((p) => ({ ...p, name: e.target.value }))} placeholder="Lead name" data-testid="lead-master-name-input" />
                <Input value={leadForm.phone} onChange={(e) => setLeadForm((p) => ({ ...p, phone: e.target.value }))} placeholder="Phone" data-testid="lead-master-phone-input" />
                <Input value={leadForm.email} onChange={(e) => setLeadForm((p) => ({ ...p, email: e.target.value }))} placeholder="Email" data-testid="lead-master-email-input" />
                <Button onClick={createLeadNow} data-testid="lead-master-create-button">+ New Lead</Button>
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <select value={leadStageFilter} onChange={(e) => setLeadStageFilter(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="lead-master-stage-filter">
                  <option value="">All stages</option>
                  {PIPELINE_STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
                </select>
                <select value={leadBranchFilter} onChange={(e) => setLeadBranchFilter(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="lead-master-branch-filter">
                  <option value="">All branches</option>
                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                </select>
                <Button variant="outline" onClick={loadEverything} data-testid="lead-master-refresh-button">Refresh</Button>
              </div>

              <div className="overflow-auto rounded-lg border border-slate-200" data-testid="lead-master-table-wrap">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-left text-slate-600">
                    <tr>
                      <th className="px-3 py-2">Lead</th>
                      <th className="px-3 py-2">Source</th>
                      <th className="px-3 py-2">Stage</th>
                      <th className="px-3 py-2">Branch</th>
                      <th className="px-3 py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {leads.map((lead) => (
                      <tr key={lead.id} className="border-t border-slate-100" data-testid={`lead-master-row-${lead.id}`}>
                        <td className="px-3 py-2" data-testid={`lead-master-name-${lead.id}`}>{lead.name} · {lead.phone}</td>
                        <td className="px-3 py-2" data-testid={`lead-master-source-${lead.id}`}>{lead.source_tab || lead.source_type}</td>
                        <td className="px-3 py-2" data-testid={`lead-master-stage-${lead.id}`}>{lead.stage}</td>
                        <td className="px-3 py-2" data-testid={`lead-master-branch-${lead.id}`}>{branches.find((b) => b.id === lead.branch_id)?.branch_name || "Unassigned"}</td>
                        <td className="px-3 py-2">
                          <div className="flex flex-wrap gap-1">
                            {(showSuperAdminBoard || showPreSalesBoard) && (
                              <Button size="sm" variant="outline" onClick={() => qualifyNow(lead.id)} data-testid={`lead-action-qualify-${lead.id}`}>Qualify</Button>
                            )}

                            {(showSuperAdminBoard || showPreSalesBoard) && (
                              <>
                                <select value={assignBranchSelection[lead.id] || ""} onChange={(e) => setAssignBranchSelection((p) => ({ ...p, [lead.id]: e.target.value }))} className="h-8 rounded border border-slate-200 px-1 text-xs" data-testid={`lead-action-branch-select-${lead.id}`}>
                                  <option value="">Branch</option>
                                  {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                                </select>
                                <Button size="sm" variant="outline" onClick={() => assignBranchNow(lead.id)} data-testid={`lead-action-assign-${lead.id}`}>Assign</Button>
                              </>
                            )}

                            {(showSuperAdminBoard || showBranchBoard) && (
                              <Button size="sm" variant="outline" onClick={() => confirmNow(lead.id)} data-testid={`lead-action-confirm-${lead.id}`}>Confirm</Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}

        {(showSuperAdminBoard || showBranchBoard) && (
          <Card className="border-slate-200 bg-white" data-testid="branch-booking-card">
            <CardHeader>
              <CardTitle className="text-base">Branch Booking Board</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid gap-2 md:grid-cols-4">
                <select value={selectedLeadForBooking} onChange={(e) => setSelectedLeadForBooking(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="branch-booking-lead-select">
                  <option value="">Select lead</option>
                  {leads.filter((lead) => ["Assigned to Branch", "Branch Confirmed"].includes(lead.stage)).map((lead) => (
                    <option key={lead.id} value={lead.id}>{lead.name} · {lead.phone}</option>
                  ))}
                </select>
                <Input type="datetime-local" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} data-testid="branch-booking-time-input" />
                <Button variant="outline" onClick={checkDoctorsNow} data-testid="branch-check-doctors-button">Check Available</Button>
                <select value={selectedDoctorForBooking} onChange={(e) => setSelectedDoctorForBooking(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="branch-available-doctor-select">
                  <option value="">Choose doctor</option>
                  {availableDoctors.map((doctor) => (
                    <option key={doctor.id} value={doctor.id}>{doctor.full_name} ({doctor.profile_type})</option>
                  ))}
                </select>
              </div>
              <Button onClick={bookNow} data-testid="branch-book-appointment-button">Book Appointment</Button>
              <p className="text-xs text-slate-500" data-testid="branch-booking-note">
                Only available doctors are shown; already booked doctors remain hidden.
              </p>
            </CardContent>
          </Card>
        )}

        {(showSuperAdminBoard || showBranchBoard || showHeadPhysioBoard || showPhysioBoard) && (
          <div className="grid gap-4 lg:grid-cols-2" data-testid="doctor-appointments-section">
            {(showSuperAdminBoard || showBranchBoard) && (
              <Card className="border-slate-200 bg-white" data-testid="doctor-setup-card">
                <CardHeader>
                  <CardTitle className="text-base">Head Physio / Physio Setup</CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-2 md:grid-cols-2" onSubmit={createDoctorNow} data-testid="doctor-setup-form">
                    <Input value={doctorForm.full_name} onChange={(e) => setDoctorForm((p) => ({ ...p, full_name: e.target.value }))} placeholder="Doctor name" data-testid="doctor-setup-name-input" />
                    <select value={doctorForm.profile_type} onChange={(e) => setDoctorForm((p) => ({ ...p, profile_type: e.target.value }))} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="doctor-setup-profile-select">
                      <option value="head_physio">Head Physio</option>
                      <option value="physio">Physio</option>
                    </select>
                    <select value={doctorForm.branch_id} onChange={(e) => setDoctorForm((p) => ({ ...p, branch_id: e.target.value }))} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="doctor-setup-branch-select">
                      <option value="">Branch</option>
                      {branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.branch_name}</option>)}
                    </select>
                    <Input value={doctorForm.specialization} onChange={(e) => setDoctorForm((p) => ({ ...p, specialization: e.target.value }))} placeholder="Specialization" data-testid="doctor-setup-specialization-input" />
                    <div className="md:col-span-2">
                      <Button type="submit" data-testid="doctor-setup-submit-button">Create Profile</Button>
                    </div>
                  </form>

                  <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={addSlotNow} data-testid="doctor-slot-form">
                    <select value={slotDoctorId} onChange={(e) => setSlotDoctorId(e.target.value)} className="h-9 rounded-md border border-slate-200 px-3 text-sm" data-testid="doctor-slot-doctor-select">
                      <option value="">Doctor</option>
                      {doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.full_name}</option>)}
                    </select>
                    <Input type="datetime-local" value={slotTime} onChange={(e) => setSlotTime(e.target.value)} data-testid="doctor-slot-time-input" />
                    <Button type="submit" variant="outline" data-testid="doctor-slot-submit-button">Add Slot</Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card className="border-slate-200 bg-white" data-testid="appointments-card">
              <CardHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle className="text-base">Appointments Board</CardTitle>
                  <Button size="sm" variant={appointmentFilter === "all" ? "default" : "outline"} onClick={() => setAppointmentFilter("all")} data-testid="appointments-filter-all-button">All</Button>
                  <Button size="sm" variant={appointmentFilter === "today" ? "default" : "outline"} onClick={() => setAppointmentFilter("today")} data-testid="appointments-filter-today-button">Today</Button>
                  <Button size="sm" variant={appointmentFilter === "new" ? "default" : "outline"} onClick={() => setAppointmentFilter("new")} data-testid="appointments-filter-new-button">New</Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredAppointmentsForPhysioBoards.map((appointment) => (
                  <div key={appointment.id} className="rounded border border-slate-200 bg-slate-50 p-2" data-testid={`appointments-row-${appointment.id}`}>
                    <p className="text-sm text-slate-800" data-testid={`appointments-lead-${appointment.id}`}>{appointment.lead_name}</p>
                    <p className="text-xs text-slate-500" data-testid={`appointments-doctor-${appointment.id}`}>{appointment.doctor_name} · {appointment.slot_time}</p>
                    <p className="text-xs text-slate-500" data-testid={`appointments-status-${appointment.id}`}>{appointment.status}</p>
                    {(showSuperAdminBoard || showHeadPhysioBoard || showPhysioBoard) && appointment.status !== "completed" && (
                      <Button size="sm" className="mt-2" onClick={() => completeNow(appointment.id)} data-testid={`appointments-complete-${appointment.id}`}>
                        Mark Completed
                      </Button>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        <Card className="border-slate-200 bg-white" data-testid="mock-preview-card">
          <CardHeader>
            <CardTitle className="text-base">Live Lead Source Preview (Instagram / Meta / Walkins)</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="overflow-auto rounded border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700" data-testid="mock-preview-json">
              {JSON.stringify(liveLeadPreview, null, 2)}
            </pre>
          </CardContent>
        </Card>
      </div>

      {loading && (
        <div className="fixed bottom-4 right-4 rounded-md bg-slate-900 px-3 py-2 text-sm text-white" data-testid="role-board-loading-indicator">
          Loading boards...
        </div>
      )}
    </div>
  );
};
