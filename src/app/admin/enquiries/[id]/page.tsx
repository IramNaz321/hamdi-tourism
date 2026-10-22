import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { dateTime, money } from "@/lib/entities";
import { EnquiryReview } from "@/components/enquiry-review";
export default async function Enquiry({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, member } = await requireStaff();
  const { data: row, error } = await supabase
    .from("booking_enquiries")
    .select(
      "*,pickup:locations!booking_enquiries_organization_id_pickup_location_id_fkey(name),dropoff:locations!booking_enquiries_organization_id_dropoff_location_id_fkey(name)",
    )
    .eq("organization_id", member.organization_id)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("Unable to load enquiry.");
  if (!row) notFound();
  const { data: bookings, error: bookingError } = await supabase
    .from("bookings")
    .select("id,reference,status")
    .eq("organization_id", member.organization_id)
    .eq("enquiry_id", id);
  if (bookingError) throw new Error("Unable to load converted bookings.");
  const snapshot = row.pricing_snapshot as {
    extras?: { id: string; name: string; price_aed: number; charge_basis: string }[];
  };
  const selectedIds = row.extras as string[];
  const requestedExtras = (snapshot.extras ?? [])
    .filter((extra) => selectedIds.includes(extra.id))
    .map(
      (extra) =>
        `${extra.name} · ${money(Number(extra.price_aed))} ${extra.charge_basis === "per_leg" ? "per leg" : "per enquiry"}`,
    )
    .join("\n");
  return (
    <>
      <Link href="/admin/enquiries" className="text-sm text-muted">
        ← Transfer enquiries
      </Link>
      <h1 className="text-3xl font-semibold mt-6 mb-3">{row.reference}</h1>
      <p className="text-sm text-muted mb-7">
        {row.status} · Received {dateTime(row.created_at)}
      </p>
      <dl className="panel p-7 grid sm:grid-cols-2 gap-6">
        {[
          ["Name", row.name],
          ["Email", row.email],
          ["Phone", row.phone],
          ["Route", `${row.pickup.name} → ${row.dropoff.name}`],
          ["Pickup · UAE", dateTime(row.pickup_at)],
          ["Return · UAE", row.return_at ? dateTime(row.return_at) : "One way"],
          ["Passengers / luggage", `${row.passengers} / ${row.luggage}`],
          ["Vehicle category", row.vehicle_category],
          ["Flight number", row.flight_number ?? "Not provided"],
          [
            "Submitted quote",
            money(Number(row.quoted_outbound_aed) + Number(row.quoted_return_aed ?? 0)),
          ],
          ["Requested optional extras", requestedExtras || "No optional extras requested"],
          ["Notes", row.notes ?? "—"],
        ].map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-muted mb-2">{label}</dt>
            <dd className="text-sm whitespace-pre-wrap break-words">{value}</dd>
          </div>
        ))}
      </dl>
      <p className="text-xs text-muted mt-4">
        This is the submitted quote, not a confirmed booking or payment. Any changes must be agreed
        with the customer.
      </p>
      {["owner", "manager", "dispatcher"].includes(member.role) &&
        ["new", "reviewed"].includes(row.status) && (
          <EnquiryReview
            id={id}
            version={row.updated_at}
            returnTransfer={row.transfer_type === "return"}
          />
        )}
      <section className="panel p-6 mt-6">
        <h2 className="font-semibold mb-4">Related bookings</h2>
        {bookings?.length ? (
          bookings.map((b) => (
            <p key={b.id} className="text-sm mt-3">
              <Link href={`/admin/bookings/${b.id}`} className="underline">
                {b.reference}
              </Link>{" "}
              · {b.status}
            </p>
          ))
        ) : (
          <p className="text-sm text-muted">No bookings have been created from this enquiry.</p>
        )}
      </section>
    </>
  );
}
