import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  CalendarClock,
  FolderKanban,
  Layers3,
  Link2,
  List,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
  apiLogout,
  bookAppointment,
  createBranch,
  createLead,
  createStage,
  createUser,
  getBranches,
  getDashboardSummary,
  getLeads,
  getSheetsConfig,
  getSheetsStatus,
  getStages,
  getUsers,
  importSheetsLeads,
  moveLeadStage,
  saveSheetsConfig,
  startSheetsOAuth,
} from "@/lib/api";

const defaultLeadForm = {
  name: "",
  phone: "",
  email: "",
  source: "Manual",
  branch_id: "",
  notes: "",
};

const defaultSheetConfig = {
  spreadsheet_id: "",
  sheet_name: "Leads",
  column_mapping: {
    name: "Name",
    phone: "Phone",
    email: "Email",
    source: "Source",
  },
};

export const CRMPage = ({ auth, onLogout }) => {
  const [activeTab, setActiveTab] = useState(auth.user.role === "super_admin" ? "dashboard" : "leads");
  const [viewType, setViewType] = useState("list");
  const [pipeline, setPipeline] = useState(auth.user.role === "sales" ? "sales" : "pre_sales");
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");

  const [summary, setSummary] = useState(null);
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [stagesByPipeline, setStagesByPipeline] = useState({ pre_sales: [], sales: [] });
  const [leads, setLeads] = useState([]);
  const [sheetStatus, setSheetStatus] = useState(null);
  const [sheetConfig, setSheetConfig] = useState(defaultSheetConfig);

  const [loading, setLoading] = useState(false);
  const [leadForm, setLeadForm] = useState(defaultLeadForm);
  const [appointmentLead, setAppointmentLead] = useState(null);
  const [appointmentForm, setAppointmentForm] = useState({
    appointment_datetime: "",
    consultation_fee: 0,
    branch_id: "",
    assigned_to_sales: "",
  });
  const [branchForm, setBranchForm] = useState({ name: "", city: "" });
  const [userForm, setUserForm] = useState({
    full_name: "",
    email: "",
    password: "",
    role: "pre_sales",
    branch_id: "",
  });
  const [stageForm, setStageForm] = useState({ pipeline: "pre_sales", name: "", order: "" });

  const isAdmin = auth.user.role === "super_admin";
  const isPreSales = auth.user.role === "pre_sales";
  const isSales = auth.user.role === "sales";

  const branchNameMap = useMemo(() => {
    return branches.reduce((acc, branch) => ({ ...acc, [branch.id]: branch.name }), {});
  }, [branches]);

  const tabs = useMemo(() => {
    const base = [{ key: "leads", label: "Leads", icon: FolderKanban }];
    if (isAdmin) {
      return [
        { key: "dashboard", label: "Master Board", icon: Layers3 },
        ...base,
        { key: "team", label: "Team", icon: Users },
        { key: "stages", label: "Stages", icon: Activity },
        { key: "sheets", label: "Google Sheets", icon: Link2 },
      ];
    }
    return base;
  }, [isAdmin]);

  const stagesForCurrentPipeline = stagesByPipeline[pipeline] || [];

  const groupedKanbanData = useMemo(() => {
    const initial = {};
    stagesForCurrentPipeline.forEach((stage) => {
      initial[stage.name] = [];
    });
    leads.forEach((lead) => {
      const key = pipeline === "pre_sales" ? lead.pre_sales_stage : lead.sales_stage;
      if (!initial[key]) {
        initial[key] = [];
      }
      initial[key].push(lead);
    });
    return initial;
  }, [leads, pipeline, stagesForCurrentPipeline]);

  const loadMeta = async () => {
    setLoading(true);
    try {
      const [summaryRes, branchesRes, usersRes, preStagesRes, salesStagesRes] = await Promise.all([
        getDashboardSummary(),
        getBranches(),
        getUsers(),
        getStages("pre_sales"),
        getStages("sales"),
      ]);
      setSummary(summaryRes);
      setBranches(branchesRes);
      setUsers(usersRes);
      setStagesByPipeline({ pre_sales: preStagesRes, sales: salesStagesRes });

      if (isAdmin) {
        const [statusRes, configRes] = await Promise.all([getSheetsStatus(), getSheetsConfig()]);
        setSheetStatus(statusRes);
        setSheetConfig(configRes);
      }
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load CRM data");
    } finally {
      setLoading(false);
    }
  };

  const loadLeads = async () => {
    try {
      const leadRows = await getLeads({
        pipeline,
        search: search || undefined,
        stage: stageFilter || undefined,
      });
      setLeads(leadRows);
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to load leads");
    }
  };

  useEffect(() => {
    loadMeta();
  }, []);

  useEffect(() => {
    loadLeads();
  }, [pipeline, search, stageFilter]);

  const handleLogout = async () => {
    try {
      await apiLogout();
    } catch {
      // no-op for logout fallback
    }
    onLogout();
  };

  const handleCreateLead = async (event) => {
    event.preventDefault();
    try {
      await createLead({
        ...leadForm,
        branch_id: leadForm.branch_id || null,
      });
      setLeadForm(defaultLeadForm);
      toast.success("Lead created successfully");
      await loadLeads();
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create lead");
    }
  };

  const handleMoveStage = async (leadId, stage) => {
    try {
      await moveLeadStage(leadId, { pipeline, stage });
      toast.success("Stage updated");
      await loadLeads();
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to move stage");
    }
  };

  const submitAppointment = async (event) => {
    event.preventDefault();
    if (!appointmentLead) {
      return;
    }
    try {
      await bookAppointment(appointmentLead.id, {
        ...appointmentForm,
        consultation_fee: Number(appointmentForm.consultation_fee) || 0,
        branch_id: appointmentForm.branch_id || null,
        assigned_to_sales: appointmentForm.assigned_to_sales || null,
      });
      setAppointmentLead(null);
      setAppointmentForm({ appointment_datetime: "", consultation_fee: 0, branch_id: "", assigned_to_sales: "" });
      toast.success("Appointment booked and moved to Sales pipeline");
      await loadLeads();
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Appointment booking failed");
    }
  };

  const submitBranch = async (event) => {
    event.preventDefault();
    try {
      await createBranch(branchForm);
      setBranchForm({ name: "", city: "" });
      toast.success("Branch created");
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create branch");
    }
  };

  const submitUser = async (event) => {
    event.preventDefault();
    try {
      await createUser({
        ...userForm,
        branch_id: userForm.branch_id || null,
      });
      setUserForm({ full_name: "", email: "", password: "", role: "pre_sales", branch_id: "" });
      toast.success("Team member added");
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to add team member");
    }
  };

  const submitStage = async (event) => {
    event.preventDefault();
    try {
      await createStage({
        pipeline: stageForm.pipeline,
        name: stageForm.name,
        order: stageForm.order ? Number(stageForm.order) : undefined,
      });
      setStageForm((prev) => ({ ...prev, name: "", order: "" }));
      toast.success("Custom stage created");
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to create stage");
    }
  };

  const submitSheetConfig = async (event) => {
    event.preventDefault();
    try {
      await saveSheetsConfig(sheetConfig);
      toast.success("Google Sheets mapping saved");
      await loadMeta();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Failed to save Sheets config");
    }
  };

  const runSheetOAuth = async () => {
    try {
      const response = await startSheetsOAuth();
      window.location.href = response.auth_url;
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Google OAuth setup pending");
    }
  };

  const importLeadsFromSheets = async () => {
    try {
      const response = await importSheetsLeads();
      toast.success(`Import done: ${response.imported_count} leads added`);
      await loadMeta();
      await loadLeads();
    } catch (error) {
      toast.error(error?.response?.data?.detail || "Import failed");
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-6 md:px-8 md:py-8" data-testid="crm-page">
      <Toaster richColors position="top-right" />

      <div className="mx-auto max-w-7xl">
        <header
          className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 md:p-6"
          data-testid="crm-header"
        >
          <div className="space-y-1" data-testid="crm-header-info">
            <p className="text-xs uppercase tracking-[0.16em] text-slate-500" data-testid="crm-header-label">
              Performance Pro CRM
            </p>
            <h1 className="font-heading text-4xl text-slate-900" data-testid="crm-header-title">
              Welcome, {auth.user.full_name}
            </h1>
            <p className="text-sm text-slate-600" data-testid="crm-header-role">
              Logged in as <span className="font-semibold capitalize">{auth.user.role.replace("_", " ")}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={loadMeta} className="gap-2" data-testid="crm-refresh-button">
              <RefreshCw className="h-4 w-4" /> Refresh
            </Button>
            <Button
              variant="outline"
              onClick={handleLogout}
              className="gap-2 border-slate-300 text-slate-700"
              data-testid="crm-logout-button"
            >
              <LogOut className="h-4 w-4" /> Logout
            </Button>
          </div>
        </header>

        <nav className="mb-6 flex flex-wrap gap-2" data-testid="crm-main-nav">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors ${
                  isActive
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
                data-testid={`crm-nav-${tab.key}-button`}
              >
                <Icon className="h-4 w-4" /> {tab.label}
              </button>
            );
          })}
        </nav>

        {activeTab === "dashboard" && isAdmin && (
          <div className="space-y-6" data-testid="dashboard-tab-content">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <MetricCard title="Total Leads" value={summary?.metrics?.total_leads || 0} testId="metric-total-leads" />
              <MetricCard title="Pre-sales Open" value={summary?.metrics?.pre_sales_open || 0} testId="metric-pre-sales-open" />
              <MetricCard title="Sales Open" value={summary?.metrics?.sales_open || 0} testId="metric-sales-open" />
              <MetricCard
                title="Appointments"
                value={summary?.metrics?.appointments_booked || 0}
                testId="metric-appointments-booked"
              />
              <MetricCard title="Package Sold" value={summary?.metrics?.package_sold || 0} testId="metric-package-sold" />
            </div>

            <Card data-testid="dashboard-branch-performance-card">
              <CardHeader>
                <CardTitle className="text-base" data-testid="dashboard-branch-performance-title">
                  Branch Performance
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 md:grid-cols-2" data-testid="dashboard-branch-performance-grid">
                  {(summary?.branch_breakdown || []).map((branch) => (
                    <div
                      key={branch.branch_id}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-4"
                      data-testid={`dashboard-branch-card-${branch.branch_id}`}
                    >
                      <p className="text-sm text-slate-500" data-testid={`dashboard-branch-name-${branch.branch_id}`}>
                        {branch.branch_name}
                      </p>
                      <p className="text-2xl font-semibold text-slate-900" data-testid={`dashboard-branch-leads-${branch.branch_id}`}>
                        {branch.lead_count} leads
                      </p>
                    </div>
                  ))}
                  {(summary?.branch_breakdown || []).length === 0 && (
                    <p className="text-sm text-slate-500" data-testid="dashboard-branch-empty-state">
                      Add branches and leads to view branch performance.
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "leads" && (
          <div className="space-y-6" data-testid="leads-tab-content">
            {(isAdmin || isPreSales) && (
              <Card data-testid="lead-create-card">
                <CardHeader>
                  <CardTitle className="text-base" data-testid="lead-create-title">
                    Add New Lead
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-3 md:grid-cols-3" onSubmit={handleCreateLead} data-testid="lead-create-form">
                    <Input
                      value={leadForm.name}
                      onChange={(event) => setLeadForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Lead name"
                      data-testid="lead-create-name-input"
                    />
                    <Input
                      value={leadForm.phone}
                      onChange={(event) => setLeadForm((prev) => ({ ...prev, phone: event.target.value }))}
                      placeholder="Phone"
                      data-testid="lead-create-phone-input"
                    />
                    <Input
                      value={leadForm.email}
                      onChange={(event) => setLeadForm((prev) => ({ ...prev, email: event.target.value }))}
                      placeholder="Email"
                      data-testid="lead-create-email-input"
                    />
                    <Input
                      value={leadForm.source}
                      onChange={(event) => setLeadForm((prev) => ({ ...prev, source: event.target.value }))}
                      placeholder="Source"
                      data-testid="lead-create-source-input"
                    />
                    <select
                      value={leadForm.branch_id}
                      onChange={(event) => setLeadForm((prev) => ({ ...prev, branch_id: event.target.value }))}
                      className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                      data-testid="lead-create-branch-select"
                    >
                      <option value="">Select branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="lead-create-submit-button">
                      Create Lead
                    </Button>
                  </form>
                </CardContent>
              </Card>
            )}

            <Card data-testid="leads-board-card">
              <CardHeader>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <CardTitle className="text-base" data-testid="leads-board-title">
                    Lead Board ({pipeline === "pre_sales" ? "Pre-sales" : "Sales"})
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewType("list")}
                      className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        viewType === "list" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
                      }`}
                      data-testid="leads-view-list-button"
                    >
                      <List className="h-4 w-4" /> List
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewType("kanban")}
                      className={`inline-flex items-center gap-1 rounded-md border px-3 py-2 text-sm transition-colors ${
                        viewType === "kanban" ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 bg-white"
                      }`}
                      data-testid="leads-view-kanban-button"
                    >
                      <FolderKanban className="h-4 w-4" /> Kanban
                    </button>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-4">
                  <select
                    value={pipeline}
                    onChange={(event) => {
                      setPipeline(event.target.value);
                      setStageFilter("");
                    }}
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    data-testid="leads-pipeline-select"
                  >
                    {isSales && <option value="sales">Sales</option>}
                    {!isSales && <option value="pre_sales">Pre-sales</option>}
                    {isAdmin && <option value="sales">Sales</option>}
                  </select>

                  <select
                    value={stageFilter}
                    onChange={(event) => setStageFilter(event.target.value)}
                    className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                    data-testid="leads-stage-filter-select"
                  >
                    <option value="">All stages</option>
                    {stagesForCurrentPipeline.map((stage) => (
                      <option key={stage.id} value={stage.name}>
                        {stage.name}
                      </option>
                    ))}
                  </select>

                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Search by name, phone, email"
                    data-testid="leads-search-input"
                  />

                  <Button variant="outline" onClick={loadLeads} data-testid="leads-refresh-button">
                    Refresh Leads
                  </Button>
                </div>
              </CardHeader>

              <CardContent>
                {viewType === "list" ? (
                  <Table data-testid="leads-list-table">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Branch</TableHead>
                        <TableHead>Stage</TableHead>
                        <TableHead>Consultation Fee</TableHead>
                        <TableHead>Appointment</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id} data-testid={`lead-row-${lead.id}`}>
                          <TableCell data-testid={`lead-name-${lead.id}`}>{lead.name}</TableCell>
                          <TableCell data-testid={`lead-phone-${lead.id}`}>{lead.phone}</TableCell>
                          <TableCell data-testid={`lead-branch-${lead.id}`}>
                            {branchNameMap[lead.branch_id] || "Unassigned"}
                          </TableCell>
                          <TableCell>
                            <select
                              value={pipeline === "pre_sales" ? lead.pre_sales_stage : lead.sales_stage}
                              onChange={(event) => handleMoveStage(lead.id, event.target.value)}
                              className="h-8 rounded-md border border-slate-200 px-2 text-xs"
                              data-testid={`lead-stage-select-${lead.id}`}
                            >
                              {stagesForCurrentPipeline.map((stage) => (
                                <option key={stage.id} value={stage.name}>
                                  {stage.name}
                                </option>
                              ))}
                            </select>
                          </TableCell>
                          <TableCell data-testid={`lead-fee-${lead.id}`}>₹{lead.consultation_fee}</TableCell>
                          <TableCell data-testid={`lead-appointment-${lead.id}`}>
                            {lead.appointment_datetime || "Not booked"}
                          </TableCell>
                          <TableCell>
                            {pipeline === "pre_sales" && (isPreSales || isAdmin) ? (
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1"
                                onClick={() => {
                                  setAppointmentLead(lead);
                                  setAppointmentForm((prev) => ({ ...prev, branch_id: lead.branch_id || "" }));
                                }}
                                data-testid={`lead-book-appointment-button-${lead.id}`}
                              >
                                <CalendarClock className="h-4 w-4" /> Book
                              </Button>
                            ) : (
                              <span className="text-xs text-slate-500" data-testid={`lead-action-label-${lead.id}`}>
                                Stage update only
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="flex gap-4 overflow-x-auto pb-2" data-testid="leads-kanban-board">
                    {Object.keys(groupedKanbanData).map((stageName) => (
                      <div
                        key={stageName}
                        className="min-w-[260px] flex-1 rounded-lg border border-slate-200 bg-slate-50 p-3"
                        data-testid={`kanban-column-${stageName.replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        <h3 className="mb-3 text-sm font-semibold text-slate-700" data-testid={`kanban-column-title-${stageName}`}>
                          {stageName} ({groupedKanbanData[stageName].length})
                        </h3>
                        <div className="space-y-2">
                          {groupedKanbanData[stageName].map((lead) => (
                            <div
                              key={lead.id}
                              className="rounded-md border border-slate-200 bg-white p-3"
                              data-testid={`kanban-card-${lead.id}`}
                            >
                              <p className="text-sm font-medium text-slate-900" data-testid={`kanban-card-name-${lead.id}`}>
                                {lead.name}
                              </p>
                              <p className="text-xs text-slate-500" data-testid={`kanban-card-phone-${lead.id}`}>
                                {lead.phone}
                              </p>
                              <select
                                value={pipeline === "pre_sales" ? lead.pre_sales_stage : lead.sales_stage}
                                onChange={(event) => handleMoveStage(lead.id, event.target.value)}
                                className="mt-2 h-8 w-full rounded-md border border-slate-200 px-2 text-xs"
                                data-testid={`kanban-stage-select-${lead.id}`}
                              >
                                {stagesForCurrentPipeline.map((stage) => (
                                  <option key={stage.id} value={stage.name}>
                                    {stage.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {leads.length === 0 && (
                  <p className="mt-4 text-sm text-slate-500" data-testid="leads-empty-state">
                    No leads found for current filters.
                  </p>
                )}
              </CardContent>
            </Card>

            {appointmentLead && (
              <Card data-testid="appointment-booking-card">
                <CardHeader>
                  <CardTitle className="text-base" data-testid="appointment-booking-title">
                    Book Appointment: {appointmentLead.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <form className="grid gap-3 md:grid-cols-4" onSubmit={submitAppointment} data-testid="appointment-booking-form">
                    <Input
                      type="datetime-local"
                      value={appointmentForm.appointment_datetime}
                      onChange={(event) =>
                        setAppointmentForm((prev) => ({ ...prev, appointment_datetime: event.target.value }))
                      }
                      data-testid="appointment-datetime-input"
                    />
                    <Input
                      type="number"
                      value={appointmentForm.consultation_fee}
                      onChange={(event) =>
                        setAppointmentForm((prev) => ({ ...prev, consultation_fee: event.target.value }))
                      }
                      placeholder="Consultation fee"
                      data-testid="appointment-fee-input"
                    />
                    <select
                      value={appointmentForm.branch_id}
                      onChange={(event) => setAppointmentForm((prev) => ({ ...prev, branch_id: event.target.value }))}
                      className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                      data-testid="appointment-branch-select"
                    >
                      <option value="">Select branch</option>
                      {branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>
                          {branch.name}
                        </option>
                      ))}
                    </select>
                    <select
                      value={appointmentForm.assigned_to_sales}
                      onChange={(event) =>
                        setAppointmentForm((prev) => ({ ...prev, assigned_to_sales: event.target.value }))
                      }
                      className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                      data-testid="appointment-sales-assignee-select"
                    >
                      <option value="">Assign sales person</option>
                      {users
                        .filter((user) => user.role === "sales")
                        .map((user) => (
                          <option key={user.id} value={user.id}>
                            {user.full_name}
                          </option>
                        ))}
                    </select>
                    <div className="md:col-span-4 flex gap-2">
                      <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="appointment-submit-button">
                        Confirm Appointment
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setAppointmentLead(null)}
                        data-testid="appointment-cancel-button"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {activeTab === "team" && isAdmin && (
          <div className="grid gap-6 lg:grid-cols-2" data-testid="team-tab-content">
            <Card data-testid="branch-management-card">
              <CardHeader>
                <CardTitle className="text-base" data-testid="branch-management-title">
                  Branch Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={submitBranch} data-testid="branch-create-form">
                  <Input
                    value={branchForm.name}
                    onChange={(event) => setBranchForm((prev) => ({ ...prev, name: event.target.value }))}
                    placeholder="Branch name"
                    data-testid="branch-name-input"
                  />
                  <Input
                    value={branchForm.city}
                    onChange={(event) => setBranchForm((prev) => ({ ...prev, city: event.target.value }))}
                    placeholder="City"
                    data-testid="branch-city-input"
                  />
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="branch-create-submit-button">
                    Create Branch
                  </Button>
                </form>
                <div className="mt-4 space-y-2">
                  {branches.map((branch) => (
                    <div
                      key={branch.id}
                      className="rounded-md border border-slate-200 bg-slate-50 p-3"
                      data-testid={`branch-row-${branch.id}`}
                    >
                      <p className="text-sm font-medium text-slate-800" data-testid={`branch-name-${branch.id}`}>
                        {branch.name}
                      </p>
                      <p className="text-xs text-slate-500" data-testid={`branch-city-${branch.id}`}>
                        {branch.city || "City not set"}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card data-testid="team-management-card">
              <CardHeader>
                <CardTitle className="text-base" data-testid="team-management-title">
                  Team Management
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form className="space-y-3" onSubmit={submitUser} data-testid="team-create-form">
                  <Input
                    value={userForm.full_name}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, full_name: event.target.value }))}
                    placeholder="Full name"
                    data-testid="team-name-input"
                  />
                  <Input
                    value={userForm.email}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))}
                    placeholder="Email"
                    data-testid="team-email-input"
                  />
                  <Input
                    value={userForm.password}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, password: event.target.value }))}
                    placeholder="Password"
                    data-testid="team-password-input"
                  />
                  <select
                    value={userForm.role}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, role: event.target.value }))}
                    className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                    data-testid="team-role-select"
                  >
                    <option value="pre_sales">Pre-sales</option>
                    <option value="sales">Sales</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                  <select
                    value={userForm.branch_id}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, branch_id: event.target.value }))}
                    className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm"
                    data-testid="team-branch-select"
                  >
                    <option value="">Assign branch</option>
                    {branches.map((branch) => (
                      <option key={branch.id} value={branch.id}>
                        {branch.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="team-create-submit-button">
                    Add Team Member
                  </Button>
                </form>

                <div className="mt-4 max-h-[320px] overflow-y-auto rounded-md border border-slate-200" data-testid="team-list-container">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Branch</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {users.map((user) => (
                        <TableRow key={user.id} data-testid={`team-row-${user.id}`}>
                          <TableCell data-testid={`team-name-${user.id}`}>{user.full_name}</TableCell>
                          <TableCell className="capitalize" data-testid={`team-role-${user.id}`}>
                            {user.role.replace("_", " ")}
                          </TableCell>
                          <TableCell data-testid={`team-branch-${user.id}`}>
                            {branchNameMap[user.branch_id] || "Unassigned"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "stages" && isAdmin && (
          <Card data-testid="stages-tab-content">
            <CardHeader>
              <CardTitle className="text-base" data-testid="stages-tab-title">
                Custom Stage Creator
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form className="grid gap-3 md:grid-cols-4" onSubmit={submitStage} data-testid="stage-create-form">
                <select
                  value={stageForm.pipeline}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, pipeline: event.target.value }))}
                  className="h-9 rounded-md border border-slate-200 px-3 text-sm"
                  data-testid="stage-pipeline-select"
                >
                  <option value="pre_sales">Pre-sales</option>
                  <option value="sales">Sales</option>
                </select>
                <Input
                  value={stageForm.name}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, name: event.target.value }))}
                  placeholder="Stage name"
                  data-testid="stage-name-input"
                />
                <Input
                  type="number"
                  value={stageForm.order}
                  onChange={(event) => setStageForm((prev) => ({ ...prev, order: event.target.value }))}
                  placeholder="Order (optional)"
                  data-testid="stage-order-input"
                />
                <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="stage-create-submit-button">
                  Add Stage
                </Button>
              </form>

              <div className="mt-5 grid gap-4 md:grid-cols-2">
                <StageList title="Pre-sales stages" rows={stagesByPipeline.pre_sales} testId="stages-pre-sales-list" />
                <StageList title="Sales stages" rows={stagesByPipeline.sales} testId="stages-sales-list" />
              </div>
            </CardContent>
          </Card>
        )}

        {activeTab === "sheets" && isAdmin && (
          <Card data-testid="sheets-tab-content">
            <CardHeader>
              <CardTitle className="text-base" data-testid="sheets-tab-title">
                Google Sheets Integration & Column Mapping
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-4" data-testid="sheets-status-card">
                <p className="text-sm text-slate-500" data-testid="sheets-status-label">
                  Integration status
                </p>
                <p className="text-base font-semibold text-slate-900" data-testid="sheets-status-value">
                  {sheetStatus?.connected ? "Connected" : "Disconnected"}
                </p>
                <p className="text-xs text-slate-500" data-testid="sheets-status-message">
                  {sheetStatus?.message || "Loading status..."}
                </p>
                <p className="text-xs text-slate-500" data-testid="sheets-last-sync-value">
                  Last Sync: {sheetStatus?.last_sync || "Not yet synced"}
                </p>
              </div>

              <form className="grid gap-3 md:grid-cols-2" onSubmit={submitSheetConfig} data-testid="sheets-config-form">
                <Input
                  value={sheetConfig.spreadsheet_id}
                  onChange={(event) => setSheetConfig((prev) => ({ ...prev, spreadsheet_id: event.target.value }))}
                  placeholder="Spreadsheet ID"
                  data-testid="sheets-spreadsheet-id-input"
                />
                <Input
                  value={sheetConfig.sheet_name}
                  onChange={(event) => setSheetConfig((prev) => ({ ...prev, sheet_name: event.target.value }))}
                  placeholder="Sheet name"
                  data-testid="sheets-sheet-name-input"
                />

                <Input
                  value={sheetConfig.column_mapping?.name || ""}
                  onChange={(event) =>
                    setSheetConfig((prev) => ({
                      ...prev,
                      column_mapping: { ...prev.column_mapping, name: event.target.value },
                    }))
                  }
                  placeholder="Column for Name"
                  data-testid="sheets-column-name-input"
                />
                <Input
                  value={sheetConfig.column_mapping?.phone || ""}
                  onChange={(event) =>
                    setSheetConfig((prev) => ({
                      ...prev,
                      column_mapping: { ...prev.column_mapping, phone: event.target.value },
                    }))
                  }
                  placeholder="Column for Phone"
                  data-testid="sheets-column-phone-input"
                />
                <Input
                  value={sheetConfig.column_mapping?.email || ""}
                  onChange={(event) =>
                    setSheetConfig((prev) => ({
                      ...prev,
                      column_mapping: { ...prev.column_mapping, email: event.target.value },
                    }))
                  }
                  placeholder="Column for Email"
                  data-testid="sheets-column-email-input"
                />
                <Input
                  value={sheetConfig.column_mapping?.source || ""}
                  onChange={(event) =>
                    setSheetConfig((prev) => ({
                      ...prev,
                      column_mapping: { ...prev.column_mapping, source: event.target.value },
                    }))
                  }
                  placeholder="Column for Source"
                  data-testid="sheets-column-source-input"
                />

                <Button type="submit" className="bg-slate-900 hover:bg-slate-800" data-testid="sheets-save-config-button">
                  Save Mapping
                </Button>
              </form>

              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={runSheetOAuth}
                  variant="outline"
                  className="gap-2 border-emerald-300 text-emerald-700"
                  data-testid="sheets-connect-oauth-button"
                >
                  <ShieldCheck className="h-4 w-4" /> Connect Google OAuth
                </Button>
                <Button
                  onClick={importLeadsFromSheets}
                  className="gap-2 bg-slate-900 hover:bg-slate-800"
                  data-testid="sheets-import-leads-button"
                >
                  <RefreshCw className="h-4 w-4" /> Import Leads Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {loading && (
        <div className="fixed bottom-5 right-5 rounded-md bg-slate-900 px-4 py-2 text-sm text-white" data-testid="global-loading-indicator">
          Loading CRM data...
        </div>
      )}
    </div>
  );
};

const MetricCard = ({ title, value, testId }) => (
  <Card data-testid={testId}>
    <CardContent className="p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-slate-500" data-testid={`${testId}-label`}>
        {title}
      </p>
      <p className="text-3xl font-semibold text-slate-900" data-testid={`${testId}-value`}>
        {value}
      </p>
    </CardContent>
  </Card>
);

const StageList = ({ title, rows, testId }) => (
  <div className="rounded-md border border-slate-200" data-testid={testId}>
    <div className="border-b border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-700">{title}</div>
    <div className="space-y-1 p-2">
      {rows.map((stage) => (
        <div key={stage.id} className="flex items-center justify-between rounded-md bg-white px-3 py-2 text-sm">
          <span data-testid={`${testId}-name-${stage.id}`}>{stage.name}</span>
          <span className="text-xs text-slate-500" data-testid={`${testId}-order-${stage.id}`}>
            Order {stage.order}
          </span>
        </div>
      ))}
      {rows.length === 0 && (
        <p className="p-2 text-xs text-slate-500" data-testid={`${testId}-empty`}>
          No stages yet.
        </p>
      )}
    </div>
  </div>
);
