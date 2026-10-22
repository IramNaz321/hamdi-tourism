import { BrandLogo } from "@/components/brand-logo";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
export function AuthShell({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <main className="auth-background min-h-screen px-5 py-10 flex flex-col items-center justify-center">
      <BrandLogo className="mb-10 text-white" />
      <section className="w-full max-w-md rounded-3xl bg-white p-8 shadow-xl">
        <p className="eyebrow mb-3">STAFF PORTAL</p>
        <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
        <p className="text-muted mt-3 mb-8">{description}</p>
        {children}
      </section>
      <Link href="/" className="text-white/75 text-sm flex gap-2 items-center mt-8">
        Back to Hamdi Tourism <ArrowUpRight size={16} />
      </Link>
    </main>
  );
}
