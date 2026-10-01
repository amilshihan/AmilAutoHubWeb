-- 0030 renamed existing 'Standard'/'Platinum' tier values to Bronze/Business but never
-- changed the column's own default, so every customer registered since then (including
-- while testing 0030) still got 'Standard'. Fix the default and sweep up any rows created
-- in that window.
alter table customer_accounts alter column tier set default 'Bronze';
update customer_accounts set tier = 'Bronze' where tier = 'Standard';
update customer_accounts set tier = 'Business' where tier = 'Platinum';
