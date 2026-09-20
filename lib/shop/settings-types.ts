// Client-safe types, defaults and normalisation for the online store settings.
import { DEFAULT_DELIVERY_ZONES, PICKUP_LOCATION, type DeliveryZoneId } from "@/lib/shop/config";

export type PaymentMethodId = "cod" | "pay_at_pickup" | "bank_transfer" | "payhere";

export const PAYMENT_METHOD_IDS: PaymentMethodId[] = ["cod", "pay_at_pickup", "bank_transfer", "payhere"];

export type DeliveryZoneConfig = {
  id: DeliveryZoneId;
  label: string;
  fee: number;
  eta: string;
  enabled: boolean;
};

export type BankTransferConfig = {
  bankName: string;
  accountName: string;
  accountNumber: string;
  branch: string;
  instructions: string;
};

export type StoreSettings = {
  whatsappNumber: string;
  pickupLocation: string;
  deliveryZones: DeliveryZoneConfig[];
  paymentMethods: Record<PaymentMethodId, boolean>;
  bankTransfer: BankTransferConfig;
  payhereSandbox: boolean;
};

export const DEFAULT_SETTINGS: StoreSettings = {
  whatsappNumber: "",
  pickupLocation: PICKUP_LOCATION,
  deliveryZones: DEFAULT_DELIVERY_ZONES.map((z) => ({ ...z, enabled: true })),
  paymentMethods: { cod: true, pay_at_pickup: true, bank_transfer: false, payhere: false },
  bankTransfer: { bankName: "", accountName: "", accountNumber: "", branch: "", instructions: "" },
  payhereSandbox: true,
};

const text = (v: unknown, fallback = "") => (typeof v === "string" ? v.trim() : fallback);
const money = (v: unknown, fallback: number) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? Math.round(n * 100) / 100 : fallback;
};

// Turns a raw store_settings row (or null) into a complete, validated settings object.
export function normaliseSettings(row: Record<string, unknown> | null | undefined): StoreSettings {
  const zonesRaw = Array.isArray(row?.delivery_zones) ? (row!.delivery_zones as Record<string, unknown>[]) : [];
  const deliveryZones = DEFAULT_SETTINGS.deliveryZones.map((def) => {
    const saved = zonesRaw.find((z) => z?.id === def.id);
    return saved
      ? {
          id: def.id,
          label: text(saved.label, def.label) || def.label,
          fee: money(saved.fee, def.fee),
          eta: text(saved.eta, def.eta) || def.eta,
          enabled: saved.enabled !== false,
        }
      : def;
  });

  const pm = (row?.payment_methods ?? {}) as Record<string, unknown>;
  const paymentMethods = { ...DEFAULT_SETTINGS.paymentMethods };
  for (const id of PAYMENT_METHOD_IDS) if (typeof pm[id] === "boolean") paymentMethods[id] = pm[id] as boolean;

  const bt = (row?.bank_transfer ?? {}) as Record<string, unknown>;

  return {
    whatsappNumber: text(row?.whatsapp_number),
    pickupLocation: text(row?.pickup_location) || DEFAULT_SETTINGS.pickupLocation,
    deliveryZones,
    paymentMethods,
    bankTransfer: {
      bankName: text(bt.bankName),
      accountName: text(bt.accountName),
      accountNumber: text(bt.accountNumber),
      branch: text(bt.branch),
      instructions: text(bt.instructions),
    },
    payhereSandbox: row?.payhere_sandbox !== false,
  };
}
