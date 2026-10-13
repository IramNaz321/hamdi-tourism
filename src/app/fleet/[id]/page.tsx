import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { websiteContent } from "@/lib/website";
import { VehiclePhoto } from "@/components/vehicle-photo";
export const dynamic = "force-dynamic";
export default async function Vehicle({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { fleet } = await websiteContent();
  const vehicle = fleet.find((v) => v.id === id);
  if (!vehicle) notFound();
  return (
    <main className="max-w-5xl mx-auto p-5 sm:p-8 py-14 space-y-6">
      <Link href="/fleet">← Published fleet</Link>
      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <VehiclePhoto src={vehicle.image_url} name={vehicle.name} large />
        <section className="panel p-6 space-y-5">
          <p className="eyebrow capitalize">{vehicle.category}</p>
          <h1 className="text-3xl font-semibold" dir="auto">
            {vehicle.name}
          </h1>
          {vehicle.description && (
            <p className="whitespace-pre-wrap text-muted" dir="auto">
              {vehicle.description}
            </p>
          )}
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-muted text-sm">Passenger capacity</dt>
              <dd className="font-semibold">{vehicle.capacity}</dd>
            </div>
            <div>
              <dt className="text-muted text-sm">Luggage capacity</dt>
              <dd className="font-semibold">{vehicle.luggage_capacity ?? "Not published"}</dd>
            </div>
          </dl>
          <p className="notice">
            Availability and exact assigned vehicle require dispatch confirmation. A photograph does
            not reserve this vehicle.
          </p>
          <Link className="button" href={`/book?vehicle=${vehicle.id}`}>
            Plan a transfer with this preference
          </Link>
          <Link className="block underline text-sm" href="/#transfers">
            Request a transfer enquiry
          </Link>
        </section>
      </div>
    </main>
  );
}
