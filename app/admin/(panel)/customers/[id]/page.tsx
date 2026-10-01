import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { computeAccountOrderStats, type OrderRow } from "@/lib/admin/analytics";
import { formatDate, formatDateTime, formatLKR } from "@/lib/shop/format";
import { ACTIVITY_EVENT_LABEL, CONSENT_TYPE_LABEL, ORDER_STATUS_LABEL, type OrderStatus } from "@/lib/shop/config";
import { cardSurface, helperText } from "@/lib/ui";
import CustomerCrmForm from "@/components/admin/CustomerCrmForm";
import { getCustomerFitmentHistory } from "@/lib/customer/fitmentHistory";
import { getCustomerConsents } from "@/lib/customer/marketingConsent";
import { getCustomerLoyalty } from "@/lib/customer/loyalty";
import { getCustomerActivityLog } from "@/lib/customer/activityLog";

const CUSTOMER_TYPE_LABEL: Record<string, string> = {
  individual: "Individual",
  garage: "Garage",
  workshop: "Workshop",
  business: "Business",
  dealer: "Dealer",
  fleet: "Fleet",
};

const STATUS_LABEL: Record<string, string> = { active: "Active", suspended: "Suspended", deleted: "Deleted" };

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3 py-1.5">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}

export default async function AdminCustomerProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: row } = await supabase
    .from("customer_accounts")
    .select(
      "id, first_name, last_name, email, mobile, additional_mobiles, additional_emails, status, email_verified, mobile_verified, auth_provider, avatar_url, customer_type, notes, loyalty_points, tier, preferred_language, communication_preference, last_login_at, created_at"
    )
    .eq("id", id)
    .maybeSingle();

  if (!row) notFound();

  const { data: orders } = await supabase
    .from("online_orders")
    .select("id, order_number, status, total, subtotal, payment_method, created_at, customer_name, customer_phone, customer_email, customer_account_id, fulfilment")
    .order("created_at", { ascending: false })
    .limit(10000);

  const stats = computeAccountOrderStats((orders ?? []) as OrderRow[], {
    id: row.id,
    mobile: row.mobile,
    email: row.email,
    additionalMobiles: row.additional_mobiles ?? [],
    additionalEmails: row.additional_emails ?? [],
  });

  const fitmentHistory = await getCustomerFitmentHistory(row.id);
  const consents = await getCustomerConsents(row.id);
  const loyalty = await getCustomerLoyalty(row.id);
  const activityLog = await getCustomerActivityLog(row.id);

  return (
    <div className="p-6 space-y-5 max-w-4xl">
      <div>
        <Link href="/admin/customers" className="text-sm text-accent hover:underline">
          ← Customers
        </Link>
        <h1 className="mt-1 text-2xl font-bold text-ink">
          {row.first_name} {row.last_name}
        </h1>
        <p className="text-sm text-muted">Registered customer account</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Total orders</div>
          <div className="mt-1 text-2xl font-bold text-ink">{stats.totalOrders}</div>
        </div>
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Total spent</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatLKR(stats.totalSpent)}</div>
        </div>
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Lifetime value</div>
          <div className="mt-1 text-2xl font-bold tabular-nums text-ink">{formatLKR(stats.lifetimeValue)}</div>
        </div>
        <div className={`${cardSurface} p-5`}>
          <div className="text-sm text-muted">Last purchase</div>
          <div className="mt-1 text-lg font-bold text-ink">{stats.lastPurchaseDate ? formatDate(stats.lastPurchaseDate) : "—"}</div>
        </div>
      </div>

      <div className={`${cardSurface} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-ink">Customer profile</h2>
        <dl className="mt-3 divide-y divide-card text-sm">
          <Row label="Customer ID" value={<span className="font-mono text-xs">{row.id}</span>} />
          <Row label="Full name" value={`${row.first_name} ${row.last_name}`} />
          <Row label="Mobile numbers" value={[row.mobile, ...(row.additional_mobiles ?? [])].filter(Boolean).join(", ") || "Not provided"} />
          <Row label="Email addresses" value={[row.email, ...(row.additional_emails ?? [])].filter(Boolean).join(", ")} />
          <Row label="Preferred contact method" value={row.communication_preference ?? "Not set"} />
          <Row label="Preferred language" value={row.preferred_language ?? "Not set"} />
          <Row label="Customer type" value={CUSTOMER_TYPE_LABEL[row.customer_type] ?? row.customer_type} />
          <Row label="Customer tier" value={row.tier} />
          <Row label="Loyalty points" value={row.loyalty_points} />
          <Row label="Referral code" value={<span className="font-mono text-xs">{loyalty.referralCode}</span>} />
          <Row label="Referred by" value={loyalty.referredByName ?? "—"} />
          <Row label="Successful referrals" value={loyalty.referralCount} />
          <Row label="Registration date" value={formatDate(row.created_at)} />
          <Row label="Last login" value={row.last_login_at ? formatDateTime(row.last_login_at) : "—"} />
          <Row label="Account status" value={STATUS_LABEL[row.status] ?? row.status} />
        </dl>
      </div>

      <div className={`${cardSurface} p-5 sm:p-6`}>
        <h2 className="text-lg font-semibold text-ink">Maintain profile</h2>
        <p className={`${helperText} mt-1`}>Customer type, tier, loyalty points and internal notes — staff-managed, not shown to the customer.</p>
        <div className="mt-4">
          <CustomerCrmForm accountId={row.id} customerType={row.customer_type} tier={row.tier} loyaltyPoints={row.loyalty_points} notes={row.notes} />
        </div>
      </div>

      <div className={`${cardSurface} overflow-x-auto`}>
        <h2 className="p-5 pb-0 text-lg font-semibold text-ink">Order history</h2>
        <ul className="mt-3 divide-y divide-card">
          {stats.history.map((h) => (
            <li key={h.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-sm">
              <span className="font-semibold text-ink">#{h.orderNumber}</span>
              <span className="text-muted">{formatDate(h.createdAt)}</span>
              <span className="text-muted">{ORDER_STATUS_LABEL[h.status as OrderStatus] ?? h.status}</span>
              <span className="font-semibold tabular-nums">{formatLKR(h.total)}</span>
            </li>
          ))}
          {stats.history.length === 0 && <li className="px-5 py-8 text-center text-sm text-muted">No orders yet.</li>}
        </ul>
      </div>

      <div className={`${cardSurface} overflow-x-auto`}>
        <h2 className="p-5 pb-0 text-lg font-semibold text-ink">Vehicle fitment history</h2>
        <p className={`${helperText} px-5 pt-1`}>Products this customer bought for each of their registered vehicles — powers &quot;buy again&quot; and vehicle recommendations.</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Vehicle</th>
              <th className="px-3 py-3 font-semibold">Product</th>
              <th className="px-3 py-3 font-semibold">SKU</th>
              <th className="px-3 py-3 text-right font-semibold">Qty</th>
              <th className="px-5 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {fitmentHistory.map((h, idx) => (
              <tr key={idx} className="border-b border-card last:border-0">
                <td className="px-5 py-2.5 text-ink">{h.vehicleLabel}</td>
                <td className="px-3 py-2.5 text-ink">{h.productName}</td>
                <td className="px-3 py-2.5 text-muted">{h.sku ?? "-"}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{h.qty}</td>
                <td className="px-5 py-2.5 text-muted">{formatDate(h.purchasedAt)}</td>
              </tr>
            ))}
            {fitmentHistory.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No vehicle-tagged orders yet — the customer can pick a vehicle at checkout.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${cardSurface} overflow-x-auto`}>
        <h2 className="p-5 pb-0 text-lg font-semibold text-ink">Marketing consent</h2>
        <p className={`${helperText} px-5 pt-1`}>Captured separately from registration, in the customer&apos;s own Marketing preferences section.</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Channel</th>
              <th className="px-3 py-3 font-semibold">Status</th>
              <th className="px-3 py-3 font-semibold">Source</th>
              <th className="px-3 py-3 font-semibold">Consented</th>
              <th className="px-5 py-3 font-semibold">Withdrawn</th>
            </tr>
          </thead>
          <tbody>
            {consents.map((c) => (
              <tr key={c.consentType} className="border-b border-card last:border-0">
                <td className="px-5 py-2.5 text-ink">{CONSENT_TYPE_LABEL[c.consentType]}</td>
                <td className="px-3 py-2.5">
                  <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${c.status === "granted" ? "bg-green-100 text-green-800" : "bg-slate-100 text-slate-600"}`}>
                    {c.status === "granted" ? "Granted" : "Withdrawn"}
                  </span>
                </td>
                <td className="px-3 py-2.5 text-muted">{c.consentSource ?? "-"}</td>
                <td className="px-3 py-2.5 text-muted">{c.consentedAt ? formatDateTime(c.consentedAt) : "-"}</td>
                <td className="px-5 py-2.5 text-muted">{c.withdrawnAt ? formatDateTime(c.withdrawnAt) : "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={`${cardSurface} overflow-x-auto`}>
        <h2 className="p-5 pb-0 text-lg font-semibold text-ink">Loyalty transaction history</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-3 py-3 font-semibold">Description</th>
              <th className="px-3 py-3 font-semibold">Order</th>
              <th className="px-3 py-3 text-right font-semibold">Points</th>
              <th className="px-5 py-3 font-semibold">Date</th>
            </tr>
          </thead>
          <tbody>
            {loyalty.transactions.map((t) => (
              <tr key={t.id} className="border-b border-card last:border-0">
                <td className="px-5 py-2.5 text-ink capitalize">{t.type.replace("_", " ")}</td>
                <td className="px-3 py-2.5 text-muted">{t.description ?? "-"}</td>
                <td className="px-3 py-2.5 text-muted">{t.orderNumber ? `#${t.orderNumber}` : "-"}</td>
                <td className={`px-3 py-2.5 text-right tabular-nums font-semibold ${t.points > 0 ? "text-green-700" : "text-error"}`}>
                  {t.points > 0 ? "+" : ""}
                  {t.points}
                </td>
                <td className="px-5 py-2.5 text-muted">{formatDateTime(t.createdAt)}</td>
              </tr>
            ))}
            {loyalty.transactions.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No loyalty activity yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className={`${cardSurface} overflow-x-auto`}>
        <h2 className="p-5 pb-0 text-lg font-semibold text-ink">Activity / audit log</h2>
        <p className={`${helperText} px-5 pt-1`}>What happened, when, from where, and who did it — useful when investigating a dispute.</p>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="border-b border-card text-left text-xs uppercase tracking-wide text-muted">
              <th className="px-5 py-3 font-semibold">Event</th>
              <th className="px-3 py-3 font-semibold">Details</th>
              <th className="px-3 py-3 font-semibold">Actor</th>
              <th className="px-3 py-3 font-semibold">Source</th>
              <th className="px-5 py-3 font-semibold">Timestamp</th>
            </tr>
          </thead>
          <tbody>
            {activityLog.map((a) => (
              <tr key={a.id} className="border-b border-card last:border-0">
                <td className="px-5 py-2.5 text-ink">{ACTIVITY_EVENT_LABEL[a.eventType] ?? a.eventType}</td>
                <td className="px-3 py-2.5 text-muted">{a.description ?? "-"}</td>
                <td className="px-3 py-2.5 text-muted capitalize">
                  {a.actorType}
                  {a.actorName ? ` (${a.actorName})` : ""}
                </td>
                <td className="px-3 py-2.5 text-muted">{a.source ?? "-"}</td>
                <td className="px-5 py-2.5 text-muted">{formatDateTime(a.createdAt)}</td>
              </tr>
            ))}
            {activityLog.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-8 text-center text-muted">
                  No activity recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
