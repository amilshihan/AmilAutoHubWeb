// Services shown on the website. Set enabled: false to show a service as "coming soon"
// (greyed out, no booking button) until the workshop is ready to offer it.

export type ServiceItem = { name: string; enabled: boolean };
export type ServiceGroup = { title: string; blurb: string; items: ServiceItem[] };

export const SERVICE_GROUPS: ServiceGroup[] = [
  {
    title: "Oil & Lubrication",
    blurb: "The right oil, fitted properly.",
    items: [
      { name: "Oil service", enabled: true },
      { name: "Oil recommendations", enabled: true },
      { name: "Oil filter replacement", enabled: true },
    ],
  },
  {
    title: "Vehicle Service",
    blurb: "Keep your vehicle safe and reliable.",
    items: [
      { name: "General service", enabled: true },
      { name: "Inspection", enabled: true },
      { name: "Diagnostics", enabled: true },
      { name: "Brake service", enabled: true },
      { name: "Suspension", enabled: true },
    ],
  },
  {
    title: "Parts Installation",
    blurb: "Buy the part, we'll fit it.",
    items: [
      { name: "Battery", enabled: true },
      { name: "Wipers", enabled: true },
      { name: "Filters", enabled: true },
      { name: "Bulbs", enabled: true },
      { name: "Other compatible parts", enabled: true },
    ],
  },
];
