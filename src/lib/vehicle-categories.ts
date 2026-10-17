/** Client-approved service categories; codes preserve the existing PostgreSQL contract.
 * Display guidance is not proof of any individual vehicle's availability or capacity. */
export const vehicleCategories = [
  { code: "sedan", name: "Normal Sedan", capacity: "3 passengers" },
  { code: "luxury", name: "Luxury Sedan", capacity: "3 passengers" },
  { code: "van", name: "7-Seater", capacity: "7 seats" },
  { code: "suv", name: "5-Passenger Vehicle", capacity: "5 passengers" },
] as const;
export function vehicleCategoryLabel(code: string) {
  return vehicleCategories.find((category) => category.code === code)?.name ?? code;
}
