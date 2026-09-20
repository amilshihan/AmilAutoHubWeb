export type UserRole = "admin" | "cashier";

export interface Profile {
  id: string;
  full_name: string;
  role: UserRole;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

// Untyped client: table shapes are defined by the shared Supabase database (see supabase/migrations).
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Database = any;
