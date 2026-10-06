-- v2: lets an admin turn the website chat assistant on or off (Website settings > General).
-- On by default, so nothing changes until someone switches it off.

alter table site_settings add column if not exists chatbot_enabled boolean not null default true;
