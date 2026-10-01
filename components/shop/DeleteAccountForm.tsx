"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteAccount } from "@/app/(shop)/account/security/actions";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export default function DeleteAccountForm({ requiresPassword }: { requiresPassword: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (confirmText.trim().toUpperCase() !== "DELETE") {
      setError('Please type "DELETE" to confirm.');
      return;
    }
    startTransition(async () => {
      const result = await deleteAccount(password);
      if (result.ok) {
        router.push("/");
        router.refresh();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      {error && (
        <p role="alert" className="text-sm font-semibold text-deal">
          {error}
        </p>
      )}
      {requiresPassword && (
        <div>
          <label htmlFor="deletePassword" className={label}>
            Password
          </label>
          <input
            id="deletePassword"
            type="password"
            required
            autoComplete="current-password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
      )}
      <div>
        <label htmlFor="confirmDelete" className={label}>
          Type DELETE to confirm
        </label>
        <input id="confirmDelete" required className={field} value={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-lg border border-deal bg-deal-soft px-5 py-2.5 text-sm font-bold text-deal hover:bg-deal hover:text-white disabled:opacity-60"
      >
        {pending ? "Deleting..." : "Delete my account"}
      </button>
    </form>
  );
}
