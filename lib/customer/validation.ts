// Shared, dependency-free validation for customer registration/login. Kept in one place
// so the server action and any future form can agree on the rules.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

// Accepts a Sri Lankan mobile in local (077...) or international (+9477...) form.
export function isValidMobile(mobile: string): boolean {
  const digits = mobile.replace(/\D/g, "");
  return digits.length >= 9 && digits.length <= 12;
}

export function isValidPassword(password: string): boolean {
  return password.length >= 8 && password.length <= 200;
}
