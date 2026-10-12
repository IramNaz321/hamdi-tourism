import Link from "next/link";
import { requireStaff } from "@/lib/auth";
import { dateTime, money } from "@/lib/entities";
export default async function Enquiries({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string; q?: string }>;
}) {
  const query = await searchParams;
  const page = Math.max(1, Math.min(100000, parseInt(query.page ?? "1", 10) || 1));
  const { supabase, member } = await requireStaff();
  let request = supabase
    .from("booking_enquiries")
    .select("id,reference,name,pickup_at,status,quoted_outbound_aed,quoted_return_aed", {
      count: "exact",
    })
    .eq("organization_id", member.organization_id);
  if (["new", "reviewed", "converted", "closed"].includes(query.status ?? ""))
    request = request.eq("status", query.status);
  if (query.q)
    request = request.ilike("reference", `%${query.q.slice(0, 100).replace(/[\\%_]/g, "\\$&")}%`);
  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .range((page - 1) * 25, page * 25 - 1);
  if (error) throw new Error("Unable to load enquiries.");
  const params = new URLSearchParams();
  if (query.status) params.set("status", query.status);
  if (query.q) params.set("q", query.q);
  return (
    <>
      <p className="eyebrow mb-3">CUSTOMER ENQUIRIES</p>
      <h1 className="text-3xl font-semibold mb-3">Transfer enquiries</h1>
      <p className="text-sm text-muted mb-7">
        Review genuine submitted requests before creating or confirming bookings.
      </p>
      <form className="flex flex-wrap gap-4 mb-6">
        <label className="field">
          Reference
          <input name="q" defaultValue={query.q} />
        </label>
        <label className="field">
          Status
          <select name="status" defaultValue={query.status ?? ""}>
            <option value="">All</option>
            {["new", "reviewed", "converted", "closed"].map((status) => (
              <option key={status}>{status}</option>
            ))}
          </select>
        </label>
        <button className="button self-end">Search</button>
      </form>
      <section className="panel overflow-hidden">
        {data?.length ? (
          <div className="overflow-x-auto">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Customer</th>
                  <th>Pickup · UAE</th>
                  <th>Submitted quote</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <Link className="font-semibold" href={`/admin/enquiries/${row.id}`}>
                        {row.reference}
                      </Link>
                    </td>
                    <td>{row.name}</td>
                    <td>{dateTime(row.pickup_at)}</td>
                    <td>
                      {money(Number(row.quoted_outbound_aed) + Number(row.quoted_return_aed ?? 0))}
                    </td>
                    <td>
                      <span className="badge">{row.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-12 text-center">
            <h2 className="font-semibold">No enquiries found</h2>
            <p className="text-sm text-muted mt-3">
              Customer transfer requests will appear here when received.
            </p>
          </div>
        )}
      </section>
      <div className="flex justify-between text-xs text-muted mt-5">
        <span>
          {count ?? 0} enquiries · Page {page}
        </span>
        <div className="flex gap-5">
          {page > 1 && <Link href={`/admin/enquiries?${params}&page=${page - 1}`}>Previous</Link>}
          {page * 25 < (count ?? 0) && (
            <Link href={`/admin/enquiries?${params}&page=${page + 1}`}>Next</Link>
          )}
        </div>
      </div>
    </>
  );
}
