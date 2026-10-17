"use client";
import { useState } from "react";
export function VehiclePhoto({
  src,
  name,
  large = false,
}: {
  src?: string;
  name: string;
  large?: boolean;
}) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  return (
    <div
      className={`vehicle-photo relative overflow-hidden rounded-xl bg-canvas ${large ? "aspect-[16/10]" : "aspect-[4/3]"}`}
    >
      {src && failedSource !== src ? (
        <picture>
          <img
            src={src}
            alt={name}
            width={1600}
            height={1200}
            loading="lazy"
            decoding="async"
            className="absolute inset-0 w-full h-full object-contain p-3"
            onError={() => setFailedSource(src)}
          />
        </picture>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-ink gap-3 p-5 text-center">
          <p className="text-sm">
            {src ? "Photo temporarily unavailable" : "Vehicle photograph not published"}
          </p>
        </div>
      )}
    </div>
  );
}
