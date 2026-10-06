-- v2: "Basic Product Information" fields from the product data spec that parts did not have:
-- Product ID, Product Code, Brand, Subcategory, Product Type, Short Description, Status,
-- New Product and Bestseller. (Name, SKU, Category, Full Description and Featured already exist.)

create sequence if not exists product_ref_seq;

alter table parts
  add column if not exists product_ref text,
  add column if not exists product_code text,
  add column if not exists brand text,
  add column if not exists subcategory text,
  add column if not exists product_type text,
  add column if not exists short_description text,
  add column if not exists status text not null default 'active',
  add column if not exists is_new boolean not null default false,
  add column if not exists is_bestseller boolean not null default false;

alter table parts drop constraint if exists parts_status_check;
alter table parts add constraint parts_status_check check (status in ('active', 'draft', 'disabled'));

-- Display ID (PROD-000123), assigned automatically and never edited.
update parts set product_ref = 'PROD-' || lpad(nextval('product_ref_seq')::text, 6, '0') where product_ref is null;
alter table parts alter column product_ref set default ('PROD-' || lpad(nextval('product_ref_seq')::text, 6, '0'));
alter table parts alter column product_ref set not null;
create unique index if not exists parts_product_ref_key on parts (product_ref);

-- Status and the existing is_online flag describe the same thing (visible on the website or
-- not), so they are kept in sync: whichever one changes drives the other. Products already
-- hidden become 'draft'.
create or replace function parts_sync_status() returns trigger
language plpgsql as $$
begin
  if tg_op = 'INSERT' then
    if new.status <> 'active' then
      new.is_online := false;
    elsif new.is_online = false then
      new.status := 'draft';
    end if;
  elsif new.status is distinct from old.status then
    new.is_online := (new.status = 'active');
  elsif new.is_online is distinct from old.is_online then
    new.status := case when new.is_online then 'active' else 'draft' end;
  end if;
  return new;
end;
$$;

drop trigger if exists parts_sync_status_trg on parts;
create trigger parts_sync_status_trg before insert or update on parts
  for each row execute function parts_sync_status();

update parts set status = 'draft' where is_online = false and status = 'active';
