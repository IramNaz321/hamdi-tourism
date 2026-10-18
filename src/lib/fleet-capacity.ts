export type PublishedVehicleCapacity = {
  category: string;
  capacity: number;
  luggage_capacity: number | null;
};

export type JourneyCapacity = {
  category: string;
  passengers: number;
  luggage: number;
};

export function publishedFleetCapacityError(
  fleet: PublishedVehicleCapacity[],
  journey: JourneyCapacity,
) {
  if (!fleet.length) return "No vehicles are published for online transfer enquiries.";
  const fits = fleet.some(
    (vehicle) =>
      vehicle.category === journey.category &&
      vehicle.capacity >= journey.passengers &&
      (vehicle.luggage_capacity ?? 0) >= journey.luggage,
  );
  return fits
    ? undefined
    : "No published vehicle in this category can carry the selected passengers and luggage.";
}
