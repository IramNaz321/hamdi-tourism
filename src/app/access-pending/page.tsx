import { AuthShell } from "@/components/auth-shell";
import { logout } from "@/app/auth/actions";
export default function Pending() {
  return (
    <AuthShell
      title="Account access"
      description="This account does not have verified access to the requested portal. Ask the business owner to review your access."
    >
      <form action={logout}>
        <button className="button w-full">Sign out</button>
      </form>
    </AuthShell>
  );
}
