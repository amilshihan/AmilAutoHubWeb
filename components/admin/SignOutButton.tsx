"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function SignOutButton({ variant = "dark" }: { variant?: "dark" | "light" }) {
  const router = useRouter();
  const supabase = createClient();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/admin/login");
    router.refresh();
  }

  return (
    <button
      onClick={handleSignOut}
      className={
        variant === "dark"
          ? "w-full text-left text-sm font-medium text-slate-300 hover:text-white transition"
          : "rounded-lg border border-card px-4 py-2 text-sm font-semibold text-ink hover:bg-surface"
      }
    >
      Sign out
    </button>
  );
}
