import { AuthShell } from "@/components/auth-shell";
import { logout } from "@/app/auth/actions";
import Link from "next/link";
export default async function Pending({
  searchParams,
}: {
  searchParams: Promise<{ notice?: string }>;
}) {
  const permissionsUnavailable = (await searchParams).notice === "permissions-unavailable";
  return (
    <AuthShell
      title="Account access"
      description={
        permissionsUnavailable
          ? "Your account permissions could not be checked. Portal access remains locked. Please retry or contact support."
          : "Staff portal access has not been activated for this account. A confirmed email alone does not grant Admin or Driver access."
      }
    >
      <p role="status" className="notice mb-5">
        {permissionsUnavailable
          ? "Your session has not been granted any additional permissions."
          : "The business must verify your identity and approve the appropriate membership before you can enter the staff portal."}
      </p>
      <Link href="/login" className="button secondary w-full mb-3">
        Check access again
      </Link>
      <Link href="/passenger" className="block text-sm underline mb-5">
        Go to passenger journeys
      </Link>
      <form action={logout}>
        <button className="button w-full">Sign out</button>
      </form>
    </AuthShell>
  );
}
