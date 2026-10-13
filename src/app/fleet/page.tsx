import Link from "next/link";
import { websiteContent } from "@/lib/website";
import { FleetGallery } from "@/components/fleet-gallery";
export const dynamic = "force-dynamic";
export const metadata = { title: "Our published fleet" };
export default async function Fleet() {
  const { fleet } = await websiteContent();
  return (
    <main className="max-w-7xl mx-auto p-5 sm:p-8 py-14 space-y-6">
      <Link className="brand" href="/">
        HAMDI TOURISM
      </Link>
      <p className="eyebrow">OUR FLEET</p>
      <h1 className="text-4xl font-semibold">Your journey. The right vehicle.</h1>
      <p className="text-muted max-w-2xl">
        Explore vehicles our team has published, with their actual passenger and luggage capacities.
        Your exact assignment and availability are confirmed when we review your transfer.
      </p>
      <FleetGallery fleet={fleet} />
      <Link href="/book" className="button mt-6">
        Plan your transfer
      </Link>
    </main>
  );
}
