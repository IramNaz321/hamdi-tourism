import Link from "next/link";
import {
  CalendarDays,
  CarFront,
  UserRound,
  Users,
  ArrowUpRight,
  Plus,
  CalendarCheck,
} from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { money, dateTime, canWrite } from "@/lib/entities";
export default async function Dashboard() {
  const { supabase, member } = await requireStaff();
  const tables = ["bookings", "drivers", "vehicles", "customers"];
  const counts = await Promise.all(
    tables.map((table) =>
      supabase
        .from(table)
        .select("id", { count: "exact", head: true })
        .eq("organization_id", member.organization_id)
        .eq("archived", false),
    ),
  );
  if (counts.some((result) => result.error)) throw new Error("Unable to load dashboard totals.");
  const { data: finance, error: financeError } = await supabase.rpc("dashboard_financials");
  if (financeError || !finance || finance.length !== 1)
    throw new Error("Unable to load financial summary.");
  const { data: upcoming, error } = await supabase
    .from("bookings")
    .select("id,reference,pickup_at,status,price_aed")
    .eq("organization_id", member.organization_id)
    .eq("archived", false)
    .in("status", ["pending", "confirmed", "in_progress"])
    .gte("pickup_at", new Date().toISOString())
    .order("pickup_at")
    .limit(6);
  if (error) throw new Error("Unable to load upcoming journeys.");
  const cards = [
    { title: "Active bookings", icon: CalendarDays, href: "bookings" },
    { title: "Drivers", icon: UserRound, href: "drivers" },
    { title: "Vehicles", icon: CarFront, href: "vehicles" },
    { title: "Customers", icon: Users, href: "customers" },
  ];
  return (
    <>
      <div className="flex flex-wrap items-start justify-between gap-5 mb-9">
        <div>
          <p className="eyebrow mb-3">YOUR BUSINESS AT A GLANCE</p>
          <h1 className="text-3xl font-semibold tracking-tight">Overview</h1>
          <p className="text-sm text-muted mt-3">
            Manage your team, fleet and every journey in one place.
          </p>
        </div>
        {canWrite(member.role, "bookings") && (
          <Link className="button" href="/admin/bookings/new">
            <Plus size={17} /> New booking
          </Link>
        )}
      </div>
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {cards.map(({ title, icon: Icon, href }, index) => (
          <Link key={href} href={`/admin/${href}`} className="panel p-6 hover:border-brand">
            <div className="flex justify-between items-center mb-6">
              <span className="rounded-xl bg-canvas p-3">
                <Icon size={21} className="text-brand" />
              </span>
              <ArrowUpRight size={16} className="text-muted" />
            </div>
            <p className="text-3xl font-semibold">{counts[index].count ?? 0}</p>
            <p className="text-sm text-muted mt-2">{title}</p>
          </Link>
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-6 mt-7">
        <section className="panel lg:col-span-2 overflow-hidden">
          <div className="p-6 flex justify-between gap-4 items-center border-b border-stone-100">
            <h2 className="font-semibold">Upcoming journeys</h2>
            <Link className="text-xs text-muted" href="/admin/bookings">
              All bookings →
            </Link>
          </div>
          {upcoming?.length ? (
            <div className="overflow-auto">
              <table className="admin-table">
                <caption className="sr-only">Upcoming journeys, UAE time</caption>
                <thead>
                  <tr>
                    <th>Booking</th>
                    <th>Pickup · UAE</th>
                    <th>Status</th>
                    <th>Fare</th>
                  </tr>
                </thead>
                <tbody>
                  {upcoming.map((booking) => (
                    <tr key={booking.id}>
                      <td>
                        <Link className="font-semibold" href={`/admin/bookings/${booking.id}`}>
                          {booking.reference}
                        </Link>
                      </td>
                      <td>{dateTime(booking.pickup_at)}</td>
                      <td>
                        <span className="badge" data-status={booking.status}>
                          {booking.status.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td>{money(Number(booking.price_aed))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-18 px-6 text-center">
              <CalendarCheck size={36} strokeWidth={1.2} className="text-muted mx-auto mb-4" />
              <h3 className="font-semibold">No upcoming journeys</h3>
              <p className="text-sm text-muted mt-2">Your scheduled transfers will appear here.</p>
            </div>
          )}
        </section>
        <section className="panel p-6">
          <h2 className="font-semibold mb-6">Booking financials</h2>
          <p className="text-xs text-muted mb-3">Recorded paid fares · all time</p>
          <p className="text-3xl font-semibold">{money(Number(finance?.[0]?.paid_total ?? 0))}</p>
          <div className="h-px bg-stone-100 my-7" />
          <p className="text-xs text-muted mb-3">Outstanding fares · open bookings</p>
          <p className="text-2xl font-semibold">
            {money(Number(finance?.[0]?.outstanding_total ?? 0))}
          </p>
          <p className="text-xs text-muted leading-relaxed mt-7">
            Based on your recorded fares and payment statuses. Payments are arranged separately;
            this website does not process charges.
          </p>
        </section>
      </div>
      <section className="mt-7 border border-dashed border-stone-300 rounded-xl p-6 flex flex-wrap gap-4 justify-between items-center">
        <div>
          <h2 className="font-semibold text-sm">Keep your operations up to date</h2>
          <p className="text-xs text-muted mt-2">
            Add your locations, team and vehicles before assigning a transfer.
          </p>
        </div>
        <Link className="button secondary" href="/admin/locations">
          Manage locations <ArrowUpRight size={15} />
        </Link>
      </section>
    </>
  );
}
