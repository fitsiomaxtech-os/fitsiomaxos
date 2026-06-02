import { useCallback, useEffect, useMemo, useState } from "react";
import {
  BarChart3, FileSpreadsheet, Layers, Users, Target,
  Plus, RefreshCw, Trash2, Link as LinkIcon, ArrowRightLeft, X,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "@/components/ui/sonner";
import {
  mkDashboard, mkGetDistribution, mkPatchDistribution, mkRefreshDistribution,
  mkGetTeam, mkCreateTeamMember, mkAllLeads, mkAssignLead, mkDeleteLead, mkBulkDelete,
  mkGetSources, mkCreateSource, mkUpdateSource, mkDeleteSource, mkSyncSource,
  mkPerformance,
} from "@/lib/api";
import { MaskedContact } from "@/components/MaskedContact";
import { SourcePill } from "@/components/marketing/SourcePill";

const SUB_TABS = [
  { key: "overview", label: "Overview", icon: BarChart3 },
  { key: "lead_sources", label: "Lead Sources", icon: FileSpreadsheet },
  { key: "all_leads", label: "All Leads", icon: Layers },
  { key: "team", label: "Team & Distribution", icon: Users },
  { key: "performance", label: "Performance", icon: Target },
];

const KPI = ({ label, value, accent, testid }) => (
  <div className={`rounded-xl border ${accent} p-4`} data-testid={testid}>
    <p className="text-xs font-medium text-slate-500">{label}</p>
    <p className="mt-1 text-3xl font-bold text-slate-900">{value}</p>
  </div>
);

const TabBtn = ({ active, label, Icon, onClick, testid }) => (
  <button
    onClick={onClick}
    data-testid={testid}
    className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition ${active ? "bg-sky-600 text-white shadow" : "text-slate-600 hover:bg-slate-100"}`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

// ============ Overview ============

const OverviewTab = ({ branches }) => {
  const [data, setData] = useState(null);
  useEffect(() => {
    mkDashboard().then(setData).catch(() => toast.error("Failed to load dashboard"));
  }, []);
  if (!data) return <p className="text-sm text-slate-500" data-testid="mk-overview-loading">Loading...</p>;
  const k = data.kpis;
  const maxBy = Math.max(...(data.by_source.map((r) => r.count) || [1]), 1);
  return (
    <div className="space-y-5" data-testid="mk-overview-tab">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <KPI label="Pre-Sales Leads" value={k.pre_sales_leads} accent="border-amber-200 bg-amber-50" testid="mk-kpi-presales" />
        <KPI label="Sales Leads" value={k.sales_leads} accent="border-green-200 bg-green-50" testid="mk-kpi-sales" />
        <KPI label="Active Sources" value={k.active_sources} accent="border-blue-200 bg-blue-50" testid="mk-kpi-sources" />
        <KPI label="Conversion Rate" value={`${k.conversion_rate}%`} accent="border-purple-200 bg-purple-50" testid="mk-kpi-conversion" />
      </div>

      <Card data-testid="mk-by-source-card">
        <CardHeader><CardTitle className="text-base">Leads by Source</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {data.by_source.length === 0 ? (
            <p className="text-sm text-slate-500">No leads yet.</p>
          ) : data.by_source.map((row) => (
            <div key={row.source} className="flex items-center gap-2">
              <div className="w-32 shrink-0"><SourcePill source={row.source} /></div>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-sky-500" style={{ width: `${(row.count / maxBy) * 100}%` }} />
              </div>
              <span className="w-10 text-right text-xs font-semibold text-slate-700">{row.count}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card data-testid="mk-recent-leads-card">
        <CardHeader><CardTitle className="text-base">Recent Leads</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-auto">
            <table className="min-w-full text-xs">
              <thead className="bg-slate-50 text-left text-slate-500">
                <tr><th className="px-3 py-2">Name</th><th className="px-3 py-2">Source</th><th className="px-3 py-2">Stage</th><th className="px-3 py-2">Assigned</th><th className="px-3 py-2">Branch</th><th className="px-3 py-2">Created</th></tr>
              </thead>
              <tbody>
                {data.recent_leads.map((l) => (
                  <tr key={l.id} className="border-t border-slate-100" data-testid={`mk-recent-row-${l.id}`}>
                    <td className="px-3 py-2 font-medium text-slate-800">{l.name}</td>
                    <td className="px-3 py-2"><SourcePill source={l.source_tab || l.source_type} /></td>
                    <td className="px-3 py-2 text-slate-600">{l.stage}</td>
                    <td className="px-3 py-2 text-slate-600">{l.assigned_user_name || "—"}</td>
                    <td className="px-3 py-2 text-slate-500">{branches.find((b) => b.id === l.branch_id)?.branch_name || "—"}</td>
                    <td className="px-3 py-2 text-slate-400">{(l.created_at || "").slice(0, 10)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============ Sources ============

const SourcesTab = () => {
  const [sources, setSources] = useState([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showSync, setShowSync] = useState(null);
  const [showMap, setShowMap] = useState(null);
  const [form, setForm] = useState({ name: "", sheet_url: "", source_type: "google_sheets", headers: "" });
  const [syncRows, setSyncRows] = useState(`[\n  {"name":"Aarav Sharma","phone":"9000000001","email":"aarav@example.com","city":"Chennai","condition":"Lower back pain","age":34},\n  {"name":"Meera Iyer","phone":"9000000002","email":"meera@example.com","city":"Coimbatore","condition":"Knee pain","age":28}\n]`);
  const [syncResult, setSyncResult] = useState(null);

  const load = useCallback(() => mkGetSources().then(setSources).catch((e) => console.warn("[load failed]", e?.message || e)), []);
  useEffect(() => { load(); }, [load]);

  const submit = async () => {
    if (!form.name.trim()) { toast.error("Source name required"); return; }
    const headers = form.headers.split(",").map((h) => h.trim()).filter(Boolean);
    try {
      await mkCreateSource({ name: form.name, sheet_url: form.sheet_url, source_type: form.source_type, headers });
      toast.success("Source added");
      setForm({ name: "", sheet_url: "", source_type: "google_sheets", headers: "" });
      setShowAdd(false);
      load();
    } catch (e) { toast.error(e?.response?.data?.detail || "Create failed"); }
  };

  const runSync = async () => {
    try {
      const rows = JSON.parse(syncRows);
      if (!Array.isArray(rows)) { toast.error("JSON must be an array of objects"); return; }
      const res = await mkSyncSource(showSync.id, rows);
      setSyncResult(res);
      if (res.imported > 0) {
        toast.success(`Imported ${res.imported} · skipped ${res.skipped} (received ${res.rows_received}). Refresh Pre-Sales CRM to see them.`);
      } else {
        toast.error(`No leads imported. ${res.skipped_no_phone || 0} missing phone · ${res.skipped_duplicate || 0} duplicate. See details panel.`);
      }
      load();
    } catch (e) {
      if (e instanceof SyntaxError) { toast.error("Invalid JSON. Paste rows as a [ { ... }, ... ] array."); return; }
      toast.error(e?.response?.data?.detail || "Sync failed");
    }
  };

  const toggleActive = async (s) => {
    await mkUpdateSource(s.id, { is_active: !s.is_active });
    load();
  };

  const remove = async (id) => {
    if (!window.confirm("Delete this source?")) return;
    await mkDeleteSource(id);
    load();
  };

  return (
    <div className="space-y-4" data-testid="mk-sources-tab">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600">Connect data feeds. Paste sheet headers to auto-detect column mappings.</p>
        <Button onClick={() => setShowAdd(true)} data-testid="mk-add-source-btn"><Plus className="mr-1 h-4 w-4" />Add Source</Button>
      </div>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {sources.map((s) => (
          <Card key={s.id} data-testid={`mk-source-card-${s.id}`} className="border-slate-200">
            <CardHeader className="flex flex-row items-start justify-between gap-2">
              <div>
                <CardTitle className="text-base">{s.name}</CardTitle>
                <div className="mt-1 flex items-center gap-2">
                  <SourcePill source={s.source_type} />
                  <span className={`inline-flex h-5 items-center rounded-full px-2 text-[10px] font-semibold ${s.is_active ? "bg-green-100 text-green-700" : "bg-slate-200 text-slate-600"}`}>{s.is_active ? "Active" : "Inactive"}</span>
                </div>
              </div>
              <button onClick={() => remove(s.id)} className="text-slate-400 hover:text-red-500" data-testid={`mk-source-delete-${s.id}`}><Trash2 className="h-4 w-4" /></button>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-slate-600">
              {s.sheet_url && <p className="truncate"><LinkIcon className="mr-1 inline h-3 w-3" />{s.sheet_url}</p>}
              <p>Rows: <span className="font-semibold">{s.row_count || 0}</span> · Last sync: {s.last_synced ? s.last_synced.slice(0, 16).replace("T", " ") : "Never"}</p>
              <p>Mappings: <span className="font-semibold">{Object.keys(s.column_mapping || {}).length}</span> · Custom fields: {(s.custom_fields || []).length}</p>
              <div className="flex flex-wrap gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => setShowSync(s)} data-testid={`mk-source-sync-${s.id}`}><RefreshCw className="mr-1 h-3 w-3" />Sync Now</Button>
                <Button size="sm" variant="outline" onClick={() => setShowMap(s)} data-testid={`mk-source-map-${s.id}`}>Edit Mapping</Button>
                <Button size="sm" variant="outline" onClick={() => toggleActive(s)} data-testid={`mk-source-toggle-${s.id}`}>{s.is_active ? "Deactivate" : "Activate"}</Button>
              </div>
            </CardContent>
          </Card>
        ))}
        {sources.length === 0 && <p className="col-span-full text-sm text-slate-400">No sources yet. Click <span className="font-semibold">Add Source</span> to begin.</p>}
      </div>

      {showAdd && (
        <DialogShell title="Add Lead Source" onClose={() => setShowAdd(false)} testid="mk-add-source-dialog">
          <Input placeholder="Source name (e.g. Meta Ads, Walk-ins)" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="mk-add-source-name" />
          <select className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm" value={form.source_type} onChange={(e) => setForm({ ...form, source_type: e.target.value })} data-testid="mk-add-source-type">
            {["meta", "seo", "referral", "walk_in", "website", "csv_import", "google_sheets", "other"].map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
          <Input placeholder="Google Sheet URL (optional)" value={form.sheet_url} onChange={(e) => setForm({ ...form, sheet_url: e.target.value })} data-testid="mk-add-source-url" />
          <Input placeholder="Headers (comma separated, e.g. Lead Name, Mobile, Email)" value={form.headers} onChange={(e) => setForm({ ...form, headers: e.target.value })} data-testid="mk-add-source-headers" />
          <p className="text-xs text-slate-400">Headers will be auto-mapped to standard fields (name, phone, email, vertical, condition, age, preferred_branch, budget, notes).</p>
          <Button onClick={submit} className="w-full" data-testid="mk-add-source-submit">Create Source</Button>
        </DialogShell>
      )}

      {showSync && (
        <DialogShell title={`Sync: ${showSync.name}`} onClose={() => { setShowSync(null); setSyncResult(null); }} testid="mk-sync-dialog">
          <p className="text-xs text-slate-500">Paste JSON rows from your Google Sheet (each row = one object). Phones are deduped by last 10 digits. New leads land in <span className="font-semibold">Pre-Sales CRM</span> + Marketing Board → All Leads with auto round-robin if enabled.</p>
          <textarea
            value={syncRows}
            onChange={(e) => setSyncRows(e.target.value)}
            className="h-48 w-full rounded-md border border-slate-200 p-2 font-mono text-xs"
            data-testid="mk-sync-rows-textarea"
          />
          <Button onClick={runSync} className="w-full" data-testid="mk-sync-submit"><RefreshCw className="mr-1 h-4 w-4" />Run Sync</Button>
          {syncResult && (
            <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-xs space-y-1" data-testid="mk-sync-result">
              <p><span className="font-semibold text-emerald-600">{syncResult.imported}</span> imported · <span className="font-semibold text-amber-600">{syncResult.skipped_no_phone || 0}</span> missing phone · <span className="font-semibold text-slate-600">{syncResult.skipped_duplicate || 0}</span> duplicates (of <span className="font-semibold">{syncResult.rows_received}</span> rows)</p>
              <p className="text-slate-500">Phone column used: <code className="rounded bg-slate-200 px-1 text-[10px]">{syncResult.phone_column_used}</code></p>
              {syncResult.mapping_used && Object.keys(syncResult.mapping_used).length > 0 && (
                <p className="text-slate-500">Field mapping: {Object.entries(syncResult.mapping_used).map(([k, v]) => <code key={k} className="mr-1 rounded bg-slate-200 px-1 text-[10px]">{k}={v}</code>)}</p>
              )}
              {(syncResult.sample_errors || []).length > 0 && (
                <ul className="ml-3 list-disc text-red-600">
                  {syncResult.sample_errors.map((m, i) => <li key={i}>{m}</li>)}
                </ul>
              )}
            </div>
          )}
        </DialogShell>
      )}

      {showMap && (
        <MappingEditor source={showMap} onClose={() => setShowMap(null)} onSaved={() => { setShowMap(null); load(); }} />
      )}
    </div>
  );
};

const STANDARD_FIELDS = ["name", "phone", "email", "vertical", "condition", "age", "preferred_branch", "budget", "notes"];

const MappingEditor = ({ source, onClose, onSaved }) => {
  const [mapping, setMapping] = useState(source.column_mapping || {});
  const headers = source.headers_detected || [];

  const setStd = (std, header) => {
    const next = { ...mapping };
    if (header === "__skip__") delete next[std]; else next[std] = header;
    setMapping(next);
  };

  const save = async () => {
    try {
      await mkUpdateSource(source.id, { column_mapping: mapping });
      toast.success("Mapping saved");
      onSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  return (
    <DialogShell title={`Mapping: ${source.name}`} onClose={onClose} testid="mk-map-dialog">
      {headers.length === 0 && <p className="text-xs text-amber-600">No headers detected — add them when creating the source.</p>}
      {STANDARD_FIELDS.map((std) => (
        <div key={std} className="flex items-center gap-2">
          <label className="w-32 text-xs font-medium text-slate-600">{std}</label>
          <select
            className="h-9 flex-1 rounded-md border border-slate-200 px-3 text-sm"
            value={mapping[std] || "__skip__"}
            onChange={(e) => setStd(std, e.target.value)}
            data-testid={`mk-map-${std}`}
          >
            <option value="__skip__">— Skip —</option>
            {headers.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>
        </div>
      ))}
      <Button onClick={save} className="w-full" data-testid="mk-map-save">Save Mapping</Button>
    </DialogShell>
  );
};

// ============ All Leads ============

const AllLeadsTab = ({ team }) => {
  const [filter, setFilter] = useState({ stage_type: "all", source: "", assigned_to: "", search: "" });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ rows: [], total: 0, page: 1, page_size: 50 });
  const [selected, setSelected] = useState({});

  const load = useCallback(async () => {
    const res = await mkAllLeads({ ...filter, page, page_size: 50 });
    setData(res);
    setSelected({});
  }, [filter, page]);

  useEffect(() => { load(); }, [load]);

  const selectedIds = useMemo(() => Object.entries(selected).filter(([, v]) => v).map(([k]) => k), [selected]);

  const reassign = async (leadId, userId) => {
    if (!userId) return;
    try { await mkAssignLead(leadId, userId); toast.success("Reassigned"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Reassign failed"); }
  };

  const remove = async (leadId) => {
    if (!window.confirm("Delete this lead?")) return;
    try { await mkDeleteLead(leadId); toast.success("Lead deleted"); load(); }
    catch (e) { toast.error(e?.response?.data?.detail || "Delete failed"); }
  };

  const bulkRemove = async () => {
    if (selectedIds.length === 0) return;
    if (!window.confirm(`Delete ${selectedIds.length} leads?`)) return;
    await mkBulkDelete(selectedIds);
    toast.success(`Deleted ${selectedIds.length}`);
    load();
  };

  const everyone = [...(team.pre_sales || []), ...(team.sales || [])];

  return (
    <div className="space-y-3" data-testid="mk-all-leads-tab">
      <div className="grid gap-2 sm:grid-cols-5">
        <select className="h-9 rounded-md border border-slate-200 px-3 text-sm" value={filter.stage_type} onChange={(e) => { setPage(1); setFilter({ ...filter, stage_type: e.target.value }); }} data-testid="mk-filter-stage">
          <option value="all">All Stages</option>
          <option value="pre_sales">Pre-Sales</option>
          <option value="sales">Sales</option>
        </select>
        <Input placeholder="Source name" value={filter.source} onChange={(e) => { setPage(1); setFilter({ ...filter, source: e.target.value }); }} data-testid="mk-filter-source" />
        <select className="h-9 rounded-md border border-slate-200 px-3 text-sm" value={filter.assigned_to} onChange={(e) => { setPage(1); setFilter({ ...filter, assigned_to: e.target.value }); }} data-testid="mk-filter-assigned">
          <option value="">All Assignees</option>
          {everyone.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
        </select>
        <Input placeholder="Search name/phone/email" value={filter.search} onChange={(e) => { setPage(1); setFilter({ ...filter, search: e.target.value }); }} data-testid="mk-filter-search" />
        <div className="flex gap-2">
          <Button variant="outline" onClick={load} data-testid="mk-leads-refresh"><RefreshCw className="h-4 w-4" /></Button>
          {selectedIds.length > 0 && <Button variant="outline" className="border-red-200 text-red-600" onClick={bulkRemove} data-testid="mk-leads-bulk-delete"><Trash2 className="mr-1 h-4 w-4" />Delete ({selectedIds.length})</Button>}
        </div>
      </div>

      <div className="overflow-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-xs">
          <thead className="bg-slate-50 text-left text-slate-500">
            <tr>
              <th className="px-2 py-2 w-8"><input type="checkbox" onChange={(e) => { const v = e.target.checked; const next = {}; data.rows.forEach((r) => { next[r.id] = v; }); setSelected(next); }} data-testid="mk-leads-select-all" /></th>
              <th className="px-3 py-2">Name</th>
              <th className="px-3 py-2">Contact</th>
              <th className="px-3 py-2">Source</th>
              <th className="px-3 py-2">Stage</th>
              <th className="px-3 py-2">Assigned</th>
              <th className="px-3 py-2">Created</th>
              <th className="px-3 py-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((l) => (
              <tr key={l.id} className="border-t border-slate-100" data-testid={`mk-lead-row-${l.id}`}>
                <td className="px-2 py-2"><input type="checkbox" checked={!!selected[l.id]} onChange={(e) => setSelected({ ...selected, [l.id]: e.target.checked })} data-testid={`mk-lead-select-${l.id}`} /></td>
                <td className="px-3 py-2 font-medium text-slate-800">{l.name}</td>
                <td className="px-3 py-2"><MaskedContact phone={l.phone} email={l.email} locked={l.stage === "Lost"} /></td>
                <td className="px-3 py-2"><SourcePill source={l.source_tab || l.source_type} /></td>
                <td className="px-3 py-2 text-slate-600">{l.stage}</td>
                <td className="px-3 py-2">
                  <select className="h-7 rounded border border-slate-200 px-1 text-[11px]" value={l.assigned_user_id || ""} onChange={(e) => reassign(l.id, e.target.value)} data-testid={`mk-lead-reassign-${l.id}`}>
                    <option value="">— Unassigned —</option>
                    {everyone.map((u) => <option key={u.id} value={u.id}>{u.full_name}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2 text-slate-400">{(l.created_at || "").slice(0, 10)}</td>
                <td className="px-3 py-2"><button onClick={() => remove(l.id)} className="text-red-500 hover:text-red-700" data-testid={`mk-lead-delete-${l.id}`}><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
            {data.rows.length === 0 && <tr><td colSpan="8" className="px-3 py-6 text-center text-slate-400">No leads match these filters.</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Showing {data.rows.length} of {data.total}</span>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} data-testid="mk-leads-prev">Prev</Button>
          <span className="px-2 py-1">Page {data.page}</span>
          <Button size="sm" variant="outline" disabled={data.rows.length < data.page_size} onClick={() => setPage((p) => p + 1)} data-testid="mk-leads-next">Next</Button>
        </div>
      </div>
    </div>
  );
};

// ============ Team & Distribution ============

const TeamTab = ({ team, reloadTeam, branches }) => {
  const [settings, setSettings] = useState(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ full_name: "", email: "", password: "", team_type: "pre_sales", branch_id: "" });

  const loadSettings = useCallback(() => mkGetDistribution().then(setSettings).catch((e) => console.warn("[load failed]", e?.message || e)), []);
  useEffect(() => { loadSettings(); }, [loadSettings]);

  const patch = async (updates) => {
    const next = await mkPatchDistribution(updates);
    setSettings(next);
  };

  const refresh = async () => {
    const next = await mkRefreshDistribution();
    setSettings(next);
    toast.success("Teams refreshed");
    reloadTeam();
  };

  const submit = async () => {
    if (!form.full_name || !form.email || !form.password) { toast.error("Name, email, password required"); return; }
    const payload = { full_name: form.full_name, email: form.email, password: form.password, team_type: form.team_type };
    if (form.team_type === "branch_admin" && form.branch_id) payload.branch_id = form.branch_id;
    try {
      await mkCreateTeamMember(payload);
      toast.success("Team member created");
      setShowAdd(false);
      setForm({ full_name: "", email: "", password: "", team_type: "pre_sales", branch_id: "" });
      reloadTeam();
    } catch (e) { toast.error(e?.response?.data?.detail || "Create failed"); }
  };

  if (!settings) return <p className="text-sm text-slate-500">Loading...</p>;

  return (
    <div className="space-y-5" data-testid="mk-team-tab">
      <Card data-testid="mk-distribution-card">
        <CardHeader><CardTitle className="text-base">Distribution Settings</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-700">Auto-Distribute New Leads</p>
              <p className="text-xs text-slate-500">Apply round-robin to leads synced from any source.</p>
            </div>
            <label className="inline-flex cursor-pointer items-center gap-2" data-testid="mk-dist-enabled">
              <input type="checkbox" checked={!!settings.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="h-4 w-4" />
              <span className="text-xs font-medium">{settings.enabled ? "ON" : "OFF"}</span>
            </label>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-slate-700">Type:</label>
            <label className="inline-flex items-center gap-1 text-xs"><input type="radio" checked={settings.distribution_type === "round_robin"} onChange={() => patch({ distribution_type: "round_robin" })} data-testid="mk-dist-round-robin" />Round Robin</label>
            <label className="inline-flex items-center gap-1 text-xs"><input type="radio" checked={settings.distribution_type === "manual"} onChange={() => patch({ distribution_type: "manual" })} data-testid="mk-dist-manual" />Manual Only</label>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={refresh} data-testid="mk-dist-refresh"><RefreshCw className="mr-1 h-4 w-4" />Refresh Team from Users</Button>
            <Button size="sm" onClick={() => setShowAdd(true)} data-testid="mk-add-team-btn"><Plus className="mr-1 h-4 w-4" />Add Team Member</Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <TeamCard title="Pre-Sales (Tier 1)" members={team.pre_sales || []} kind="pre_sales" />
        <TeamCard title="Sales — Branch Admins (Tier 2)" members={team.sales || []} kind="sales" />
      </div>

      {showAdd && (
        <DialogShell title="Add Team Member" onClose={() => setShowAdd(false)} testid="mk-add-team-dialog">
          <Input placeholder="Full name" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} data-testid="mk-add-team-name" />
          <Input placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} data-testid="mk-add-team-email" />
          <Input type="password" placeholder="Password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} data-testid="mk-add-team-pwd" />
          <select className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm" value={form.team_type} onChange={(e) => setForm({ ...form, team_type: e.target.value })} data-testid="mk-add-team-type">
            <option value="pre_sales">Pre-Sales</option>
            <option value="branch_admin">Branch Admin (Sales)</option>
          </select>
          {form.team_type === "branch_admin" && (
            <select className="h-9 w-full rounded-md border border-slate-200 px-3 text-sm" value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })} data-testid="mk-add-team-branch">
              <option value="">Select branch</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.branch_name}</option>)}
            </select>
          )}
          <Button onClick={submit} className="w-full" data-testid="mk-add-team-submit">Create</Button>
        </DialogShell>
      )}
    </div>
  );
};

const TeamCard = ({ title, members, kind }) => (
  <Card data-testid={`mk-team-${kind}-card`}>
    <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
    <CardContent className="space-y-2">
      {members.length === 0 ? <p className="text-xs text-slate-400">No members.</p> : members.map((m) => (
        <div key={m.id} className="flex items-center justify-between rounded-md border border-slate-200 p-2" data-testid={`mk-team-row-${m.id}`}>
          <div>
            <p className="text-sm font-medium text-slate-800">{m.full_name}</p>
            <p className="text-[11px] text-slate-500">{m.email}</p>
          </div>
          <div className="text-right text-[11px] text-slate-600">
            <p><span className="font-semibold">{m.current_leads}</span> current · <span className="font-semibold">{m.deals_closed}</span> closed</p>
            <p className="text-emerald-600">{m.conversion_rate}% conv.</p>
          </div>
        </div>
      ))}
    </CardContent>
  </Card>
);

// ============ Performance ============

const PerformanceTab = () => {
  const [data, setData] = useState(null);
  useEffect(() => { mkPerformance().then(setData).catch((e) => console.warn("[load failed]", e?.message || e)); }, []);
  if (!data) return <p className="text-sm text-slate-500">Loading...</p>;

  const maxFunnel = Math.max(...data.funnel.map((r) => r.count), 1);
  const maxPre = Math.max(...data.leads_per_pre_sales.map((r) => r.count), 1);
  const maxSales = Math.max(...data.deals_per_sales.map((r) => r.count), 1);

  const Row = ({ label, count, total, color }) => (
    <div className="flex items-center gap-2">
      <div className="w-44 truncate text-xs text-slate-600">{label}</div>
      <div className="h-3 flex-1 overflow-hidden rounded bg-slate-100">
        <div className={`h-full rounded ${color}`} style={{ width: `${(count / total) * 100}%` }} />
      </div>
      <div className="w-10 text-right text-xs font-semibold">{count}</div>
    </div>
  );

  return (
    <div className="grid gap-4 lg:grid-cols-2" data-testid="mk-performance-tab">
      <Card><CardHeader><CardTitle className="text-base">Conversion Funnel</CardTitle></CardHeader><CardContent className="space-y-2">
        {data.funnel.map((r) => <Row key={r.stage} label={r.stage} count={r.count} total={maxFunnel} color="bg-sky-500" />)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Leads per Pre-Sales Agent</CardTitle></CardHeader><CardContent className="space-y-2">
        {data.leads_per_pre_sales.length === 0 ? <p className="text-xs text-slate-400">No data.</p> : data.leads_per_pre_sales.map((r) => <Row key={r.name} label={r.name} count={r.count} total={maxPre} color="bg-amber-500" />)}
      </CardContent></Card>
      <Card><CardHeader><CardTitle className="text-base">Deals Closed per Sales (Branch Admin)</CardTitle></CardHeader><CardContent className="space-y-2">
        {data.deals_per_sales.length === 0 ? <p className="text-xs text-slate-400">No data.</p> : data.deals_per_sales.map((r) => <Row key={r.name} label={r.name} count={r.count} total={maxSales} color="bg-green-500" />)}
      </CardContent></Card>
    </div>
  );
};

// ============ Dialog shell ============

const DialogShell = ({ title, onClose, children, testid }) => (
  <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4" data-testid={testid}>
    <div className="w-full max-w-md space-y-3 rounded-lg bg-white p-5 shadow-xl">
      <div className="flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600" data-testid="mk-dialog-close"><X className="h-4 w-4" /></button>
      </div>
      {children}
    </div>
  </div>
);

// ============ Root ============

export const MarketingBoard = ({ branches = [] }) => {
  const [tab, setTab] = useState("overview");
  const [team, setTeam] = useState({ pre_sales: [], sales: [] });
  const reloadTeam = useCallback(() => mkGetTeam().then(setTeam).catch((e) => console.warn("[load failed]", e?.message || e)), []);
  useEffect(() => { reloadTeam(); }, [reloadTeam]);

  return (
    <div className="space-y-4" data-testid="marketing-board">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Marketing Board</h2>
        <p className="text-sm text-slate-500">Source leads, distribute them, and track team performance.</p>
      </div>
      <div className="flex flex-wrap gap-2 border-b border-slate-200 pb-2" data-testid="mk-subtabs">
        {SUB_TABS.map((t) => (
          <TabBtn key={t.key} active={tab === t.key} label={t.label} Icon={t.icon} onClick={() => setTab(t.key)} testid={`mk-subtab-${t.key}`} />
        ))}
      </div>
      {tab === "overview" && <OverviewTab branches={branches} />}
      {tab === "lead_sources" && <SourcesTab />}
      {tab === "all_leads" && <AllLeadsTab team={team} />}
      {tab === "team" && <TeamTab team={team} reloadTeam={reloadTeam} branches={branches} />}
      {tab === "performance" && <PerformanceTab />}
    </div>
  );
};

export default MarketingBoard;
