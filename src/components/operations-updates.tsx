"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { browserClient } from "@/lib/supabase/browser";
import { Button } from "@/components/ui/button";
export function OperationsUpdates({ organizationId }: { organizationId: string }) {
  const router = useRouter();
  const [status, setStatus] = useState("Connecting automatic updates…");
  useEffect(() => {
    const client = browserClient();
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => router.refresh(), 500);
    };
    const channel = client.channel(`operations-${organizationId}`);
    for (const table of ["bookings", "drivers", "vehicles", "booking_enquiries"])
      channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `organization_id=eq.${organizationId}` },
        refresh,
      );
    channel.subscribe((value: string) =>
      setStatus(
        value === "SUBSCRIBED"
          ? "Automatic updates connected"
          : value === "CHANNEL_ERROR" || value === "TIMED_OUT"
            ? "Automatic updates unavailable · Refresh to update"
            : "Connecting automatic updates…",
      ),
    );
    const polling = setInterval(() => router.refresh(), 60000);
    return () => {
      if (timeout) clearTimeout(timeout);
      clearInterval(polling);
      void client.removeChannel(channel);
    };
  }, [organizationId, router]);
  return (
    <div className="flex flex-wrap items-center gap-4">
      <span role="status" className="text-xs text-muted">
        {status}
      </span>
      <Button variant="outline" size="sm" onClick={() => router.refresh()}>
        Refresh
      </Button>
    </div>
  );
}
