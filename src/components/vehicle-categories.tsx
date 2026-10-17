import { marketingPhotos } from "@/lib/marketing-photos";
import { vehicleCategories } from "@/lib/vehicle-categories";
import { Users } from "lucide-react";
import Image from "next/image";

export function VehicleCategories() {
  return (
    <section aria-label="Vehicle categories" className="fleet-showcase">
      <div className="fleet-category-grid">
        {vehicleCategories.map((category, index) => {
          const photo = marketingPhotos[category.code];
          return (
            <article key={category.code} className="fleet-category-card">
              <div className="fleet-category-image">
                {photo && (
                  <Image
                    src={photo.src}
                    alt={photo.alt}
                    fill
                    sizes="(max-width: 639px) calc(100vw - 48px), (max-width: 1023px) 45vw, 280px"
                    className="object-cover"
                  />
                )}
              </div>
              <div className="fleet-category-copy">
                <span className="fleet-category-number" aria-hidden="true">
                  0{index + 1}
                </span>
                <h3>{category.name}</h3>
                <p>
                  <Users size={15} aria-hidden="true" />
                  {category.capacity}
                </p>
              </div>
            </article>
          );
        })}
      </div>
      <details className="fleet-image-notes">
        <summary>About these images &amp; credits</summary>
        <div>
          <p>
            Marketing examples only. Actual vehicles, seating, luggage capacity, fares and
            availability are confirmed from our published fleet.
          </p>
          <ul>
            {vehicleCategories.map((category) => {
              const photo = marketingPhotos[category.code];
              return photo ? (
                <li key={category.code}>
                  {category.name}: <a href={photo.source}>{photo.credit}</a>
                  {" · "}
                  <a href={photo.license}>Usage &amp; provenance</a>
                </li>
              ) : null;
            })}
          </ul>
        </div>
      </details>
    </section>
  );
}
