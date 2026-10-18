import Link from "next/link";
import { requireOwner } from "@/lib/auth";
import { FareDraftForm } from "@/components/fare-draft-form";
import { vehicleCategories } from "@/lib/vehicle-categories";

export default async function FareReview() {
  const { supabase, member } = await requireOwner();
  const [routes, vehicles, prices] = await Promise.all([
    supabase
      .from("routes")
      .select("id,name,pickup_location_id,dropoff_location_id")
      .eq("organization_id", member.organization_id)
      .eq("archived", false)
      .order("name"),
    supabase
      .from("vehicles")
      .select("category")
      .eq("organization_id", member.organization_id)
      .eq("archived", false),
    supabase
      .from("route_pricing")
      .select("id,route_id,vehicle_category,public_listed")
      .eq("organization_id", member.organization_id)
      .eq("archived", false),
  ]);
  if (routes.error || vehicles.error || prices.error)
    throw new Error("Unable to load fare review data.");
  const categories = vehicleCategories.filter((item) =>
    vehicles.data?.some((vehicle) => vehicle.category === item.code),
  );
  const priceByKey = new Map(
    prices.data?.map((price) => [`${price.route_id}:${price.vehicle_category}`, price]),
  );
  return (
    <>
      <p className="eyebrow mb-3">OWNER-ONLY · UNPUBLISHED</p>
      <h1 className="text-3xl font-semibold mb-3">Fare review & draft import</h1>
      <p className="text-sm text-muted mb-7">
        Use public competitor rates only as comparison evidence. Enter fares from your actual
        operating costs for routes and vehicle categories already in your account. Saving here
        creates a private draft; it never adds a route or vehicle and never enables customer quotes.
      </p>
      <section className="panel p-6 mb-7">
        <h2 className="font-semibold mb-3">Dubai DXB competitor reference · 18 Oct 2026</h2>
        <p className="text-xs text-muted mb-4">
          Transfeero public route pages, converted using the ECB 16 Oct 2026 EUR/USD reference
          (1.1253) and the UAE dirham&apos;s USD peg (AED 3.6725/USD): approximately AED 4.1327/EUR.
          Competitor-only, route-specific starting examples; not Hamdi Tourism prices.
        </p>
        <div className="overflow-x-auto">
          <table className="admin-table">
            <thead>
              <tr>
                <th>DXB route / listed distance</th>
                <th>Economy</th>
                <th>Standard sedan</th>
                <th>Standard van</th>
                <th>Other categories</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Downtown / Burj Khalifa · 15 km</td>
                <td>~AED 105.26</td>
                <td>~AED 175.39</td>
                <td>~AED 182.79</td>
                <td>No sample published</td>
              </tr>
              <tr>
                <td>Palm Jumeirah · 34 km</td>
                <td>~AED 108.07</td>
                <td>~AED 180.10</td>
                <td>~AED 193.99</td>
                <td>No sample published</td>
              </tr>
              <tr>
                <td>DWC, Marina/JBR, Deira, Jumeirah & other hotels</td>
                <td>No comparable sample retrieved</td>
                <td>No comparable sample retrieved</td>
                <td>No comparable sample retrieved</td>
                <td>No comparable sample retrieved</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted mt-4">
          Sources:{" "}
          <a className="underline" href="https://www.transfeero.com/en/dubai-airport-transfers-dxb/transfer-from-dubai-airport-to-burj-khalifa-building/">
            Transfeero DXB → Burj Khalifa
          </a>
          ;{" "}
          <a className="underline" href="https://www.transfeero.com/en/dubai-airport-transfers-dxb/transfer-from-dubai-airport-to-palm-jumeirah-islands/">
            Transfeero DXB → Palm Jumeirah
          </a>
          ;{" "}
          <a className="underline" href="https://www.ecb.europa.eu/stats/eurofxref/eurofxref-daily.xml">
            ECB euro reference rates
          </a>
          . Final AED conversions are approximate, not provider checkout quotes.
        </p>
        <p className="text-xs text-muted mt-3">
          Transfeero states its own DXB airport meet-and-greet includes 60 minutes&apos; arrival wait
          (15 minutes for other pickups) and its fares include Salik. It describes Salik as AED 4–6
          per crossing with time/day variation. These are competitor terms only. Before pricing,
          set your own Salik inclusion/pass-through policy, night-service policy, included wait and
          overtime, luggage limits, child-seat/oversize-bag rules and route-specific hotel access.
        </p>
      </section>
      {(!routes.data?.length || !categories.length) && (
        <section className="panel p-6 mb-7">
          <h2 className="font-semibold">Owner setup needed before fare review</h2>
          <ol className="list-decimal pl-5 mt-3 space-y-2 text-sm text-muted">
            {!routes.data?.length && (
              <li>
                Add only verified pickup/drop-off locations and routes in{" "}
                <Link className="underline" href="/admin/locations">Locations</Link> and{" "}
                <Link className="underline" href="/admin/routes">Routes</Link>.
              </li>
            )}
            {!categories.length && (
              <li>
                Enter the actual fleet and categories in <Link className="underline" href="/admin/vehicles">Vehicles</Link>.
              </li>
            )}
            <li>Decide real vehicle capacity, business costs, fare/toll rules and included waiting.</li>
            <li>Enter a reviewed fare draft below, then publish only through Route pricing after owner approval.</li>
          </ol>
        </section>
      )}
      <section className="space-y-5">
        {routes.data?.flatMap((route) =>
          categories.map((category) => {
            const existing = priceByKey.get(`${route.id}:${category.code}`);
            return (
              <article className="panel p-6" key={`${route.id}:${category.code}`}>
                <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
                  <div>
                    <h2 className="font-semibold">{route.name}</h2>
                    <p className="text-sm text-muted mt-1">{category.name}</p>
                  </div>
                  {existing ? (
                    <Link className="button secondary" href={`/admin/route_pricing/${existing.id}`}>
                      Review existing fare · {existing.public_listed ? "published" : "unpublished"}
                    </Link>
                  ) : null}
                </div>
                {existing ? (
                  <p className="text-sm text-muted">
                    This real route/category already has a fare. Review it in Route pricing; this
                    workflow will not overwrite or unpublish it.
                  </p>
                ) : (
                  <FareDraftForm routeId={route.id} category={category.code} />
                )}
              </article>
            );
          }),
        )}
      </section>
    </>
  );
}
