import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dateTime } from "@/lib/entities";

export default async function ManualEnquiries({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, parseInt(query.page ?? "1", 10) || 1));
  const { supabase, member } = await requireStaff();
  let request = supabase
    .from("unpriced_transfer_enquiries")
    .select("id,reference,name,pickup_at,status", { count: "exact" })
    .eq("organization_id", member.organization_id)
    .eq("archived", false);
  if (["new", "reviewed", "closed"].includes(query.status ?? ""))
    request = request.eq("status", query.status);
  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (error && !["42P01", "PGRST205"].includes(error.code))
    throw new Error("Unable to load manual quote requests.");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  return (
    <>
      <p className="eyebrow mb-3">NO AUTOMATIC FARE</p>
      <h1 className="text-3xl font-semibold mb-3">Manual quote requests</h1>
      <p className="text-sm text-muted mb-7">
        These customer requests have no instant price. Review the actual route and address, then
        contact the customer with a separately verified offer. They are not bookings or confirmed
        vehicle availability.
      </p>
      {error ? (
        <section className="panel p-6">
          <h2 className="font-semibold">Manual enquiry storage is not enabled</h2>
          <p className="text-sm text-muted mt-3">
            The owner must review and explicitly approve the additive migration for secure
            unpriced-enquiry capture. No enquiry can be stored until it is safely installed.
          </p>
        </section>
      ) : (
        <>
          <form className="flex flex-wrap items-end gap-4 mb-6">
            <label className="field">
              Status
              <select name="status" defaultValue={query.status ?? ""}>
                <option value="">All</option>
                {["new", "reviewed", "closed"].map((status) => (
                  <option key={status}>{status}</option>
                ))}
              </select>
            </label>
            <button className="button">Filter</button>
          </form>
          <section className="panel overflow-hidden">
            {data?.length ? (
              <div className="overflow-x-auto">
                <table className="admin-table">
                  <thead>
                    <tr><th>Reference</th><th>Customer</th><th>Pickup · UAE</th><th>Status</th></tr>
                  </thead>
                  <tbody>
                    {data.map((row) => (
                      <tr key={row.id}>
                        <td><Link className="font-semibold" href={`/admin/manual-enquiries/${row.id}`}>{row.reference}</Link></td>
                        <td>{row.name}</td>
                        <td>{dateTime(row.pickup_at)}</td>
                        <td><span className="badge">{row.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-12 text-center">
                <h2 className="font-semibold">No manual quote requests</h2>
                <p className="text-sm text-muted mt-3">Requests appear here after a customer submits one.</p>
              </div>
            )}
          </section>
          <div className="flex justify-between text-xs text-muted mt-5">
            <span>{count ?? 0} requests · Page {page}</span>
            <div className="flex gap-5">
              {page > 1 && <Link href={`/admin/manual-enquiries?${params}&page=${page - 1}`}>Previous</Link>}
              {page * 25 < (count ?? 0) && <Link href={`/admin/manual-enquiries?${params}&page=${page + 1}`}>Next</Link>}
            </div>
          </div>
        </>
      )}
    </>
  );
}
