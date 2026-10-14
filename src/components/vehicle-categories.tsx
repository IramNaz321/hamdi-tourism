import { marketingPhotos } from "@/lib/marketing-photos";
import { vehicleCategories } from "@/lib/vehicle-categories";
import Image from "next/image";
export function VehicleCategories() {
  return (
    <section aria-label="Vehicle categories" className="space-y-4">
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {vehicleCategories.map((category) => (
          <article
            key={category.code}
            className="showcase-card overflow-hidden rounded-2xl border border-[#c5a46d]/25 bg-[#141414] text-[#f5efdf]"
          >
            <div className="relative aspect-[3/2] overflow-hidden bg-[#20201e]">
              <Image
                src={marketingPhotos[category.code]!.src}
                alt={marketingPhotos[category.code]!.alt}
                fill
                sizes="(max-width: 639px) 100vw, (max-width: 1023px) 50vw, 25vw"
                className="object-cover"
              />
            </div>
            <div className="p-5 space-y-2">
              <h3 className="font-semibold">{category.name}</h3>
              <p className="text-sm text-[#d3c4a9]">{category.capacity}</p>
              {marketingPhotos[category.code] && (
                <p className="text-xs text-[#b7ab94]">
                  Showcase visual:{" "}
                  <a className="underline" href={marketingPhotos[category.code]!.source}>
                    {marketingPhotos[category.code]!.credit}
                  </a>{" "}
                  ·{" "}
                  <a className="underline" href={marketingPhotos[category.code]!.license}>
                    Provenance
                  </a>
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
      <p className="text-sm text-muted">
        Original AI-assisted marketing visuals illustrate vehicle styles, not company inventory or
        actual vehicle seating configuration. The four service capacities are category descriptions.
        Exact assigned vehicle, luggage, fares and availability require owner-published records and
        confirmation.
      </p>
    </section>
  );
}
