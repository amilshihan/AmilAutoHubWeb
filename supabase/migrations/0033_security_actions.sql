-- Adds the "account_deleted" audit event (new: self-service account deletion from the
-- customer's new Security page). password_changed already exists in the check constraint
-- from 0032 but has never had a real trigger until now.
alter table customer_activity_log drop constraint customer_activity_log_event_type_check;
alter table customer_activity_log add constraint customer_activity_log_event_type_check check (event_type in (
  'account_created', 'login', 'logout', 'password_changed', 'email_changed', 'mobile_changed',
  'address_added', 'address_changed', 'vehicle_added', 'order_placed', 'order_cancelled',
  'refund_requested', 'support_ticket_created', 'loyalty_points_changed', 'account_deleted'
));
