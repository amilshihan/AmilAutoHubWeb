// Client-safe types, defaults and normalisation for the General website settings.

export const DAY_KEYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type DayKey = (typeof DAY_KEYS)[number];
export const DAY_LABEL: Record<DayKey, string> = {
  mon: "Monday",
  tue: "Tuesday",
  wed: "Wednesday",
  thu: "Thursday",
  fri: "Friday",
  sat: "Saturday",
  sun: "Sunday",
};

export type HoursEntry = { closed: boolean; open: string; close: string };
export type PhoneEntry = { label: string; number: string };
export type EmailEntry = { label: string; address: string };

export const LANGUAGES = [
  { id: "en", label: "English" },
  { id: "si", label: "Sinhala (සිංහල)" },
  { id: "ta", label: "Tamil (தமிழ்)" },
] as const;
export type LanguageId = (typeof LANGUAGES)[number]["id"];

export const DATE_FORMATS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD", "DD MMM YYYY"] as const;
export type DateFormat = (typeof DATE_FORMATS)[number];
export const TIME_FORMATS = ["12h", "24h"] as const;
export type TimeFormat = (typeof TIME_FORMATS)[number];

export const TIME_ZONES = [
  { id: "Asia/Colombo", label: "Sri Lanka (Asia/Colombo, UTC+5:30)" },
  { id: "Asia/Kolkata", label: "India (Asia/Kolkata, UTC+5:30)" },
  { id: "Asia/Dubai", label: "Dubai (Asia/Dubai, UTC+4)" },
  { id: "Asia/Singapore", label: "Singapore (Asia/Singapore, UTC+8)" },
  { id: "Europe/London", label: "London (Europe/London)" },
  { id: "America/New_York", label: "New York (America/New_York)" },
  { id: "UTC", label: "UTC" },
] as const;

export type SiteSettings = {
  siteName: string;
  logoUrl: string;
  faviconUrl: string;
  siteUrl: string;
  legalName: string;
  registrationNumber: string;
  taxId: string;
  address: string;
  phones: PhoneEntry[];
  emails: EmailEntry[];
  showHours: boolean;
  hours: Record<DayKey, HoursEntry>;
  timeZone: string;
  defaultLanguage: LanguageId;
  dateFormat: DateFormat;
  timeFormat: TimeFormat;
  chatbotEnabled: boolean;
};

const defaultHours = (): Record<DayKey, HoursEntry> =>
  Object.fromEntries(DAY_KEYS.map((d) => [d, { closed: d === "sun", open: "09:00", close: "18:00" }])) as Record<DayKey, HoursEntry>;

export const DEFAULT_SITE_SETTINGS: SiteSettings = {
  siteName: "Amil Auto Hub",
  logoUrl: "",
  faviconUrl: "",
  siteUrl: "",
  legalName: "",
  registrationNumber: "",
  taxId: "",
  address: "",
  phones: [],
  emails: [],
  showHours: false,
  hours: defaultHours(),
  timeZone: "Asia/Colombo",
  defaultLanguage: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  chatbotEnabled: true,
};

const text = (v: unknown, max = 300) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const url = (v: unknown) => {
  const s = text(v, 1000);
  return /^https?:\/\//i.test(s) ? s : "";
};
const time = (v: unknown, fallback: string) => (typeof v === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(v) ? v : fallback);
const pick = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(v as T) ? (v as T) : fallback);

export const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const isValidTimeZone = (tz: string) => {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
};

// Turns a raw site_settings row (or null) into a complete, validated settings object.
export function normaliseSiteSettings(row: Record<string, unknown> | null | undefined): SiteSettings {
  const d = DEFAULT_SITE_SETTINGS;
  if (!row) return { ...d, hours: defaultHours() };

  const phones = (Array.isArray(row.phones) ? row.phones : [])
    .map((p) => ({ label: text((p as PhoneEntry)?.label, 40), number: text((p as PhoneEntry)?.number, 30) }))
    .filter((p) => p.number)
    .slice(0, 10);
  const emails = (Array.isArray(row.emails) ? row.emails : [])
    .map((e) => ({ label: text((e as EmailEntry)?.label, 40), address: text((e as EmailEntry)?.address, 120) }))
    .filter((e) => isValidEmail(e.address))
    .slice(0, 10);

  const rawHours = (row.business_hours ?? {}) as Record<string, Partial<HoursEntry>>;
  const hours = defaultHours();
  for (const day of DAY_KEYS) {
    const h = rawHours[day];
    if (h) hours[day] = { closed: h.closed === true, open: time(h.open, "09:00"), close: time(h.close, "18:00") };
  }

  const tz = text(row.time_zone, 60);
  return {
    siteName: text(row.site_name, 80) || d.siteName,
    logoUrl: url(row.logo_url),
    faviconUrl: url(row.favicon_url),
    siteUrl: url(row.site_url).replace(/\/$/, ""),
    legalName: text(row.legal_name, 120),
    registrationNumber: text(row.registration_number, 60),
    taxId: text(row.tax_id, 60),
    address: text(row.address, 300),
    phones,
    emails,
    showHours: row.show_hours === true,
    hours,
    timeZone: tz && isValidTimeZone(tz) ? tz : d.timeZone,
    defaultLanguage: pick(row.default_language, LANGUAGES.map((l) => l.id), d.defaultLanguage),
    dateFormat: pick(row.date_format, DATE_FORMATS, d.dateFormat),
    timeFormat: pick(row.time_format, TIME_FORMATS, d.timeFormat),
    chatbotEnabled: row.chatbot_enabled !== false,
  };
}

// Compact weekly hours for display, grouping consecutive days that share the same hours.
export function hoursSummary(hours: Record<DayKey, HoursEntry>): { days: string; hours: string }[] {
  const to12 = (t: string) => {
    const [h, m] = t.split(":").map(Number);
    return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
  };
  const label = (h: HoursEntry) => (h.closed ? "Closed" : `${to12(h.open)} – ${to12(h.close)}`);
  const short = (d: DayKey) => DAY_LABEL[d].slice(0, 3);
  const groups: { from: DayKey; to: DayKey; text: string }[] = [];
  for (const d of DAY_KEYS) {
    const text = label(hours[d]);
    const last = groups[groups.length - 1];
    if (last && last.text === text) last.to = d;
    else groups.push({ from: d, to: d, text });
  }
  return groups.map((g) => ({ days: g.from === g.to ? short(g.from) : `${short(g.from)} – ${short(g.to)}`, hours: g.text }));
}
