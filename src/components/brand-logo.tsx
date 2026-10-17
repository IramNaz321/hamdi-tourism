import Link from "next/link";

/** One intrinsic-width wordmark prevents parent flex/grid alignment from moving the subtitle. */
export function BrandLogo({
  className = "",
  imageUrl,
  name = "HAMDI TOURISM",
}: {
  className?: string;
  imageUrl?: string | null;
  name?: string;
}) {
  return (
    <Link href="/" aria-label={`${name} home`} className={`brand ${className}`}>
      {imageUrl ? (
        <picture>
          <img src={imageUrl} alt={name} className="max-h-14 w-auto max-w-48" />
        </picture>
      ) : (
        <>
          <b className="brand-title">HAMDI</b>
          <span className="brand-subtitle">TOURISM</span>
        </>
      )}
    </Link>
  );
}
