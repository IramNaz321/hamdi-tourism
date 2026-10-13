import Link from "next/link";
import { PassengerAuthForm } from "@/components/passenger-forms";
import { isConfigured } from "@/lib/supabase/server";
export const dynamic = "force-dynamic";
export default function Register() {
  return (
    <main className="max-w-lg mx-auto p-6 py-16 space-y-6">
      <Link className="brand" href="/">
        HAMDI<span>TOURISM</span>
      </Link>
      <h1 className="text-3xl font-semibold">Create your passenger account</h1>
      <PassengerAuthForm
        mode="register"
        configured={
          isConfigured() &&
          process.env.PASSENGER_AUTH_ENABLED === "true" &&
          !!process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY
        }
      />
    </main>
  );
}
