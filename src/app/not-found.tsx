import Link from "next/link";
export default function NotFound() {
  return (
    <main className="min-h-[70vh] flex flex-col items-center justify-center p-8">
      <p className="eyebrow mb-4">HAMDI TOURISM</p>
      <h1 className="text-3xl font-semibold mb-4">Page not found</h1>
      <p className="text-muted mb-7">This page or record is unavailable.</p>
      <Link className="button" href="/">
        Back to website
      </Link>
    </main>
  );
}
