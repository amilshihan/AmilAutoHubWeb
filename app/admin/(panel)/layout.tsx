import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUserAndProfile } from "@/lib/auth";
import { isActiveStaff, isAdmin } from "@/lib/permissions";
import { createClient } from "@/lib/supabase/server";
import AdminNav from "@/components/admin/AdminNav";
import SignOutButton from "@/components/admin/SignOutButton";

export const metadata = { title: "Website Admin | Amil Auto Hub", robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, profile } = await getCurrentUserAndProfile();
  if (!user) redirect("/admin/login");

  if (!isActiveStaff(profile)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface px-4">
        <div className="max-w-sm rounded-xl border border-card bg-white p-6 text-center">
          <h1 className="text-lg font-bold text-ink">No access</h1>
          <p className="mt-2 text-sm text-muted">
            This account isn&apos;t an active staff member. Ask an administrator to enable it in the POS.
          </p>
          <div className="mt-4">
            <SignOutButton variant="light" />
          </div>
        </div>
      </div>
    );
  }

  const admin = isAdmin(profile);

  // Two-factor sign-in: once a staff member has turned it on, a password-only session is sent to
  // enter their code first. Admins who haven't turned it on yet see a banner (or are sent to set
  // it up when ADMIN_MFA_REQUIRED=1 is set on the server).
  const supabase = await createClient();
  const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const mfaEnrolled = aal?.nextLevel === "aal2";
  if (mfaEnrolled && aal?.currentLevel !== "aal2") redirect("/admin/mfa");
  if (admin && !mfaEnrolled && process.env.ADMIN_MFA_REQUIRED === "1") redirect("/admin/mfa-setup");

  return (
    <div className="min-h-screen flex bg-surface">
      <aside className="w-60 shrink-0 bg-primary text-slate-200 flex flex-col print:hidden">
        <div className="px-5 py-5 border-b border-white/10">
          <div className="font-bold text-white text-lg">Website Admin</div>
          <div className="text-xs text-slate-400 mt-0.5">
            {profile?.full_name ?? user.email} · {admin ? "Admin" : "Staff"}
          </div>
        </div>
        <AdminNav admin={admin} />
        <div className="mt-auto space-y-3 p-4 border-t border-white/10">
          <Link href="/" target="_blank" className="block text-sm font-medium text-slate-300 hover:text-white transition">
            View website ↗
          </Link>
          <Link href="/admin/mfa-setup" className="block text-sm font-medium text-slate-300 hover:text-white transition">
            Two-factor sign-in
          </Link>
          <SignOutButton />
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        {admin && !mfaEnrolled && (
          <div role="status" className="border-b border-amber-300 bg-amber-50 px-6 py-2.5 text-sm text-amber-900 print:hidden">
            Your account isn&apos;t protected by two-factor sign-in yet.{" "}
            <Link href="/admin/mfa-setup" className="font-bold underline">
              Set it up now
            </Link>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
