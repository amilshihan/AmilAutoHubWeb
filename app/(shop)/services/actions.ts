"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { SERVICE_GROUPS } from "@/lib/shop/services";
import { clientIp, rateLimit } from "@/lib/shop/rateLimit";

export type BookingInput = {
  name: string;
  phone: string;
  email: string;
  make: string;
  model: string;
  year: string;
  vehicleNumber: string;
  service: string;
  date: string;
  time: string;
  notes: string;
};

export type BookingResult =
  | { ok: true; bookingNumber: string }
  | { ok: false; error: string; unavailable?: boolean };

const TIMES = ["Any time", "Morning", "Afternoon"];
const clean = (s: unknown, max: number) => (typeof s === "string" ? s.trim().slice(0, max) : "");

export async function bookService(input: BookingInput): Promise<BookingResult> {
  const h = await headers();
  if (!(await rateLimit(`booking:${clientIp(h)}`, 5, 10 * 60_000))) {
    return { ok: false, error: "Too many requests. Please try again in a few minutes or book on WhatsApp." };
  }

  const name = clean(input.name, 80);
  const phone = clean(input.phone, 20);
  const email = clean(input.email, 120);
  const service = clean(input.service, 80);
  const digits = phone.replace(/\D/g, "");

  if (name.length < 2) return { ok: false, error: "Please enter your name." };
  if (digits.length < 9 || digits.length > 12) return { ok: false, error: "Please enter a valid phone number, e.g. 077 123 4567." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "That email address doesn't look right." };

  const offered = SERVICE_GROUPS.flatMap((g) => g.items.filter((i) => i.enabled).map((i) => i.name));
  if (!offered.includes(service)) return { ok: false, error: "Please choose a service." };

  let date: string | null = null;
  if (input.date) {
    const d = new Date(`${input.date}T00:00:00`);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const max = new Date(today.getTime() + 90 * 86400000);
    if (Number.isNaN(d.getTime()) || d < today || d > max) {
      return { ok: false, error: "Please choose a date within the next 90 days." };
    }
    date = input.date;
  }

  const year = Number(input.year);
  const time = TIMES.includes(input.time) ? input.time : "Any time";

  const { data, error } = await createAdminClient()
    .from("service_bookings")
    .insert({
      customer_name: name,
      customer_phone: phone,
      customer_email: email || null,
      vehicle_make: clean(input.make, 40) || null,
      vehicle_model: clean(input.model, 40) || null,
      vehicle_year: Number.isInteger(year) && year > 1950 && year < 2100 ? year : null,
      vehicle_number: clean(input.vehicleNumber, 20).toUpperCase() || null,
      service_name: service,
      preferred_date: date,
      preferred_time: time,
      notes: clean(input.notes, 500) || null,
    })
    .select("booking_number")
    .single();

  if (error || !data) {
    const missing = error && /service_bookings|schema cache|does not exist/i.test(error.message);
    return {
      ok: false,
      unavailable: Boolean(missing),
      error: missing
        ? "Online booking isn't switched on yet. Please book on WhatsApp and we'll confirm your slot."
        : "We couldn't save your booking. Please try again or book on WhatsApp.",
    };
  }

  return { ok: true, bookingNumber: data.booking_number as string };
}
