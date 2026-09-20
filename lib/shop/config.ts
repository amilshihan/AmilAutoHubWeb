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
