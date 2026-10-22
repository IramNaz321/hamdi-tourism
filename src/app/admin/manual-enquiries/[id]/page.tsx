import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { dateTime } from "@/lib/entities";
import { ManualEnquiryReview } from "@/components/manual-enquiry-review";

export default async function ManualEnquiry({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, member } = await requireStaff();
  const { data: row, error } = await supabase
    .from("unpriced_transfer_enquiries")
    .select(
      "*,pickup:locations!unpriced_transfer_enquiries_organization_id_pickup_location_id_fkey(name),dropoff:locations!unpriced_transfer_enquiries_organization_id_dropoff_location_id_fkey(name)",
    )
    .eq("organization_id", member.organization_id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Unable to load manual quote request.");
  if (!row) notFound();
  return (
    <>
      <Link href="/admin/manual-enquiries" className="text-sm text-muted">← Manual quote requests</Link>
      <h1 className="text-3xl font-semibold mt-6 mb-3">{row.reference}</h1>
      <p className="text-sm text-muted mb-7">{row.status} · Received {dateTime(row.created_at)}</p>
      <dl className="panel p-7 grid sm:grid-cols-2 gap-6">
        {[
          ["Name", row.name],
          ["Email", row.email],
          ["Phone", row.phone],
          ["Route", `${row.pickup.name} → ${row.dropoff.name}`],
          ["Pickup address / landmark", row.pickup_address ?? "—"],
          ["Drop-off address / landmark", row.dropoff_address ?? "—"],
          ["Pickup · UAE", dateTime(row.pickup_at)],
          ["Return · UAE", row.return_at ? dateTime(row.return_at) : "One way"],
          ["Passengers / luggage", `${row.passengers} / ${row.luggage}`],
          ["Vehicle category requested", row.vehicle_category],
          ["Flight number", row.flight_number ?? "Not provided"],
          ["Customer notes", row.notes ?? "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted mb-2">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted mt-4">
        No fare was calculated or promised. Verify the route, operating costs and actual capacity
        before contacting the customer; this request is not a booking.
      </p>
      {["owner", "manager", "dispatcher"].includes(member.role) && (
        <ManualEnquiryReview id={id} version={row.updated_at} status={row.status} />
      )}
    </>
  );
}
