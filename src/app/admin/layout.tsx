import { BrandLogo } from "@/components/brand-logo";
import type { CSSProperties } from "react";
import Link from "next/link";
import { LogOut, ArrowUpRight } from "lucide-react";
import { requireStaff } from "@/lib/auth";
import { logout } from "@/app/auth/actions";
import { AdminNav } from "@/components/admin-nav";
export const metadata = { title: "Business portal", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { member, supabase } = await requireStaff();
  const { data: settings, error } = await supabase
    .from("business_settings")
    .select("brand_color,ink_color,canvas_color,font_family")
    .eq("organization_id", member.organization_id)
    .maybeSingle();
  if (error) throw new Error("Unable to load business appearance.");
  const theme = settings
    ? ({
        "--brand": settings.brand_color,
        "--ink": settings.ink_color,
        "--canvas": settings.canvas_color,
        color: settings.ink_color,
        fontFamily:
          settings.font_family === "serif" ? "Georgia, serif" : "Arial, Helvetica, sans-serif",
      } as CSSProperties)
    : undefined;
  return (
    <div className="lg:flex min-h-screen bg-canvas" style={theme}>
      <aside className="lg:w-64 lg:shrink-0 bg-white border-b lg:border-r border-stone-200 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto p-5 lg:p-6 flex flex-col">
        <div className="flex lg:block items-center justify-between">
          <BrandLogo className="lg:mb-10" />
          <p className="eyebrow lg:mb-3 lg:mt-2">BUSINESS PORTAL</p>
        </div>
        <AdminNav owner={member.role === "owner"} />
        <div className="mt-auto hidden lg:block pt-9">
          <Link className="text-xs text-muted flex gap-2" href="/">
            Visit website <ArrowUpRight size={14} />
          </Link>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="bg-white border-b border-stone-200 px-6 lg:px-10 py-5 flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold">{member.display_name}</p>
            <p className="text-xs text-muted capitalize mt-1">{member.role}</p>
          </div>
          <form action={logout}>
            <button className="button secondary py-2! text-xs">
              <LogOut size={15} /> Sign out
            </button>
          </form>
        </header>
        <main className="p-6 lg:p-10 max-w-[1500px] mx-auto">{children}</main>
      </div>
    </div>
  );
}
