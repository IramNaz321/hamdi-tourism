"use client";
import { useActionState } from "react";
import Link from "next/link";
import { entities, toUaeInput } from "@/lib/entities";
import { saveRecord } from "@/app/admin/actions";
import { RelationPicker } from "@/components/relation-picker";
export function RecordForm({
  entity,
  record,
  related,
}: {
  entity: string;
  record?: Record<string, string | number | boolean | null>;
  related: Record<string, { id: string; name: string }>;
}) {
  const [state, action, pending] = useActionState(
    saveRecord.bind(null, entity, record ? String(record.id) : null),
    {},
  );
  return (
    <form action={action} className="panel p-6 sm:p-8 max-w-4xl">
      {state.error && (
        <p className="notice error mb-6" role="alert">
          {state.error}
        </p>
      )}
      <input type="hidden" name="updated_at" value={String(record?.updated_at ?? "")} />
      <div className="grid sm:grid-cols-2 gap-6">
        {entities[entity].fields.map((field) => {
          let value = String(record?.[field.name] ?? "");
          if (field.type === "datetime-local" && value) value = toUaeInput(value);
          if (field.relation)
            return (
              <RelationPicker
                key={field.name}
                name={field.name}
                table={field.relation}
                label={field.label}
                required={field.required}
                initial={related[field.name]}
              />
            );
          return (
            <label
              key={field.name}
              className={`field ${field.type === "textarea" ? "sm:col-span-2" : ""}`}
            >
              {field.label}
              {field.required ? " *" : ""}
              {field.options ? (
                <select
                  name={field.name}
                  required={field.required}
                  defaultValue={value || field.options[0]}
                >
                  {field.options.map((option) => (
                    <option key={option} value={option}>
                      {option.replaceAll("_", " ")}
                    </option>
                  ))}
                </select>
              ) : field.type === "textarea" ? (
                <textarea
                  name={field.name}
                  defaultValue={value}
                  required={field.required}
                  maxLength={4000}
                />
              ) : (
                <input
                  name={field.name}
                  type={field.type}
                  defaultValue={value}
                  required={field.required}
                  min={field.min}
                  max={
                    field.type === "number" ? (field.step === "0.01" ? 10000000 : 1000) : undefined
                  }
                  step={field.step}
                  maxLength={200}
                />
              )}
            </label>
          );
        })}
      </div>
      {entity === "bookings" && (
        <p className="text-xs text-muted mt-6">
          All pickup times use UAE time (UTC+4). Enter the agreed fare; route pricing is a
          reference, not an automatic charge. Payment status records a payment received outside this
          website.
        </p>
      )}
      <div className="flex gap-3 mt-8 pt-6 border-t border-stone-100">
        <button className="button" disabled={pending}>
          {pending ? "Saving…" : "Save record"}
        </button>
        <Link className="button secondary" href={`/admin/${entity}`}>
          Cancel
        </Link>
      </div>
    </form>
  );
}
