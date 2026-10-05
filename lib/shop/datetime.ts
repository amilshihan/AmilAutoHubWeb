// Date/time formatting driven by the General settings (time zone, date and time format).
// Pure and client-safe; output is identical on server and client for the same settings.

import type { DateFormat, TimeFormat } from "@/lib/shop/site-settings-types";

export type FormatConfig = { timeZone: string; dateFormat: DateFormat; timeFormat: TimeFormat };

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function makeFormatters(cfg: FormatConfig) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: cfg.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

  const utcParts = new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

  function read(iso: string | number | Date) {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const dateOnly = typeof iso === "string" && /^\d{4}-\d{2}-\d{2}$/.test(iso);
    const o: Record<string, string> = {};
    for (const p of (dateOnly ? utcParts : parts).formatToParts(d)) o[p.type] = p.value;
    return { y: o.year, m: o.month, d: o.day, h: Number(o.hour), min: o.minute };
  }

  const date = (iso: string | number | Date) => {
    const p = read(iso);
    if (!p) return "";
    switch (cfg.dateFormat) {
      case "MM/DD/YYYY":
        return `${p.m}/${p.d}/${p.y}`;
      case "YYYY-MM-DD":
        return `${p.y}-${p.m}-${p.d}`;
      case "DD MMM YYYY":
        return `${p.d} ${MONTHS[Number(p.m) - 1]} ${p.y}`;
      default:
        return `${p.d}/${p.m}/${p.y}`;
    }
  };

  const time = (iso: string | number | Date) => {
    const p = read(iso);
    if (!p) return "";
    if (cfg.timeFormat === "24h") return `${String(p.h).padStart(2, "0")}:${p.min}`;
    return `${p.h % 12 || 12}:${p.min} ${p.h < 12 ? "AM" : "PM"}`;
  };

  return { date, time, dateTime: (iso: string | number | Date) => `${date(iso)}, ${time(iso)}` };
}

export type Formatters = ReturnType<typeof makeFormatters>;
