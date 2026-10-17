import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient, isConfigured } from "@/lib/supabase/server";
import { snapshotSchema } from "@/lib/tracking";
import { LiveTracking } from "@/components/live-tracking";
export const dynamic = "force-dynamic";
export const metadata = { title: "Your journey", robots: { index: false, follow: false } };
export default async function Tracking({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  if (!isConfigured())
    return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold">Tracking unavailable</h1>
        <p className="mt-4">Please contact Hamdi Tourism for journey information.</p>
      </main>
    );
  const client = await createClient();
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();
  if (authError || !user) redirect(`/login?next=${encodeURIComponent(`/track/${id}`)}`);
  const { data, error } = await client.rpc("tracking_snapshot", { trip_id: id });
  if (error || !snapshotSchema.safeParse(data).success)
    return (
      <main className="max-w-xl mx-auto p-8">
        <h1 className="text-2xl font-semibold">Tracking access unavailable</h1>
        <p className="mt-4">
          This journey is not available to your account, your access expired, or tracking is not
          configured. Ask the operations team to verify your booking access.
        </p>
      </main>
    );
  return (
    <main className="max-w-3xl mx-auto p-5 py-10">
      <h1 className="text-3xl font-semibold mb-6">Your journey</h1>
      <LiveTracking tripId={id} />
    </main>
  );
}
