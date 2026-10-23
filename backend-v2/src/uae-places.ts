import { catalog } from "../../frontend-v2/src/services/fixtures.ts";
// Maintained pickup catalogue. All entries are inside the UAE; no external geocoder is required.
const destinations: Record<string, string[]> = {
  Dubai: [
    "Jumeirah Beach Residence (JBR)",
    "Business Bay",
    "Deira",
    "Bur Dubai",
    "Jumeirah",
    "Al Barsha",
    "Dubai Hills",
    "Dubai Silicon Oasis",
    "Dubai Sports City",
    "Dubai Festival City",
    "Dubai Creek Harbour",
    "Dubai International Financial Centre (DIFC)",
    "Dubai Healthcare City",
    "Dubai Internet City",
    "Dubai Media City",
    "Jebel Ali",
    "Dubai Parks and Resorts",
    "Expo City Dubai",
    "Mirdif",
    "International City",
    "Al Qusais",
    "Dubai South",
    "Hatta",
  ],
  "Abu Dhabi": [
    "Yas Island",
    "Saadiyat Island",
    "Al Reem Island",
    "Abu Dhabi Corniche",
    "Khalifa City",
    "Al Raha Beach",
    "Masdar City",
    "Mussafah",
    "Al Maryah Island",
    "Sheikh Zayed Grand Mosque",
    "Al Ain city",
    "Al Ain Zoo",
    "Liwa Oasis",
    "Ruwais",
  ],
  Sharjah: [
    "Sharjah International Airport (SHJ)",
    "Al Majaz",
    "Al Khan",
    "Al Qasba",
    "Muwaileh",
    "University City Sharjah",
    "Khor Fakkan",
    "Kalba",
    "Dibba Al Hisn",
  ],
  Ajman: ["Ajman city", "Ajman Corniche", "Al Zorah", "Masfout"],
  "Umm Al Quwain": ["Umm Al Quwain city", "Al Sinniyah Island", "Falaj Al Mualla"],
  "Ras Al Khaimah": [
    "Ras Al Khaimah International Airport (RKT)",
    "Ras Al Khaimah city",
    "Al Marjan Island",
    "Al Hamra Village",
    "Mina Al Arab",
    "Jebel Jais",
  ],
  Fujairah: [
    "Fujairah International Airport (FJR)",
    "Fujairah city",
    "Al Aqah",
    "Dibba Al Fujairah",
    "Snoopy Island",
  ],
};
export const uaePlaces = [
  ...catalog.locations.map((p) => ({
    ...p,
    countryCode: "AE" as const,
    source: "catalog" as const,
  })),
  ...Object.entries(destinations).flatMap(([city, names]) =>
    names.map((name) => ({
      id:
        "uae:" +
        name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/-$/, ""),
      name,
      shortName: name,
      type: name.includes("Airport") ? ("airport" as const) : ("destination" as const),
      city,
      countryCode: "AE" as const,
      source: "catalog" as const,
    })),
  ),
];
// Published prototype fare zones, not live road-distance or traffic estimates.
export function routeTariff(
  pickup: { city: string; name: string },
  destination: { city: string; name: string },
) {
  const names = `${pickup.name} ${destination.name}`;
  if (/Liwa|Ruwais/.test(names)) return { factor: 4, durationMinutes: 240 };
  if (/Hatta|Khor Fakkan|Kalba|Dibba|Al Ain|Jebel Jais|Masfout/.test(names))
    return { factor: 2.8, durationMinutes: 150 };
  if (pickup.city === destination.city) return { factor: 1, durationMinutes: 45 };
  if ([pickup.city, destination.city].includes("Abu Dhabi"))
    return { factor: 2.2, durationMinutes: 110 };
  if ([pickup.city, destination.city].some((c) => ["Fujairah", "Ras Al Khaimah"].includes(c)))
    return { factor: 2.4, durationMinutes: 130 };
  if ([pickup.city, destination.city].includes("Umm Al Quwain"))
    return { factor: 1.8, durationMinutes: 85 };
  return { factor: 1.3, durationMinutes: 60 };
}
