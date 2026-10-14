import { VehicleCategories } from "./vehicle-categories";
import { vehicleCategoryLabel } from "@/lib/vehicle-categories";
import Link from "next/link";
import { Users, Luggage, ArrowUpRight } from "lucide-react";
import type { PublicVehicle } from "@/lib/website";
import { Card } from "./ui/card";
import { VehiclePhoto } from "./vehicle-photo";
export function FleetGallery({ fleet }: { fleet: PublicVehicle[] }) {
  return (
    <>
      <VehicleCategories />
      {fleet.length ? (
        <div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 mt-10"
          aria-label="Published vehicle gallery"
        >
          {fleet.map((vehicle) => (
            <Card key={vehicle.id} className="overflow-hidden">
              <Link
                href={`/fleet/${vehicle.id}`}
                aria-label={`View ${vehicle.name}`}
                className="mx-4"
              >
                <VehiclePhoto src={vehicle.image_url} name={vehicle.name} />
              </Link>
              <div className="p-6 pt-0 space-y-4">
                <p className="eyebrow capitalize">{vehicleCategoryLabel(vehicle.category)}</p>
                <h3 className="text-xl font-semibold">
                  <Link href={`/fleet/${vehicle.id}`}>{vehicle.name}</Link>
                </h3>
                {vehicle.description && (
                  <p className="text-sm text-muted leading-relaxed" dir="auto">
                    {vehicle.description}
                  </p>
                )}
                <div className="flex flex-wrap gap-5 text-sm text-muted">
                  <span className="flex gap-2 items-center">
                    <Users size={16} />
                    {vehicle.capacity} passengers
                  </span>
                  <span className="flex gap-2 items-center">
                    <Luggage size={16} />
                    {vehicle.luggage_capacity === null
                      ? "Luggage capacity not published"
                      : `${vehicle.luggage_capacity} luggage`}
                  </span>
                </div>
                <p className="text-xs text-muted">
                  Availability and exact assignment confirmed by our team.
                </p>
                <Link
                  href={`/fleet/${vehicle.id}`}
                  className="flex gap-2 items-center font-semibold text-sm"
                >
                  Vehicle details <ArrowUpRight size={16} />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="fleet-booking-notice">
          <p>Online booking is currently unavailable. Contact our team to discuss your transfer.</p>
          <Link href="/#contact">
            Contact our team <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
        </div>
      )}
    </>
  );
}
