import Link from "next/link";
import {
  CalendarDays,
  CarFront,
  UserRound,
  ArrowUpRight,
  Plus,
  CalendarCheck,
  Route,
  Wallet,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { money, dateTime, canWrite } from "@/lib/entities";
import { OperationsUpdates } from "@/components/operations-updates";
export default async function Dashboard() {
  const { supabase, member } = await requireStaff();
  const { data: summary, error } = await supabase.rpc("dashboard_summary");
  if (error || !summary) throw new Error("Unable to load dashboard.");
  const { data: upcoming, error: upcomingError } = await supabase
    .from("bookings")
    .select("id,reference,pickup_at,status,price_aed")
    .eq("organization_id", member.organization_id)
    .eq("archived", false)
    .in("status", ["pending", "confirmed", "in_progress"])
    .gte("pickup_at", new Date().toISOString())
    .order("pickup_at")
    .limit(6);
  if (upcomingError) throw new Error("Unable to load upcoming journeys.");
  const cards = [
    { title: "Total Bookings", key: "total_bookings", icon: CalendarDays, href: "bookings" },
    { title: "Today's Bookings", key: "today_bookings", icon: CalendarCheck, href: "bookings" },
    { title: "Active Trips", key: "active_trips", icon: Route, href: "operations" },
    { title: "Available Drivers", key: "available_drivers", icon: UserRound, href: "drivers" },
    { title: "Registered Vehicles", key: "registered_vehicles", icon: CarFront, href: "vehicles" },
    { title: "Verified Completed Revenue", key: "verified_revenue", icon: Wallet, href: "reports" },
  ];
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-5 mb-8">
        <div>
          <p className="eyebrow mb-3">YOUR BUSINESS AT A GLANCE</p>
          <h1 className="text-3xl font-semibold">Dashboard</h1>
          <p className="text-sm text-muted mt-3">
            Your team, fleet and journeys in one place. Dates use UAE time.
          </p>
        </div>
        {canWrite(member.role, "bookings") && (
          <Link className="button" href="/admin/bookings/new">
            <Plus size={17} />
            New booking
          </Link>
        )}
      </div>
      <OperationsUpdates organizationId={member.organization_id} />
      <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-5 mt-6">
        {cards.map(({ title, key, icon: Icon, href }) => {
          if (typeof summary[key] !== "number") throw new Error("Invalid dashboard totals.");
          return (
            <Link className="panel p-6 hover:border-brand" key={key} href={`/admin/${href}`}>
              <div className="flex justify-between items-center mb-5">
                <span className="rounded-xl bg-canvas p-3">
                  <Icon size={22} className="text-brand" />
                </span>
                <ArrowUpRight size={16} className="text-muted" />
              </div>
              <p className="text-3xl font-semibold">
                {key === "verified_revenue" ? money(summary[key]) : summary[key]}
              </p>
              <p className="text-sm text-muted mt-2">{title}</p>
            </Link>
          );
        })}
      </div>
      <section className="panel mt-7 overflow-hidden">
        <div className="p-6 flex justify-between items-center border-b border-stone-100">
          <h2 className="font-semibold">Upcoming journeys</h2>
          <Link className="text-xs text-muted" href="/admin/bookings">
            All bookings →
          </Link>
        </div>
        {upcoming?.length ? (
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
                {upcoming.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <Link className="font-semibold" href={`/admin/bookings/${b.id}`}>
                        {b.reference}
                      </Link>
                    </td>
                    <td>{dateTime(b.pickup_at)}</td>
                    <td>
                      <span className="badge">{b.status.replaceAll("_", " ")}</span>
                    </td>
                    <td>{money(Number(b.price_aed))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-16 text-center">
            <CalendarCheck size={36} className="text-muted mx-auto mb-4" />
            <h3 className="font-semibold">No upcoming journeys</h3>
            <p className="text-sm text-muted mt-3">Your scheduled transfers will appear here.</p>
          </div>
        )}
      </section>
      <p className="text-xs text-muted mt-5">
        Revenue includes net provider-verified payments for completed journeys. No payment provider
        is connected by default; manual fares and historical payment labels do not count as revenue.
      </p>
      <div className="flex flex-wrap gap-4 mt-6">
        <Link className="button secondary" href="/admin/enquiries">
          Review transfer enquiries
        </Link>
        <Link className="button secondary" href="/admin/operations">
          Open live operations
        </Link>
      </div>
    </>
  );
}
