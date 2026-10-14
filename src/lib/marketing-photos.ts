import manifest from "@/content/vehicle-photos.json";
export type MarketingPhoto = {
  src: string;
  alt: string;
  credit: string;
  source: string;
  license: string;
};
/** Original marketing visualizations only. Never operational fleet inventory or availability. */
export const marketingPhotos = manifest as Record<
  "hero" | "sedan" | "luxury" | "van" | "suv",
  MarketingPhoto | null
>;
