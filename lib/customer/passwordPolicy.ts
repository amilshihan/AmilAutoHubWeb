// Password rules for customer accounts: length plus a "not guessable" check, rather than
// forcing symbols or digits. Applied whenever a password is created or changed.

export const MIN_PASSWORD_LENGTH = 10;
export const MAX_PASSWORD_LENGTH = 200;

// The most commonly used passwords (lower-case). Checked as-is and with trailing digits/symbols
// removed, so "Password123!" is caught as well as "password".
const COMMON = new Set(
  `password passw0rd p@ssword p@ssw0rd password1 password12 password123 password1234 qwerty qwerty123 qwertyuiop qwerty1234 asdfghjkl asdfghjkl1 zxcvbnm
  123456 1234567 12345678 123456789 1234567890 12345678910 0123456789 1q2w3e4r 1q2w3e4r5t 1qaz2wsx 1qazxsw2 zaq12wsx
  abc123 abcd1234 abcdefg abcdefgh abcdefghij letmein welcome welcome1 welcome123 admin admin123 administrator login master
  iloveyou iloveyou1 monkey dragon football baseball basketball cricket sunshine princess superman batman spiderman
  shadow trustno1 whatever freedom michael jordan hunter ranger tiger soccer charlie jessica jennifer ashley nicole
  changeme default guest user test test123 testing secret secret123 hello hello123 hellothere starwars pokemon
  srilanka srilanka123 colombo colombo123 lanka lanka123 kandy galle amil amil123 amilautohub autohub autohub123
  toyota toyota123 honda honda123 suzuki suzuki123 nissan nissan123 vehicle vehicle123 mechanic spareparts
  mypassword mypassword1 mypass mypass123 pass pass123 pass1234 passcode passkey 11111111 111111111 1111111111 00000000 000000000 0000000000 88888888 99999999
  aaaaaaaa aaaaaaaaaa bbbbbbbb qqqqqqqq zzzzzzzz 12341234 123123123 123321 654321 987654321 9876543210 147258369 159753 741852963`
    .split(/\s+/)
    .filter(Boolean)
);

const ROWS = ["qwertyuiop", "asdfghjkl", "zxcvbnm", "1234567890", "abcdefghijklmnopqrstuvwxyz"];

function isKeyboardRun(p: string): boolean {
  // A password that is just a run along a keyboard row or the alphabet/digits (either direction).
  return ROWS.some((row) => {
    const rev = [...row].reverse().join("");
    return p.length >= 8 && (row.includes(p) || rev.includes(p));
  });
}

export type PasswordContext = { email?: string; firstName?: string; lastName?: string; mobile?: string };

// Returns a message explaining what is wrong with the password, or null when it is acceptable.
export function passwordProblem(password: string, ctx: PasswordContext = {}): string | null {
  if (typeof password !== "string") return "Please enter a password.";
  if (password.length < MIN_PASSWORD_LENGTH) return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  if (password.length > MAX_PASSWORD_LENGTH) return `Password must be ${MAX_PASSWORD_LENGTH} characters or fewer.`;

  const lower = password.toLowerCase();
  const stripped = lower.replace(/[\d\W_]+$/g, "");
  if (COMMON.has(lower) || (stripped.length >= 4 && COMMON.has(stripped))) {
    return "That password is too common. Please choose something harder to guess.";
  }
  if (/^(.)\1+$/.test(password) || isKeyboardRun(lower)) {
    return "That password is too easy to guess. Try a few unrelated words or a longer phrase.";
  }

  const digits = (s?: string) => (s ?? "").replace(/\D/g, "");
  const parts = [ctx.email?.split("@")[0], ctx.firstName, ctx.lastName].filter((x): x is string => Boolean(x && x.length >= 4)).map((x) => x.toLowerCase());
  if (parts.some((x) => lower.includes(x))) return "Your password shouldn't contain your name or email address.";
  const mobile = digits(ctx.mobile).slice(-9);
  if (mobile.length >= 9 && digits(password).includes(mobile)) return "Your password shouldn't contain your phone number.";

  return null;
}
