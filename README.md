# Amil Auto Hub Web

The public website and website admin for Amil Auto Hub (Next.js App Router + Supabase).
It shares its Supabase database with the Spare Parts POS, so stock sold at the counter is reflected online.

## Setup

1. `npm install`
2. Copy `.env.local.example` to `.env.local` and fill in the same Supabase URL, anon key and service role key the POS uses.
3. Database: the POS migrations `0001`-`0014` must already be applied. Then run, in the Supabase SQL editor:
   - `supabase/migrations/0015_storefront.sql` (online orders, vehicle compatibility, product web fields)
   - `supabase/migrations/0016_store_settings.sql` (store settings and payment tracking)
4. `npm run dev` (runs on http://localhost:3001)

## What is in here

- **Public website:** `/` (home), `/shop`, `/shop/[collection]`, `/product/[id]`, `/offers`, `/brands`, `/services`, `/ask-amil`, `/cart`, `/checkout`, `/order/[token]`, `/account` (order tracking), `/about`, `/contact`.
- **Website admin** (staff login, same accounts as the POS): `/admin/orders`, `/admin/products` (visibility, featured, image, compare-at price) and `/admin/store` (delivery charges, WhatsApp/pickup, payment methods). Only `/admin/*` requires a login.
- Public pages read through the service-role key on the server and only send whitelisted fields (`lib/shop/data.ts`). Cost prices, margins and suppliers are never exposed.
- New products, prices and stock are managed in the POS.

## Environment variables

See `.env.local.example`. Optional: `ANTHROPIC_API_KEY` (AI answers in Ask Amil), `PAYHERE_MERCHANT_ID` / `PAYHERE_MERCHANT_SECRET` / `NEXT_PUBLIC_SITE_URL` (online payments).

## Notes

- Online orders: stock is deducted when an order is confirmed and restored if it is cancelled.
- Customers don't get Supabase accounts (every Supabase auth user is POS staff); they track orders with order number and phone.
- Delivery fees, pickup location and services are configured in `lib/shop/config.ts`, `lib/shop/services.ts` and the Online store admin page.
