import type { Profile } from "@/lib/database.types";

export function isAdmin(profile: Profile | null | undefined): boolean {
  return profile?.role === "admin" && profile.is_active;
}

export function isActiveStaff(profile: Profile | null | undefined): boolean {
  return Boolean(profile?.is_active);
}
