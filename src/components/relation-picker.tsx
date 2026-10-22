"use client";
import { useState, useRef, useId } from "react";
import { searchOptions } from "@/app/admin/actions";
export function RelationPicker({
  name,
  table,
  label,
  required,
  initial,
}: {
  name: string;
  table: string;
  label: string;
  required?: boolean;
  initial?: { id: string; name: string };
}) {
  const [options, setOptions] = useState<{ id: string; name: string }[]>(initial ? [initial] : []);
  const [selected, setSelected] = useState(initial?.id ?? "");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const sequence = useRef(0);
  const inputId = useId();
  async function search() {
    const current = ++sequence.current;
    setPending(true);
    try {
      const result = await searchOptions(table, query);
      if (current !== sequence.current) return;
      setOptions((currentOptions) => {
        const selection = currentOptions.find((option) => option.id === selected);
        return selection && !result.options.some((option) => option.id === selected)
          ? [selection, ...result.options]
          : result.options;
      });
      setError(
        result.error ??
          (result.options.length ? "" : "No matching records. Add an active record first."),
      );
    } catch {
      if (current === sequence.current) setError("Unable to load choices. Try again.");
    } finally {
      if (current === sequence.current) setPending(false);
    }
  }
  return (
    <div className="field">
      <label htmlFor={inputId}>
        {label}
        {required ? " *" : ""}
      </label>
      <div className="flex gap-2">
        <input
          aria-label={`Search ${label.toLowerCase()}`}
          placeholder="Search by name"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              void search();
            }
          }}
        />
        <button
          type="button"
          onClick={search}
          className="button secondary shrink-0"
          disabled={pending}
        >
          {pending ? "Loading…" : "Find"}
        </button>
      </div>
      <select
        id={inputId}
        name={name}
        required={required}
        value={selected}
        onChange={(e) => setSelected(e.target.value)}
      >
        <option value="">{required ? "Choose a record" : "Unassigned"}</option>
        {options.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
      <p className="text-xs text-muted font-normal">
        Search or click Find to load available choices.
      </p>
      {error && (
        <p role="status" className="text-xs text-muted">
          {error}
        </p>
      )}
    </div>
  );
}
