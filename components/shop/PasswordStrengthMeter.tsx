"use client";

import { passwordStrength, type StrengthLevel } from "@/lib/customer/passwordStrength";
import type { PasswordContext } from "@/lib/customer/passwordPolicy";

const COLOR: Record<StrengthLevel, string> = {
  0: "bg-charcoal/10",
  1: "bg-red-500",
  2: "bg-amber-500",
  3: "bg-lime-500",
  4: "bg-green-600",
};
const TEXT: Record<StrengthLevel, string> = {
  0: "text-charcoal/50",
  1: "text-red-600",
  2: "text-amber-700",
  3: "text-lime-700",
  4: "text-green-700",
};

// Four-segment bar that fills as the password gets stronger: Poor, Average, Good, Strong.
export default function PasswordStrengthMeter({ password, context }: { password: string; context?: PasswordContext }) {
  const { level, label, hint } = passwordStrength(password, context);

  return (
    <div className="mt-2" aria-live="polite">
      <div className="flex gap-1.5" aria-hidden="true">
        {[1, 2, 3, 4].map((segment) => (
          <span key={segment} className={`h-1.5 flex-1 rounded-full transition-colors ${level >= segment ? COLOR[level] : "bg-charcoal/10"}`} />
        ))}
      </div>
      <p className={`mt-1.5 text-xs ${TEXT[level]}`}>
        {level === 0 ? (
          "Use at least 10 characters. A few unrelated words works well."
        ) : (
          <>
            <span className="font-bold">{label}</span>
            <span className="sr-only"> password strength.</span> {hint}
          </>
        )}
      </p>
    </div>
  );
}
