import { requireStaff } from "@/lib/auth";
import { money } from "@/lib/entities";
export default async function Reports() {
  const { supabase, member } = await requireStaff();
  const [summary, finance] = await Promise.all([
    supabase.rpc("dashboard_summary"),
    supabase.rpc("dashboard_financials"),
  ]);
  if (summary.error || finance.error || !summary.data || !finance.data?.[0])
    throw new Error("Unable to load reports.");
  const statuses = ["pending", "confirmed", "in_progress", "completed", "cancelled"];
  const counts = await Promise.all(
    statuses.map((status) =>
      supabase
        .from("bookings")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", member.organization_id)
        .eq("status", status),
    ),
  );
  if (counts.some((r) => r.error)) throw new Error("Unable to load booking reports.");
  return (
    <>
      <p className="eyebrow mb-3">BUSINESS REPORTS</p>
      <h1 className="text-3xl font-semibold mb-3">Reports</h1>
      <p className="text-sm text-muted mb-8">
        All-time totals from your business records, including archived history.
      </p>
      <div className="grid sm:grid-cols-2 gap-5">
        <section className="panel p-7">
          <h2 className="text-sm text-muted mb-4">Verified revenue · completed journeys</h2>
          <p className="text-3xl font-semibold">{money(summary.data.verified_revenue)}</p>
          <p className="text-xs text-muted mt-5">
            Provider-confirmed charges less provider-confirmed refunds. No verified provider records
            means zero revenue.
          </p>
        </section>
        <section className="panel p-7">
          <h2 className="text-sm text-muted mb-4">Outstanding agreed fares</h2>
          <p className="text-3xl font-semibold">
            {money(Number(finance.data[0].outstanding_total))}
          </p>
          <p className="text-xs text-muted mt-5">
            Noncancelled, nonarchived fares less verified payments. This is an operational balance,
            not a payment confirmation.
          </p>
        </section>
      </div>
      <section className="panel p-7 mt-6">
        <h2 className="font-semibold mb-6">Booking outcomes</h2>
        <dl className="grid sm:grid-cols-5 gap-6">
          {statuses.map((status, index) => (
            <div key={status}>
              <dt className="text-sm text-muted capitalize">{status.replaceAll("_", " ")}</dt>
              <dd className="text-3xl font-semibold mt-3">{counts[index].count ?? 0}</dd>
            </div>
          ))}
        </dl>
      </section>
    </>
  );
}
