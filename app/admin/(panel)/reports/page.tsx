import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { loadDashboardData } from "@/lib/admin/dashboardData";
import { REPORTS, buildReport, isReportId, parseRange } from "@/lib/admin/reports";
import { nowMs } from "@/lib/admin/time";
import { btnPrimary, cardSurface, inputBase } from "@/lib/ui";

const PREVIEW_ROWS = 200;

export default async function ReportsPage({ searchParams }: { searchParams: Promise<{ report?: string; from?: string; to?: string }> }) {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) redirect("/admin");

  const sp = await searchParams;
  const reportId = isReportId(sp.report) ? sp.report : "sales-by-day";
  const now = nowMs();
  const range = parseRange(sp.from, sp.to, now);

  const supabase = await createClient();
  const raw = await loadDashboardData(supabase, { sinceIso: range.sinceIso, untilIso: range.untilIso, admin: true });
  const table = buildReport(reportId, { ...raw, nowMs: now, from: range.from, to: range.to });

  const query = (id: string) => `?report=${id}&from=${range.from}&to=${range.to}`;
  const csvHref = `/api/admin/reports${query(reportId)}`;
  const snapshot = reportId === "stock" || reportId === "low-stock";
  const shown = table.rows.slice(0, PREVIEW_ROWS);

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-ink">Reports</h1>
        <p className="mt-1 text-sm text-muted">Pick a report and a date range, preview it here, and download it as a CSV for Excel.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {REPORTS.map((r) => (
          <Link
            key={r.id}
            href={query(r.id)}
            className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
              r.id === reportId ? "border-primary bg-primary text-white" : "border-btn-secondary-border bg-white text-btn-secondary-text hover:bg-surface"
            }`}
          >
            {r.title}
          </Link>
        ))}
      </div>

      <form method="get" className="flex flex-wrap items-end gap-3">
        <input type="hidden" name="report" value={reportId} />
        <label className="text-sm font-semibold text-ink">
          From
          <input type="date" name="from" defaultValue={range.from} className={`${inputBase} mt-1`} />
        </label>
        <label className="text-sm font-semibold text-ink">
          To
          <input type="date" name="to" defaultValue={range.to} className={`${inputBase} mt-1`} />
        </label>
        <button type="submit" className={btnPrimary}>
          Apply
        </button>
        <a href={csvHref} className="inline-flex items-center rounded-lg border border-btn-secondary-border bg-white px-4 py-2.5 text-sm font-semibold text-btn-secondary-text hover:bg-surface">
          Download CSV
        </a>
      </form>

      {raw.unavailable.length > 0 && (
        <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Some data could not be read: {raw.unavailable.join(", ")}.
        </p>
      )}

      <div className={`${cardSurface} overflow-hidden`}>
        <div className="border-b border-card px-5 py-3">
          <h2 className="font-semibold text-ink">{table.title}</h2>
          <p className="text-xs text-muted">
            {table.description} {snapshot ? "Current stock, not affected by the date range." : `${range.from} to ${range.to} (Sri Lanka time).`} {table.rows.length} row
            {table.rows.length === 1 ? "" : "s"}.
          </p>
        </div>
        {table.rows.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted">Nothing to show for this period.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
                  {table.columns.map((c) => (
                    <th key={c} className="whitespace-nowrap px-4 py-2.5 font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {shown.map((row, i) => (
                  <tr key={i} className="border-b border-card last:border-0">
                    {row.map((cell, j) => (
                      <td key={j} className={`px-4 py-2 ${typeof cell === "number" ? "text-right tabular-nums" : "text-ink"}`}>
                        {typeof cell === "number" ? cell.toLocaleString("en-LK") : (cell ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {table.rows.length > PREVIEW_ROWS && (
          <p className="border-t border-card px-5 py-2.5 text-xs text-muted">
            Showing the first {PREVIEW_ROWS} of {table.rows.length} rows. Download the CSV for all of them.
          </p>
        )}
      </div>
    </div>
  );
}
