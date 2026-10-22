import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dateTime, money } from "@/lib/entities";
import { MediaUpload } from "@/components/media-upload";
import { DriverInvitation } from "@/components/driver-invitation";
export async function RecordContext({
  entity,
  record,
  page,
}: {
  entity: string;
  record: Record<string, string | number | boolean | null>;
  page: number;
}) {
  const { supabase, member } = await requireStaff();
  const id = String(record.id);
  const org = member.organization_id;
  const offset = (page - 1) * 25;
  let imageUrl: string | undefined;
  if (["vehicles", "locations"].includes(entity) && record.image_path) {
    const result = await supabase.storage
      .from("business-media")
      .createSignedUrl(String(record.image_path), 300);
    imageUrl = result.data?.signedUrl;
  }
  const media =
    ["vehicles", "locations"].includes(entity) && ["owner", "manager"].includes(member.role) ? (
      <MediaUpload
        entity={entity}
        id={id}
        version={String(record.updated_at)}
        imageUrl={imageUrl}
      />
    ) : imageUrl ? (
      <picture>
        <img src={imageUrl} alt={String(record.name)} className="max-h-72 rounded-xl mt-6" />
      </picture>
    ) : null;
  if (["drivers", "customers"].includes(entity)) {
    const request = supabase
      .from("bookings")
      .select("id,reference,status,pickup_at,end_at,price_aed,archived", { count: "exact" })
      .eq("organization_id", org)
      .eq(entity === "drivers" ? "driver_id" : "customer_id", id)
      .order("pickup_at", { ascending: false })
      .range(offset, offset + 24);
    const { data, count, error } = await request;
    if (error) throw new Error("Unable to load booking history.");
    let available: boolean | undefined;
    if (entity === "drivers") {
      const result = await supabase.rpc("driver_is_available", { target_driver_id: id });
      if (result.error) throw new Error("Unable to verify driver availability.");
      available = result.data;
    }
    return (
      <>
        {entity === "drivers" && (
          <p className="notice mt-6">
            {available ? "Available now" : "Not available now"} · Based on recorded status, licence,
            account access and confirmed/active assignments. Future schedule conflicts are checked
            when a booking is confirmed.
          </p>
        )}
        {entity === "drivers" && member.role === "owner" && !record.archived && (
          <DriverInvitation id={id} linked={!!record.auth_user_id} />
        )}
        <section className="panel mt-6 overflow-hidden">
          <h2 className="font-semibold p-6">
            {entity === "drivers" ? "Assigned bookings" : "Customer booking history"}
          </h2>
          {data?.length ? (
            <div className="overflow-x-auto">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Pickup · UAE</th>
                    <th>Status</th>
                    <th>Agreed fare</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link className="underline" href={`/admin/bookings/${row.id}`}>
                          {row.reference}
                        </Link>
                        {row.archived ? " · archived" : ""}
                      </td>
                      <td>{dateTime(row.pickup_at)}</td>
                      <td>{row.status}</td>
                      <td>{money(Number(row.price_aed))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted px-6 pb-6">No related bookings recorded.</p>
          )}
        </section>
        <HistoryPagination page={page} count={count ?? 0} path={`/admin/${entity}/${id}`} />
      </>
    );
  }
  if (entity !== "bookings") return media;
  const [customer, statuses, assignments, payments] = await Promise.all([
    supabase
      .from("customers")
      .select("name,email,phone")
      .eq("organization_id", org)
      .eq("id", String(record.customer_id))
      .single(),
    supabase
      .from("booking_status_history")
      .select("id,old_status,new_status,reason,created_at", { count: "exact" })
      .eq("organization_id", org)
      .eq("booking_id", id)
      .order("id", { ascending: false })
      .range(offset, offset + 24),
    supabase
      .from("booking_assignments")
      .select("id,created_at,drivers(name),vehicles(name)", { count: "exact" })
      .eq("organization_id", org)
      .eq("booking_id", id)
      .order("id", { ascending: false })
      .range(offset, offset + 24),
    supabase.rpc("booking_financials", { target_booking_id: id }),
  ]);
  if (customer.error || statuses.error || assignments.error || payments.error)
    throw new Error("Unable to load booking details.");
  const audit = ["owner", "manager"].includes(member.role)
    ? await supabase
        .from("audit_events")
        .select("id,operation,changed_fields,created_at", { count: "exact" })
        .eq("organization_id", org)
        .eq("table_name", "bookings")
        .eq("record_id", id)
        .order("id", { ascending: false })
        .range(offset, offset + 24)
    : null;
  if (audit?.error) throw new Error("Unable to load audit records.");
  const changes = assignments.data as unknown as {
    id: number;
    created_at: string;
    drivers: { name: string } | null;
    vehicles: { name: string } | null;
  }[];
  return (
    <>
      <section className="panel p-6 mt-6 grid sm:grid-cols-2 gap-6">
        <div>
          <h2 className="font-semibold mb-4">Passenger contact</h2>
          <p className="text-sm">{customer.data.name}</p>
          {customer.data.email && <p className="text-sm mt-2 break-words">{customer.data.email}</p>}
          <p className="text-sm mt-2">{customer.data.phone}</p>
          <Link
            className="text-xs underline mt-4 inline-block"
            href={`/admin/customers/${record.customer_id}`}
          >
            Customer history
          </Link>
        </div>
        <div>
          <h2 className="font-semibold mb-4">Payment verification</h2>
          <p className="text-sm">Net provider-verified payments: {money(Number(payments.data))}</p>
          <p className="text-xs text-muted mt-3">
            No manual payment success is accepted. Agreed fare: {money(Number(record.price_aed))}.
          </p>
          <p className="text-xs text-muted mt-4">
            Flight status: {String(record.flight_status).replaceAll("_", " ")} · Manually recorded
            {record.flight_status_updated_at
              ? ` at ${dateTime(String(record.flight_status_updated_at))}`
              : ""}
          </p>
          {record.return_of_booking_id && (
            <Link
              className="text-xs underline block mt-4"
              href={`/admin/bookings/${record.return_of_booking_id}`}
            >
              Outbound booking
            </Link>
          )}
          {record.enquiry_id && (
            <Link
              className="text-xs underline block mt-3"
              href={`/admin/enquiries/${record.enquiry_id}`}
            >
              Original enquiry
            </Link>
          )}
        </div>
      </section>
      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <section className="panel p-6">
          <h2 className="font-semibold mb-5">Booking status history</h2>
          {statuses.data?.length ? (
            statuses.data.map((row) => (
              <div className="text-sm border-t border-stone-100 py-4" key={row.id}>
                <p>
                  {row.old_status ?? "Created"} → {row.new_status}
                </p>
                <p className="text-xs text-muted mt-2">{dateTime(row.created_at)}</p>
                {row.reason && (
                  <p className="text-xs mt-2 whitespace-pre-wrap">Reason: {row.reason}</p>
                )}
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No status changes recorded.</p>
          )}
        </section>
        <section className="panel p-6">
          <h2 className="font-semibold mb-5">Assignment history</h2>
          {changes?.length ? (
            changes.map((row) => (
              <div className="text-sm border-t border-stone-100 py-4" key={row.id}>
                <p>
                  {row.drivers?.name ?? "Driver unassigned"} ·{" "}
                  {row.vehicles?.name ?? "Vehicle unassigned"}
                </p>
                <p className="text-xs text-muted mt-2">{dateTime(row.created_at)}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-muted">No assignment changes recorded.</p>
          )}
        </section>
      </div>
      {audit && (
        <section className="panel p-6 mt-6">
          <h2 className="font-semibold mb-5">Audit information</h2>
          {audit.data?.length ? (
            audit.data.map((row) => (
              <p className="text-xs text-muted border-t border-stone-100 py-3" key={row.id}>
                {dateTime(row.created_at)} · {row.operation} · Changed fields:{" "}
                {row.changed_fields.join(", ")}
              </p>
            ))
          ) : (
            <p className="text-sm text-muted">No audit events recorded.</p>
          )}
        </section>
      )}
      <HistoryPagination
        page={page}
        count={Math.max(statuses.count ?? 0, assignments.count ?? 0, audit?.count ?? 0)}
        path={`/admin/bookings/${id}`}
      />
    </>
  );
}
function HistoryPagination({ page, count, path }: { page: number; count: number; path: string }) {
  return (
    <div className="flex justify-between text-xs text-muted mt-5">
      <span>History page {page}</span>
      <div className="flex gap-5">
        {page > 1 && <Link href={`${path}?history_page=${page - 1}`}>Newer activity</Link>}
        {page * 25 < count && <Link href={`${path}?history_page=${page + 1}`}>Older activity</Link>}
      </div>
    </div>
  );
}
