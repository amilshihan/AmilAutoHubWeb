import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isActiveStaff } from "@/lib/permissions";
import { previewOrderEmail } from "@/lib/email/orderEmail";
import type { OrderEmailKind } from "@/lib/email/templates";

export const dynamic = "force-dynamic";

const KINDS: OrderEmailKind[] = ["placed", "invoice", "confirmed", "packed", "dispatched", "delivered", "cancelled", "paid", "refunded", "tracking"];

// Staff-only: shows exactly what a customer email looks like for a real order. Sends nothing.
export async function GET(request: NextRequest) {
  const { profile } = await getCurrentUserAndProfile();
  if (!isActiveStaff(profile)) return new NextResponse("Not allowed", { status: 403 });

  const order = request.nextUrl.searchParams.get("order");
  const kind = request.nextUrl.searchParams.get("kind") ?? "placed";
  if (!order || !KINDS.includes(kind as OrderEmailKind)) return new NextResponse("Use ?order=<order number>&kind=<" + KINDS.join("|") + ">", { status: 400 });

  const preview = await previewOrderEmail(order, kind as OrderEmailKind);
  if (!preview) return new NextResponse("Order not found", { status: 404 });

  return new NextResponse(preview.html, {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "X-Email-Subject": encodeURIComponent(preview.subject), "X-Email-To": encodeURIComponent(preview.to) },
  });
}
