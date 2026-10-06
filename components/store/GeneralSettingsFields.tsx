"use client";

import { cardSurface, fieldLabel, helperText, inputBase, sectionTitle } from "@/lib/ui";
import { makeFormatters } from "@/lib/shop/datetime";
import {
  DATE_FORMATS,
  DAY_KEYS,
  DAY_LABEL,
  LANGUAGES,
  TIME_FORMATS,
  TIME_ZONES,
  type DateFormat,
  type DayKey,
  type HoursEntry,
  type LanguageId,
  type SiteSettings,
  type TimeFormat,
} from "@/lib/shop/site-settings-types";
import SiteImageUploader from "@/components/store/SiteImageUploader";

const rowBtn = "text-sm font-semibold text-error hover:underline";
const addBtn = "rounded-lg border border-btn-secondary-border bg-white px-3 py-2 text-sm font-semibold text-btn-secondary-text hover:bg-surface";

export default function GeneralSettingsFields({
  site,
  onChange,
  siteUrlHint,
  nowIso,
  chatbotReady,
}: {
  site: SiteSettings;
  onChange: (patch: Partial<SiteSettings>) => void;
  siteUrlHint: string;
  nowIso: string;
  chatbotReady: boolean;
}) {
  const setHours = (day: DayKey, patch: Partial<HoursEntry>) => onChange({ hours: { ...site.hours, [day]: { ...site.hours[day], ...patch } } });
  const preview = (() => {
    try {
      const f = makeFormatters({ timeZone: site.timeZone, dateFormat: site.dateFormat, timeFormat: site.timeFormat });
      return f.dateTime(nowIso);
    } catch {
      return "";
    }
  })();

  return (
    <div className="space-y-5">
      <div className={`${cardSurface} space-y-3 p-5`}>
        <h2 className={sectionTitle}>Chat assistant</h2>
        <label className={`flex items-start gap-3 ${chatbotReady ? "cursor-pointer" : "opacity-60"}`}>
          <input
            type="checkbox"
            checked={site.chatbotEnabled}
            disabled={!chatbotReady}
            onChange={(e) => onChange({ chatbotEnabled: e.target.checked })}
            className="mt-1 h-4 w-4 accent-primary"
          />
          <span>
            <span className="block text-sm font-semibold text-ink">Show the chat assistant on the website</span>
            <span className={helperText}>
              The chat button that helps customers find parts, check orders and get delivery or return answers. Turn it off and the button disappears and the
              assistant stops answering (and stops using the AI). Takes effect within about 30 seconds. The Ask Amil page is not affected.
            </span>
          </span>
        </label>
        {!chatbotReady && (
          <p className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs text-amber-900">
            This switch needs <code className="rounded bg-amber-100 px-1">supabase/migrations/0040_chatbot_switch.sql</code> to be run in the Supabase SQL editor first.
          </p>
        )}
      </div>

      <div className={`${cardSurface} space-y-5 p-5`}>
        <h2 className={sectionTitle}>Website identity</h2>
        <div>
          <label className={fieldLabel} htmlFor="site-name">
            Website name
          </label>
          <input id="site-name" className={`${inputBase} mt-1`} value={site.siteName} maxLength={80} onChange={(e) => onChange({ siteName: e.target.value })} />
          <p className={`${helperText} mt-1`}>Shown in the browser tab, search results, footer and copyright line.</p>
        </div>
        <div>
          <p className={fieldLabel}>Logo</p>
          <div className="mt-1">
            <SiteImageUploader kind="logo" value={site.logoUrl} onChange={(url) => onChange({ logoUrl: url })} maxMb={2} hint="PNG with a transparent background works best (under 2MB). Shown in the header and footer." />
          </div>
        </div>
        <div>
          <p className={fieldLabel}>Favicon</p>
          <div className="mt-1">
            <SiteImageUploader kind="favicon" value={site.faviconUrl} onChange={(url) => onChange({ faviconUrl: url })} maxMb={1} hint="A square PNG, at least 64 × 64 pixels (under 1MB). Shown in the browser tab." />
          </div>
        </div>
        <div>
          <label className={fieldLabel} htmlFor="site-url">
            Website URL
          </label>
          <input id="site-url" className={`${inputBase} mt-1`} placeholder={siteUrlHint} value={site.siteUrl} onChange={(e) => onChange({ siteUrl: e.target.value })} />
          <p className={`${helperText} mt-1`}>
            The public address, for example https://www.amilautohub.com. Used for search-engine links. Payment and Google sign-in return addresses
            still come from the NEXT_PUBLIC_SITE_URL server setting.
          </p>
        </div>
      </div>

      <div className={`${cardSurface} space-y-5 p-5`}>
        <h2 className={sectionTitle}>Business details</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={fieldLabel} htmlFor="legal-name">
              Registered business name
            </label>
            <input id="legal-name" className={`${inputBase} mt-1`} value={site.legalName} onChange={(e) => onChange({ legalName: e.target.value })} />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="reg-no">
              Business registration number
            </label>
            <input id="reg-no" className={`${inputBase} mt-1`} value={site.registrationNumber} onChange={(e) => onChange({ registrationNumber: e.target.value })} />
          </div>
          <div>
            <label className={fieldLabel} htmlFor="tax-id">
              Tax / VAT number
            </label>
            <input id="tax-id" className={`${inputBase} mt-1`} value={site.taxId} onChange={(e) => onChange({ taxId: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <label className={fieldLabel} htmlFor="biz-address">
              Business address
            </label>
            <textarea id="biz-address" rows={2} className={`${inputBase} mt-1`} value={site.address} onChange={(e) => onChange({ address: e.target.value })} />
            <p className={`${helperText} mt-1`}>Shown in the footer and on the Contact page. Leave blank to use the address from the POS settings.</p>
          </div>
        </div>
        <p className={helperText}>The registration and tax numbers appear in the website footer when filled in.</p>
      </div>

      <div className={`${cardSurface} space-y-5 p-5`}>
        <h2 className={sectionTitle}>Contact numbers &amp; emails</h2>
        <div>
          <p className={fieldLabel}>Contact numbers</p>
          <p className={helperText}>The first number is the main shop phone. Leave empty to use the phone from the POS settings. The WhatsApp number is set below.</p>
          <div className="mt-2 space-y-2">
            {site.phones.map((p, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Phone label"
                  className={`${inputBase} w-40`}
                  placeholder="Label (e.g. Sales)"
                  value={p.label}
                  onChange={(e) => onChange({ phones: site.phones.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })}
                />
                <input
                  aria-label="Phone number"
                  className={`${inputBase} min-w-48 flex-1`}
                  placeholder="077 370 0001"
                  value={p.number}
                  onChange={(e) => onChange({ phones: site.phones.map((x, j) => (j === i ? { ...x, number: e.target.value } : x)) })}
                />
                <button type="button" className={rowBtn} onClick={() => onChange({ phones: site.phones.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </div>
            ))}
            {site.phones.length < 10 && (
              <button type="button" className={addBtn} onClick={() => onChange({ phones: [...site.phones, { label: "", number: "" }] })}>
                + Add number
              </button>
            )}
          </div>
        </div>
        <div>
          <p className={fieldLabel}>Email addresses</p>
          <div className="mt-2 space-y-2">
            {site.emails.map((e, i) => (
              <div key={i} className="flex flex-wrap items-center gap-2">
                <input
                  aria-label="Email label"
                  className={`${inputBase} w-40`}
                  placeholder="Label (e.g. Support)"
                  value={e.label}
                  onChange={(ev) => onChange({ emails: site.emails.map((x, j) => (j === i ? { ...x, label: ev.target.value } : x)) })}
                />
                <input
                  aria-label="Email address"
                  type="email"
                  className={`${inputBase} min-w-48 flex-1`}
                  placeholder="info@example.com"
                  value={e.address}
                  onChange={(ev) => onChange({ emails: site.emails.map((x, j) => (j === i ? { ...x, address: ev.target.value } : x)) })}
                />
                <button type="button" className={rowBtn} onClick={() => onChange({ emails: site.emails.filter((_, j) => j !== i) })}>
                  Remove
                </button>
              </div>
            ))}
            {site.emails.length < 10 && (
              <button type="button" className={addBtn} onClick={() => onChange({ emails: [...site.emails, { label: "", address: "" }] })}>
                + Add email
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={`${cardSurface} space-y-4 p-5`}>
        <h2 className={sectionTitle}>Business hours</h2>
        <label className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-ink">
          <input type="checkbox" checked={site.showHours} onChange={(e) => onChange({ showHours: e.target.checked })} className="h-4 w-4 accent-primary" />
          Show business hours on the website (footer and Contact page)
        </label>
        <div className="space-y-2">
          {DAY_KEYS.map((day) => {
            const h = site.hours[day];
            return (
              <div key={day} className="flex flex-wrap items-center gap-3">
                <span className="w-24 text-sm font-semibold text-ink">{DAY_LABEL[day]}</span>
                <label className="flex items-center gap-1.5 text-sm text-ink">
                  <input type="checkbox" checked={h.closed} onChange={(e) => setHours(day, { closed: e.target.checked })} className="h-4 w-4 accent-primary" />
                  Closed
                </label>
                <input type="time" aria-label={`${DAY_LABEL[day]} opens`} disabled={h.closed} className={`${inputBase} w-32`} value={h.open} onChange={(e) => setHours(day, { open: e.target.value })} />
                <span className="text-muted">to</span>
                <input type="time" aria-label={`${DAY_LABEL[day]} closes`} disabled={h.closed} className={`${inputBase} w-32`} value={h.close} onChange={(e) => setHours(day, { close: e.target.value })} />
              </div>
            );
          })}
        </div>
      </div>

      <div className={`${cardSurface} space-y-5 p-5`}>
        <h2 className={sectionTitle}>Regional settings</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className={fieldLabel} htmlFor="tz">
              Time zone
            </label>
            <select id="tz" className={`${inputBase} mt-1`} value={site.timeZone} onChange={(e) => onChange({ timeZone: e.target.value })}>
              {TIME_ZONES.map((z) => (
                <option key={z.id} value={z.id}>
                  {z.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="currency">
              Currency
            </label>
            <input id="currency" className={`${inputBase} mt-1 bg-surface`} value="LKR - Sri Lankan Rupee" disabled />
            <p className={`${helperText} mt-1`}>All prices are stored in rupees. Visitors can view converted amounts with the currency switcher.</p>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="lang">
              Language
            </label>
            <select id="lang" className={`${inputBase} mt-1`} value={site.defaultLanguage} onChange={(e) => onChange({ defaultLanguage: e.target.value as LanguageId })}>
              {LANGUAGES.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.label}
                </option>
              ))}
            </select>
            <p className={`${helperText} mt-1`}>Sets the language of the site for browsers and search engines. The site text itself is in English.</p>
          </div>
          <div>
            <label className={fieldLabel} htmlFor="date-format">
              Date format
            </label>
            <select id="date-format" className={`${inputBase} mt-1`} value={site.dateFormat} onChange={(e) => onChange({ dateFormat: e.target.value as DateFormat })}>
              {DATE_FORMATS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className={fieldLabel}>Time format</p>
            <div className="mt-2 flex gap-4">
              {TIME_FORMATS.map((f) => (
                <label key={f} className="flex items-center gap-2 text-sm text-ink">
                  <input type="radio" name="time-format" checked={site.timeFormat === f} onChange={() => onChange({ timeFormat: f as TimeFormat })} className="h-4 w-4 accent-primary" />
                  {f === "12h" ? "12-hour (3:30 PM)" : "24-hour (15:30)"}
                </label>
              ))}
            </div>
          </div>
        </div>
        {preview && <p className={helperText}>Example with the current time: {preview}</p>}
        <p className={helperText}>Dates and times in the customer account and order pages follow these settings.</p>
      </div>
    </div>
  );
}
