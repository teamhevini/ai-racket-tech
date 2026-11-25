import type { StringFamily } from "@shared/schema";

/**
 * Public string catalogue. Brands are listed from public information and stay
 * "unclaimed" until someone from the company claims them. Scores (1–10) are
 * 10IS's editorial ratings from published lab data and player feedback — they
 * are approximate and are never editable by sponsors.
 */
export interface CatalogString {
  brandName: string;
  model: string;
  family: StringFamily;
  gauges: string;
  stiffness: number | null;
  comfort: number;
  spin: number;
  control: number;
  power: number;
  durability: number;
  setPriceCents: number;
  description: string;
}

export const STRING_BRANDS: Array<{ name: string; slug: string; website: string; accent: string }> = [
  { name: "Luxilon", slug: "luxilon", website: "https://www.luxilon.com", accent: "#c8102e" },
  { name: "Solinco", slug: "solinco", website: "https://www.solincosports.com", accent: "#1f8f3a" },
  { name: "Babolat", slug: "babolat", website: "https://www.babolat.com", accent: "#0050a0" },
  { name: "Tecnifibre", slug: "tecnifibre", website: "https://www.tecnifibre.com", accent: "#e30613" },
  { name: "Yonex", slug: "yonex", website: "https://www.yonex.com", accent: "#00539f" },
  { name: "Wilson", slug: "wilson", website: "https://www.wilson.com", accent: "#d50032" },
  { name: "Head", slug: "head", website: "https://www.head.com", accent: "#111111" },
  { name: "Prince", slug: "prince", website: "https://www.princetennis.com", accent: "#f47b20" },
];

export const STRING_CATALOG: CatalogString[] = [
  { brandName: "Luxilon", model: "ALU Power", family: "polyester", gauges: "1.25, 1.30", stiffness: 233, comfort: 4, spin: 7, control: 9, power: 6, durability: 7, setPriceCents: 2195, description: "The tour-standard control poly. Crisp, precise, loses tension fast." },
  { brandName: "Luxilon", model: "4G", family: "polyester", gauges: "1.25, 1.30", stiffness: 241, comfort: 3, spin: 7, control: 9, power: 5, durability: 9, setPriceCents: 2195, description: "Best tension maintenance in the Luxilon line. Firm and durable." },
  { brandName: "Luxilon", model: "Element", family: "polyester", gauges: "1.25, 1.30", stiffness: 196, comfort: 7, spin: 6, control: 7, power: 6, durability: 6, setPriceCents: 1995, description: "A soft poly for players who want spin without the harshness." },
  { brandName: "Luxilon", model: "Smart", family: "polyester", gauges: "1.25", stiffness: 204, comfort: 6, spin: 7, control: 7, power: 7, durability: 6, setPriceCents: 1995, description: "Softer, more powerful poly with a lively response." },
  { brandName: "Solinco", model: "Hyper-G", family: "polyester", gauges: "16L, 17, 18", stiffness: 228, comfort: 5, spin: 9, control: 8, power: 6, durability: 7, setPriceCents: 1395, description: "Square-shaped spin poly with excellent control for the price." },
  { brandName: "Solinco", model: "Hyper-G Soft", family: "polyester", gauges: "16L, 17", stiffness: 199, comfort: 7, spin: 8, control: 7, power: 6, durability: 6, setPriceCents: 1395, description: "Hyper-G's spin in a softer, more arm-friendly build." },
  { brandName: "Solinco", model: "Tour Bite", family: "polyester", gauges: "16L, 17, 18", stiffness: 246, comfort: 3, spin: 9, control: 9, power: 4, durability: 8, setPriceCents: 1395, description: "Very firm, very biting. For fast swings only." },
  { brandName: "Solinco", model: "Confidential", family: "polyester", gauges: "16L, 17", stiffness: 222, comfort: 5, spin: 7, control: 8, power: 6, durability: 8, setPriceCents: 1395, description: "Built for tension maintenance; plays consistently for longer." },
  { brandName: "Solinco", model: "Vanquish", family: "multifilament", gauges: "16, 17", stiffness: 170, comfort: 9, spin: 4, control: 6, power: 8, durability: 5, setPriceCents: 1795, description: "Solinco's soft multi; powerful and gentle on the arm." },
  { brandName: "Babolat", model: "RPM Blast", family: "polyester", gauges: "16, 17, 18", stiffness: 224, comfort: 4, spin: 9, control: 8, power: 5, durability: 7, setPriceCents: 1795, description: "Octagonal co-poly famous for spin." },
  { brandName: "Babolat", model: "RPM Soft", family: "polyester", gauges: "16, 17", stiffness: 192, comfort: 7, spin: 8, control: 7, power: 6, durability: 6, setPriceCents: 1795, description: "The RPM shape in a much softer material." },
  { brandName: "Babolat", model: "Touch VS", family: "natural gut", gauges: "15L, 16, 17", stiffness: 160, comfort: 10, spin: 5, control: 7, power: 9, durability: 4, setPriceCents: 4495, description: "Benchmark natural gut: maximum feel, comfort and tension hold." },
  { brandName: "Babolat", model: "Xcel", family: "multifilament", gauges: "16, 17", stiffness: 178, comfort: 9, spin: 4, control: 6, power: 8, durability: 5, setPriceCents: 1795, description: "Comfortable, powerful multifilament." },
  { brandName: "Tecnifibre", model: "X-One Biphase", family: "multifilament", gauges: "16, 17, 18", stiffness: 172, comfort: 9, spin: 5, control: 7, power: 8, durability: 5, setPriceCents: 2195, description: "Premium multi often called the closest thing to gut." },
  { brandName: "Tecnifibre", model: "NRG2", family: "multifilament", gauges: "16, 17", stiffness: 165, comfort: 10, spin: 4, control: 6, power: 8, durability: 4, setPriceCents: 2195, description: "One of the softest multis available." },
  { brandName: "Tecnifibre", model: "Razor Code", family: "polyester", gauges: "1.25, 1.30", stiffness: 226, comfort: 5, spin: 7, control: 9, power: 5, durability: 7, setPriceCents: 1695, description: "Precise control poly with good tension maintenance." },
  { brandName: "Tecnifibre", model: "Triax", family: "multifilament", gauges: "1.28, 1.33", stiffness: 183, comfort: 8, spin: 5, control: 7, power: 8, durability: 6, setPriceCents: 2195, description: "A multi with poly-wrapped durability." },
  { brandName: "Yonex", model: "Poly Tour Pro", family: "polyester", gauges: "1.20, 1.25, 1.30", stiffness: 210, comfort: 6, spin: 7, control: 8, power: 6, durability: 7, setPriceCents: 1495, description: "Soft, consistent tour poly." },
  { brandName: "Yonex", model: "Poly Tour Strike", family: "polyester", gauges: "1.25", stiffness: 230, comfort: 4, spin: 8, control: 9, power: 5, durability: 8, setPriceCents: 1495, description: "Firm and controlled with good snapback." },
  { brandName: "Wilson", model: "NXT", family: "multifilament", gauges: "16, 17", stiffness: 175, comfort: 9, spin: 4, control: 6, power: 8, durability: 5, setPriceCents: 1795, description: "Classic arm-friendly multi." },
  { brandName: "Wilson", model: "Natural Gut", family: "natural gut", gauges: "16, 17", stiffness: 158, comfort: 10, spin: 5, control: 7, power: 9, durability: 4, setPriceCents: 3995, description: "Wilson's natural gut." },
  { brandName: "Wilson", model: "Revolve", family: "polyester", gauges: "16, 17", stiffness: 219, comfort: 5, spin: 7, control: 8, power: 6, durability: 7, setPriceCents: 1395, description: "Value control poly with good spin." },
  { brandName: "Head", model: "Lynx Tour", family: "polyester", gauges: "16, 17, 18", stiffness: 212, comfort: 6, spin: 8, control: 8, power: 6, durability: 7, setPriceCents: 1395, description: "Hexagonal co-poly with a soft feel." },
  { brandName: "Head", model: "Hawk Touch", family: "polyester", gauges: "17, 18", stiffness: 226, comfort: 5, spin: 7, control: 9, power: 5, durability: 7, setPriceCents: 1395, description: "Crisp control poly." },
  { brandName: "Head", model: "Velocity MLT", family: "multifilament", gauges: "16, 17", stiffness: 180, comfort: 8, spin: 4, control: 6, power: 8, durability: 6, setPriceCents: 1495, description: "Durable, comfortable multi." },
  { brandName: "Prince", model: "Synthetic Gut Duraflex", family: "synthetic gut", gauges: "16, 17", stiffness: 200, comfort: 6, spin: 4, control: 6, power: 7, durability: 6, setPriceCents: 699, description: "The everyday all-rounder at a club price." },
  { brandName: "Prince", model: "Tour XC", family: "polyester", gauges: "15L, 16, 17", stiffness: 215, comfort: 6, spin: 7, control: 7, power: 6, durability: 7, setPriceCents: 1195, description: "Softer value poly." },
];

// ─── Demo businesses (preview + tests only, never seeded in production) ─────
// Fictional companies so the preview never puts words or numbers in a real brand's mouth.

export const DEMO_PASSWORD = "demo-tennis-2026";
export const DEMO_ACCOUNTS = {
  player: "player@example.com",
  stringer: "stringer@example.com",
  brand: "brand@example.com",
  retailer: "retailer@example.com",
  racketBrand: "rackets@example.com",
  free: "free@example.com",
} as const;

export const DEMO_STRING_BRAND = {
  name: "Northline Strings",
  slug: "northline",
  tagline: "Spin polys and soft multis, engineered in Oregon.",
  about:
    "Northline is a demo string company used to show the 10IS brand portal. Every number on this page is generated demo data.",
  website: "https://example.com/northline",
  accent: "#0f766e",
};

export const DEMO_STRINGS: CatalogString[] = [
  { brandName: "Northline", model: "Ridge Soft", family: "polyester", gauges: "16L, 17", stiffness: 190, comfort: 8, spin: 8, control: 7, power: 6, durability: 6, setPriceCents: 1495, description: "A soft shaped poly that keeps arm-conscious players in spin territory." },
  { brandName: "Northline", model: "Ridge Tour", family: "polyester", gauges: "16L, 17, 18", stiffness: 231, comfort: 4, spin: 9, control: 9, power: 5, durability: 8, setPriceCents: 1495, description: "Firm tour poly for fast swings." },
  { brandName: "Northline", model: "Cloud Multi", family: "multifilament", gauges: "16, 17", stiffness: 168, comfort: 9, spin: 5, control: 7, power: 8, durability: 6, setPriceCents: 1895, description: "Plush multifilament with better durability than most." },
];

export const DEMO_SHOPS = [
  {
    email: DEMO_ACCOUNTS.stringer,
    slug: "baseline-stringworks",
    name: "Baseline Stringworks",
    tagline: "Same-day restrings, tuned to how you play.",
    bio: "A demo stringing shop. Drop off before 10am for same-day pickup. Tour-grade electronic machine, calibrated weekly.",
    address: "120 Court Street",
    city: "Portland",
    phone: "+1 555 0100",
    certifications: "USRSA Master Racquet Technician",
    machine: "Babolat Sensor Expert",
    openingHours: "Mon–Fri 8am–7pm · Sat 9am–2pm",
    labourCents: 2500,
    rushCents: 1500,
    turnaroundHours: 24,
    plan: "pro" as const,
  },
  {
    email: "stringer2@example.com",
    slug: "net-cord-racquets",
    name: "Net Cord Racquets",
    tagline: "Club stringer at Riverside Tennis Centre.",
    bio: "A demo club stringer. Leave rackets in the drop box by court 1.",
    address: "Riverside Tennis Centre",
    city: "Portland",
    phone: "+1 555 0101",
    certifications: "USRSA Certified Stringer",
    machine: "Gamma Progression II",
    openingHours: "Tue–Sun 7am–9pm",
    labourCents: 2000,
    rushCents: 1000,
    turnaroundHours: 48,
    plan: "free" as const,
  },
];

export const DEMO_RETAILER = {
  email: DEMO_ACCOUNTS.retailer,
  name: "Courtside Supply",
  slug: "courtside-supply",
  tagline: "Demo tennis retailer.",
  website: "https://example.com/courtside",
  accent: "#7c3aed",
};

export const DEMO_RACKET_BRAND = {
  email: DEMO_ACCOUNTS.racketBrand,
  name: "Arcfield Rackets",
  slug: "arcfield",
  tagline: "Demo racket brand.",
  website: "https://example.com/arcfield",
  accent: "#b45309",
};
