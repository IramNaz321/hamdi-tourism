import { marketingPhotos } from "@/lib/marketing-photos";
import { vehicleCategories } from "@/lib/vehicle-categories";
import type { PublicVehicle } from "@/lib/website";
import { VehiclePhoto } from "./vehicle-photo";
export function VehicleCategories({ fleet = [] }: { fleet?: PublicVehicle[] }) {
  return (
    <section aria-label="Vehicle categories" className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vehicleCategories.map((category) => (
          <article key={category.code} className="panel p-4 space-y-3">
            <VehiclePhoto
              src={
                fleet.find((vehicle) => vehicle.category === category.code && vehicle.image_url)
                  ?.image_url ?? marketingPhotos[category.code]?.src
              }
              name={category.name}
            />
            <h3 className="font-semibold">{category.name}</h3>
            <p className="text-sm text-muted">{category.capacity}</p>
            {marketingPhotos[category.code] && (
              <p className="text-xs text-muted">
                Editorial photo:{" "}
                <a className="underline" href={marketingPhotos[category.code]!.source}>
                  {marketingPhotos[category.code]!.credit}
                </a>{" "}
                ·{" "}
                <a className="underline" href={marketingPhotos[category.code]!.license}>
                  Licence
                </a>
              </p>
            )}
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">
        Service categories only. Exact vehicle capacity, luggage, fares and availability require
        owner-published records and confirmation.
      </p>
    </section>
  );
}
