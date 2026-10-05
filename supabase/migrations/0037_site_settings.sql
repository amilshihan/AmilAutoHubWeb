-- v2: General website settings (single row): name, logo, favicon, URL, business details,
-- contact numbers and emails, business hours, time zone, language, date/time format.
-- WhatsApp number and pickup location stay in store_settings (same admin page).
-- The public site reads this table with the service role; only admins can change it.

create table site_settings (
  id boolean primary key default true check (id),
  site_name text,
  logo_url text check (logo_url is null or logo_url ~* '^https?://'),
  favicon_url text check (favicon_url is null or favicon_url ~* '^https?://'),
  site_url text check (site_url is null or site_url ~* '^https?://'),
  legal_name text,
  registration_number text,
  tax_id text,
  address text,
  phones jsonb not null default '[]'::jsonb,
  emails jsonb not null default '[]'::jsonb,
  show_hours boolean not null default false,
  business_hours jsonb,
  time_zone text not null default 'Asia/Colombo',
  default_language text not null default 'en' check (default_language in ('en', 'si', 'ta')),
  date_format text not null default 'DD/MM/YYYY' check (date_format in ('DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD', 'DD MMM YYYY')),
  time_format text not null default '12h' check (time_format in ('12h', '24h')),
  updated_at timestamptz not null default now()
);

insert into site_settings (id, site_name, legal_name)
values (true, 'Amil Auto Hub', 'Amil Auto Hub (PVT) Ltd');

alter table site_settings enable row level security;
create policy "site_settings_select" on site_settings for select using (auth.uid() is not null);
create policy "site_settings_update_admin" on site_settings for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));
