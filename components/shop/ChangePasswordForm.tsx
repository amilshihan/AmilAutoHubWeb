"use client";

import { useState, useTransition } from "react";
import { changePassword } from "@/app/(shop)/account/security/actions";

const field =
  "w-full rounded-lg border border-charcoal/20 bg-white px-3.5 py-2.5 text-sm text-charcoal focus:border-charcoal focus:outline-none focus:ring-2 focus:ring-amil/50";
const label = "mb-1 block text-sm font-bold text-charcoal";

export default function ChangePasswordForm() {
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      const result = await changePassword(current, next);
      if (result.ok) {
        setMessage({ kind: "ok", text: "Password updated." });
        setCurrent("");
        setNext("");
      } else {
        setMessage({ kind: "error", text: result.error });
      }
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={`sm:col-span-2 text-sm font-semibold ${message.kind === "ok" ? "text-stock" : "text-deal"}`}>
          {message.text}
        </p>
      )}
      <div>
        <label htmlFor="currentPassword" className={label}>
          Current password
        </label>
        <input id="currentPassword" type="password" required autoComplete="current-password" className={field} value={current} onChange={(e) => setCurrent(e.target.value)} />
      </div>
      <div>
        <label htmlFor="newPassword" className={label}>
          New password
        </label>
        <input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          placeholder="At least 8 characters"
          className={field}
          value={next}
          onChange={(e) => setNext(e.target.value)}
        />
      </div>
      <button type="submit" disabled={pending} className="sm:col-span-2 rounded-lg bg-charcoal px-5 py-2.5 text-sm font-bold text-white hover:bg-charcoal-soft disabled:opacity-60">
        {pending ? "Saving..." : "Change password"}
      </button>
    </form>
  );
}
