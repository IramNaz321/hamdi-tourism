"use client";
import { useFormStatus } from "react-dom";
function Submit({ restore }: { restore: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button disabled={pending} className="text-xs text-muted underline underline-offset-4">
      {pending ? "Please wait…" : restore ? "Restore" : "Archive"}
    </button>
  );
}
export function ArchiveButton({
  action,
  restore = false,
}: {
  action: () => Promise<void>;
  restore?: boolean;
}) {
  return (
    <form
      action={action}
      onSubmit={(e) => {
        if (
          !window.confirm(
            restore
              ? "Restore this record to the active list?"
              : "Archive this record? It will remain in your history and can be restored.",
          )
        )
          e.preventDefault();
      }}
    >
      <Submit restore={restore} />
    </form>
  );
}
