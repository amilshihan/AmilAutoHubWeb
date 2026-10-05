import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { ttlCache } from "@/lib/shop/cache";
import { makeFormatters, type Formatters } from "@/lib/shop/datetime";
import { DEFAULT_SITE_SETTINGS, normaliseSiteSettings, type SiteSettings } from "@/lib/shop/site-settings-types";

// Falls back to the built-in defaults until migration 0037 has been applied.
export const getSiteSettings = ttlCache<SiteSettings>(30_000, async () => {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin.from("site_settings").select("*").maybeSingle();
    if (error) return normaliseSiteSettings(null);
    return normaliseSiteSettings(data as Record<string, unknown> | null);
  } catch {
    return normaliseSiteSettings(null);
  }
});

export async function getFormatters(): Promise<Formatters> {
  const s = await getSiteSettings();
  return makeFormatters({ timeZone: s.timeZone, dateFormat: s.dateFormat, timeFormat: s.timeFormat });
}

export { DEFAULT_SITE_SETTINGS };
