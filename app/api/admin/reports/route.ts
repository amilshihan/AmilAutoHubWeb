import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isAdmin } from "@/lib/permissions";
import { loadDashboardData } from "@/lib/admin/dashboardData";
import { buildReport, isReportId, parseRange, toCsv } from "@/lib/admin/reports";

export const dynamic = "force-dynamic";

// CSV download for the admin Reports page. Contains cost and customer data, so admins only.
export async function GET(request: NextRequest) {
  const { profile } = await getCurrentUserAndProfile();
  if (!isAdmin(profile)) return new NextResponse("Not allowed", { status: 403 });

  const params = request.nextUrl.searchParams;
  const reportId = params.get("report") ?? undefined;
  if (!isReportId(reportId)) return new NextResponse("Unknown report", { status: 400 });

  const now = Date.now();
  const range = parseRange(params.get("from") ?? undefined, params.get("to") ?? undefined, now);
  const raw = await loadDashboardData(await createClient(), { sinceIso: range.sinceIso, untilIso: range.untilIso, admin: true });
  const table = buildReport(reportId, { ...raw, nowMs: now, from: range.from, to: range.to });

  return new NextResponse(toCsv(table), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="amil-${reportId}-${range.from}_to_${range.to}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
