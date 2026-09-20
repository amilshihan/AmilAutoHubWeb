// Sri Lankan-friendly vehicle selector data. Merged with the POS vehicle master data
// (vehicle_brands / vehicle_models) at runtime so new makes and models appear automatically.

export const VEHICLE_TYPES = ["Car", "Van", "Bike", "Heavy Vehicle"] as const;
export type VehicleType = (typeof VEHICLE_TYPES)[number];

export type VehicleCatalog = Record<VehicleType, Record<string, string[]>>;

export const BASE_VEHICLES: VehicleCatalog = {
  Car: {
    Toyota: ["Prius", "Aqua", "Axio", "Allion", "Premio", "Vitz", "Corolla", "CHR", "Land Cruiser Prado", "Yaris"],
    Honda: ["Vezel", "Fit", "Grace", "Civic", "CR-V", "Insight", "Freed"],
    Suzuki: ["Alto", "Wagon R", "Swift", "Celerio", "Baleno", "Maruti 800", "A-Star"],
    Hyundai: ["i10", "i20", "Elantra", "Tucson", "Santa Fe", "Creta"],
    Kia: ["Picanto", "Rio", "Sportage", "Sorento", "Seltos"],
    Nissan: ["Sunny", "March", "Leaf", "X-Trail", "Juke", "Tiida", "Note"],
    Mitsubishi: ["Lancer", "Montero", "Outlander", "Mirage"],
    Mazda: ["Demio", "Axela", "CX-5", "Premacy"],
    Micro: ["Panda", "Trend", "MX7", "Kyron"],
    Perodua: ["Kelisa", "Viva", "Axia", "Myvi"],
  },
  Van: {
    Toyota: ["Hiace", "TownAce", "LiteAce", "Noah", "Voxy"],
    Nissan: ["Caravan", "Vanette", "Serena"],
    Suzuki: ["Every", "Carry"],
    Mitsubishi: ["L300", "Delica"],
    Micro: ["Bio Van", "Micro Van"],
  },
  Bike: {
    Honda: ["CB Shine", "Dio", "Activa", "Hornet", "CB125", "Grazia"],
    Bajaj: ["Pulsar", "Discover", "CT100", "Platina"],
    Yamaha: ["FZ", "Ray ZR", "Fascino", "MT-15"],
    TVS: ["Apache", "Ntorq", "Jupiter", "Scooty"],
    Hero: ["Splendor", "Passion", "Glamour"],
    "Three Wheeler (Tuk)": ["Bajaj RE", "TVS King", "Piaggio Ape"],
  },
  "Heavy Vehicle": {
    Tata: ["Ace", "Dimo Batta", "LPT 709", "Super Ace"],
    Isuzu: ["NPR", "Elf", "D-Max"],
    "Ashok Leyland": ["Dost", "Boss", "Partner"],
    Mitsubishi: ["Canter", "Fuso"],
    Toyota: ["Dyna", "Hilux"],
  },
};

export function mergeVehicleCatalog(
  dbBrands: { id: string; name: string }[],
  dbModels: { brand_id: string; name: string }[]
): VehicleCatalog {
  const merged: VehicleCatalog = JSON.parse(JSON.stringify(BASE_VEHICLES));
  const brandName = new Map(dbBrands.map((b) => [b.id, b.name]));
  for (const m of dbModels) {
    const make = brandName.get(m.brand_id);
    if (!make) continue;
    const cars = merged.Car;
    const existingMake = Object.keys(cars).find((k) => k.toLowerCase() === make.toLowerCase()) ?? make;
    const list = (cars[existingMake] ??= []);
    if (!list.some((x) => x.toLowerCase() === m.name.toLowerCase())) list.push(m.name);
  }
  for (const b of dbBrands) {
    const cars = merged.Car;
    if (!Object.keys(cars).some((k) => k.toLowerCase() === b.name.toLowerCase())) cars[b.name] = [];
  }
  return merged;
}

export function vehicleLabel(v: { make?: string; model?: string; year?: string | number }): string {
  return [v.make, v.model, v.year].filter(Boolean).join(" ");
}

// Flat lookup used by the Ask Amil retrieval to spot vehicles inside free text.
export function knownMakesAndModels(catalog: VehicleCatalog = BASE_VEHICLES) {
  const makes = new Set<string>();
  const models: { make: string; model: string }[] = [];
  for (const type of Object.values(catalog)) {
    for (const [make, list] of Object.entries(type)) {
      makes.add(make);
      for (const model of list) models.push({ make, model });
    }
  }
  return { makes: [...makes], models };
}
