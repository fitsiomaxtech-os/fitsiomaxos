const PALETTE = {
  meta: "bg-amber-100 text-amber-700 border-amber-200",
  seo: "bg-green-100 text-green-700 border-green-200",
  referral: "bg-purple-100 text-purple-700 border-purple-200",
  walk_in: "bg-yellow-100 text-yellow-700 border-yellow-200",
  website: "bg-pink-100 text-pink-700 border-pink-200",
  csv_import: "bg-orange-100 text-orange-700 border-orange-200",
  google_sheets: "bg-emerald-100 text-emerald-700 border-emerald-200",
  google_sheet: "bg-emerald-100 text-emerald-700 border-emerald-200",
  other: "bg-slate-100 text-slate-700 border-slate-200",
  manual: "bg-slate-100 text-slate-700 border-slate-200",
  unknown: "bg-slate-100 text-slate-500 border-slate-200",
};

export const SourcePill = ({ source }) => {
  const key = (source || "unknown").toLowerCase();
  const cls = PALETTE[key] || PALETTE.unknown;
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`} data-testid={`source-pill-${key}`}>
      {source || "unknown"}
    </span>
  );
};

export default SourcePill;
