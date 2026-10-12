"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  CarFront,
  Users,
  CalendarDays,
  MapPin,
  Route,
  UserRound,
  ShieldCheck,
} from "lucide-react";
const links = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarDays },
  { href: "/admin/drivers", label: "Drivers", icon: UserRound },
  { href: "/admin/vehicles", label: "Vehicles", icon: CarFront },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/locations", label: "Locations", icon: MapPin },
  { href: "/admin/route_pricing", label: "Route pricing", icon: Route },
  { href: "/admin/staff", label: "Staff & access", icon: ShieldCheck },
];
export function AdminNav({ owner }: { owner: boolean }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin navigation" className="flex lg:flex-col gap-1 overflow-x-auto py-2">
      {links
        .filter((link) => owner || link.href !== "/admin/staff")
        .map(({ href, label, icon: Icon }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-lg px-4 py-3 text-sm whitespace-nowrap ${active ? "bg-ink text-white" : "text-muted hover:bg-canvas"}`}
            >
              <Icon size={18} strokeWidth={1.7} />
              {label}
            </Link>
          );
        })}
    </nav>
  );
}
