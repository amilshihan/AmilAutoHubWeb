// A rough, client-friendly password strength estimate for the meter shown while someone types a
// new password. It is guidance only: the real rules are enforced by passwordProblem() on the server.

import { passwordProblem, type PasswordContext } from "@/lib/customer/passwordPolicy";

export type StrengthLevel = 0 | 1 | 2 | 3 | 4;
export type Strength = { level: StrengthLevel; label: "" | "Poor" | "Average" | "Good" | "Strong"; hint: string };

const HINTS: Record<1 | 2 | 3 | 4, string> = {
  1: "Add more characters, or use a few unrelated words.",
  2: "A longer phrase would make it stronger.",
  3: "A few more characters would make it strong.",
  4: "Hard to guess. Nice work.",
};
const LABELS = { 1: "Poor", 2: "Average", 3: "Good", 4: "Strong" } as const;

export function passwordStrength(password: string, ctx: PasswordContext = {}): Strength {
  if (!password) return { level: 0, label: "", hint: "" };

  // Anything the server would refuse (too short, too common, contains your name...) is "Poor".
  const problem = passwordProblem(password, ctx);
  if (problem) return { level: 1, label: "Poor", hint: problem };

  const pool =
    (/[a-z]/.test(password) ? 26 : 0) + (/[A-Z]/.test(password) ? 26 : 0) + (/\d/.test(password) ? 10 : 0) + (/[^A-Za-z0-9]/.test(password) ? 33 : 0);
  const unique = new Set(password).size;
  // Repeated characters add little, so they count for less than new ones.
  const effectiveLength = unique + (password.length - unique) * 0.3;
  let bits = effectiveLength * Math.log2(Math.max(pool, 2));

  // Common human habits are easier to guess than the raw numbers suggest.
  if (/^[A-Za-z]+\d{1,6}[^A-Za-z0-9]{0,3}$/.test(password)) bits *= 0.65; // word + digits (+ symbol)
  if (/(19|20)\d{2}/.test(password)) bits -= 8; // a year
  if (/(.)\1{2,}/.test(password)) bits -= 6; // aaa

  const level: 1 | 2 | 3 | 4 = bits < 36 ? 1 : bits < 52 ? 2 : bits < 70 ? 3 : 4;
  return { level, label: LABELS[level], hint: HINTS[level] };
}
