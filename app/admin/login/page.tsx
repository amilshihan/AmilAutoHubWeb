"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { btnPrimary, fieldLabel, inputBase } from "@/lib/ui";

export default function AdminLoginPage() {
  const router = useRouter();
  const supabase = createClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Incorrect email or password. Please try again.");
      return;
    }
    router.push("/admin/orders");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-ink">Amil Auto Hub</h1>
          <p className="text-muted mt-1">Website admin · sign in with your staff account</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-sm border border-card p-6 space-y-4">
          {error && <div role="alert" className="rounded-lg bg-error-light text-error text-sm px-3 py-2">{error}</div>}

          <div>
            <label htmlFor="email" className={fieldLabel}>
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`${inputBase} mt-1`}
              autoComplete="email"
            />
          </div>

          <div>
            <label htmlFor="password" className={fieldLabel}>
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={`${inputBase} mt-1`}
              autoComplete="current-password"
            />
          </div>

          <button type="submit" disabled={loading} className={`${btnPrimary} w-full`}>
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
