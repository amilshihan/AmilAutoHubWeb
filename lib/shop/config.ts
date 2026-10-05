// Business settings for the storefront. Edit these to change delivery pricing and copy.

export const SHOP_FALLBACK = {
  name: "Amil Auto Hub",
  legalName: "Amil Auto Hub (PVT) Ltd",
  address: "278/4, High Level Road, Kottawa, Pannipitiya",
  phone: "0773700001",
  tagline: "Everything Your Vehicle Needs.",
};

export const PICKUP_LOCATION = "Amil Auto Hub - Kottawa";

export type DeliveryZoneId = "western" | "islandwide" | "courier";

export const DEFAULT_DELIVERY_ZONES: { id: DeliveryZoneId; label: string; fee: number; eta: string }[] = [
  { id: "western", label: "Colombo / Western Province delivery", fee: 350, eta: "1-2 working days" },
  { id: "islandwide", label: "Islandwide delivery", fee: 600, eta: "2-4 working days" },
  { id: "courier", label: "Courier", fee: 750, eta: "2-4 working days" },
];

export const ORDER_STATUSES = ["pending", "confirmed", "packed", "dispatched", "delivered"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number] | "cancelled";

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  pending: "Pending",
  confirmed: "Confirmed",
  packed: "Packed",
  dispatched: "Dispatched",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_LABEL: Record<string, string> = {
  cod: "Cash on delivery",
  pay_at_pickup: "Pay at pickup",
  bank_transfer: "Bank transfer",
  payhere: "Card / online payment (PayHere)",
};

export const PAYMENT_STATUS_LABEL: Record<string, string> = {
  unpaid: "Unpaid",
  pending: "Payment pending",
  paid: "Paid",
  failed: "Payment failed",
  refunded: "Refunded",
};

export const SRI_LANKA_DISTRICTS = [
  "Colombo", "Gampaha", "Kalutara", "Kandy", "Matale", "Nuwara Eliya", "Galle", "Matara",
  "Hambantota", "Jaffna", "Kilinochchi", "Mannar", "Vavuniya", "Mullaitivu", "Batticaloa",
  "Ampara", "Trincomalee", "Kurunegala", "Puttalam", "Anuradhapura", "Polonnaruwa", "Badulla",
  "Monaragala", "Ratnapura", "Kegalle",
];

export const WESTERN_PROVINCE_DISTRICTS = ["Colombo", "Gampaha", "Kalutara"];

export const SRI_LANKA_PROVINCES = [
  "Western", "Central", "Southern", "Northern", "Eastern", "North Western", "North Central", "Uva", "Sabaragamuwa",
];

export const ADDRESS_TYPES = ["home", "work", "business", "other"] as const;
export type AddressType = (typeof ADDRESS_TYPES)[number];
export const ADDRESS_TYPE_LABEL: Record<AddressType, string> = { home: "Home", work: "Work", business: "Business", other: "Other" };

export const FUEL_TYPES = ["petrol", "diesel", "hybrid", "electric", "lpg", "cng"] as const;
export type FuelType = (typeof FUEL_TYPES)[number];
export const FUEL_TYPE_LABEL: Record<FuelType, string> = {
  petrol: "Petrol",
  diesel: "Diesel",
  hybrid: "Hybrid",
  electric: "Electric",
  lpg: "LPG",
  cng: "CNG",
};

export const CONSENT_TYPES = ["sms", "whatsapp", "email", "push", "promotional", "product_launch", "service_reminder"] as const;
export type ConsentType = (typeof CONSENT_TYPES)[number];
export const CONSENT_TYPE_LABEL: Record<ConsentType, string> = {
  sms: "SMS marketing",
  whatsapp: "WhatsApp marketing",
  email: "Email marketing",
  push: "Push notifications",
  promotional: "Promotional notifications",
  product_launch: "Product launch notifications",
  service_reminder: "Service/reminder notifications",
};
export const CONSENT_TYPE_HELP: Record<ConsentType, string> = {
  sms: "Offers and updates by text message.",
  whatsapp: "Offers and updates on WhatsApp.",
  email: "Offers and updates by email.",
  push: "Alerts on your phone or browser, if enabled.",
  promotional: "Sales, discounts and special offers.",
  product_launch: "New products and brands as they arrive.",
  service_reminder: "Reminders for upcoming services or renewals.",
};

export const INQUIRY_TYPES = ["order_issue", "product_issue", "vehicle_question", "billing", "delivery", "account", "other"] as const;
export type InquiryType = (typeof INQUIRY_TYPES)[number];
export const INQUIRY_TYPE_LABEL: Record<InquiryType, string> = {
  order_issue: "Order issue",
  product_issue: "Product issue",
  vehicle_question: "Vehicle question",
  billing: "Billing",
  delivery: "Delivery",
  account: "Account",
  other: "Other",
};

export const TICKET_STATUSES = ["open", "in_progress", "resolved", "closed"] as const;
export type TicketStatus = (typeof TICKET_STATUSES)[number];
export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  open: "Open",
  in_progress: "In progress",
  resolved: "Resolved",
  closed: "Closed",
};

export const ACTIVITY_EVENT_LABEL: Record<string, string> = {
  account_created: "Account created",
  login: "Logged in",
  logout: "Logged out",
  password_changed: "Password changed",
  email_changed: "Email changed",
  mobile_changed: "Mobile number changed",
  address_added: "Address added",
  address_changed: "Address changed",
  vehicle_added: "Vehicle added",
  order_placed: "Order placed",
  order_cancelled: "Order cancelled",
  refund_requested: "Refund requested",
  support_ticket_created: "Support ticket created",
  loyalty_points_changed: "Loyalty points changed",
  account_deleted: "Account deleted",
  password_reset_requested: "Password reset requested",
  email_verified: "Email address confirmed",
};

export const TRANSMISSIONS = ["manual", "automatic", "cvt", "semi_automatic"] as const;
export type Transmission = (typeof TRANSMISSIONS)[number];
export const TRANSMISSION_LABEL: Record<Transmission, string> = {
  manual: "Manual",
  automatic: "Automatic",
  cvt: "CVT",
  semi_automatic: "Semi-automatic",
};
