import Link from "next/link";
import { PassengerAuthForm } from "@/components/passenger-forms";
import { isConfigured } from "@/lib/supabase/server";
import { passengerReturnPath } from "@/lib/passenger-validation";
export default async function PassengerLogin({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; mode?: string; notice?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="max-w-lg mx-auto p-6 py-16 space-y-6">
      <Link className="brand" href="/">
        HAMDI TOURISM
      </Link>
      <h1 className="text-3xl font-semibold">
        {params.mode === "recovery" ? "Recover your account" : "Passenger sign in"}
      </h1>
      {params.notice && (
        <p className="notice">
          Account access or verification is unavailable. Please retry or contact support.
        </p>
      )}
      <PassengerAuthForm
        mode={params.mode === "recovery" ? "recovery" : "login"}
        configured={isConfigured()}
        next={passengerReturnPath(params.next)}
      />
    </main>
  );
}
