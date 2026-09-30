import { formatLKR } from "@/lib/shop/format";
import type { DaySeries } from "@/lib/admin/analytics";

// Server-rendered SVG bar chart of daily revenue.
export default function RevenueChart({ data }: { data: DaySeries[] }) {
  const max = Math.max(1, ...data.map((d) => d.revenue));
  const W = 720;
  const H = 200;
  const pad = { l: 8, r: 8, t: 12, b: 26 };
  const inner = W - pad.l - pad.r;
  const step = inner / data.length;
  const barW = Math.max(2, step * 0.68);
  const labelEvery = Math.ceil(data.length / 8);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Revenue by day">
      {[0.25, 0.5, 0.75, 1].map((f) => (
        <line key={f} x1={pad.l} x2={W - pad.r} y1={pad.t + (H - pad.t - pad.b) * (1 - f)} y2={pad.t + (H - pad.t - pad.b) * (1 - f)} stroke="currentColor" className="text-slate-200" strokeWidth="1" />
      ))}
      {data.map((d, i) => {
        const h = ((H - pad.t - pad.b) * d.revenue) / max;
        const x = pad.l + i * step + (step - barW) / 2;
        const y = H - pad.b - h;
        return (
          <g key={d.date}>
            <rect x={x} y={d.revenue > 0 ? y : H - pad.b - 1} width={barW} height={d.revenue > 0 ? Math.max(h, 2) : 1} rx="2" className={d.revenue > 0 ? "fill-accent" : "fill-slate-200"}>
              <title>{`${d.date}: ${formatLKR(d.revenue)} (${d.orders} order${d.orders === 1 ? "" : "s"})`}</title>
            </rect>
            {i % labelEvery === 0 && (
              <text x={x + barW / 2} y={H - 8} textAnchor="middle" className="fill-slate-400" fontSize="10">
                {d.date.slice(5)}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
