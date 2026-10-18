"use client";

import { useId, useState } from "react";
import type { PublicLocation } from "@/lib/website";

function locationLabel(location: PublicLocation) {
  return [location.name, location.city, location.airport_code, location.kind.replaceAll("_", " ")]
    .filter(Boolean)
    .join(" · ");
}

export function LocationPicker({
  label,
  name,
  locations,
  disabled,
}: {
  label: string;
  name: string;
  locations: PublicLocation[];
  disabled: boolean;
}) {
  const id = useId().replaceAll(":", "");
  const listId = `${id}-locations`;
  const [value, setValue] = useState("");
  const selected = locations.find((location) => locationLabel(location) === value);

  return (
    <>
      <label className="field" htmlFor={id}>
        {label}
        <input
          id={id}
          type="search"
          list={listId}
          value={value}
          disabled={disabled}
          required
          autoComplete="off"
          placeholder="Search published locations"
          onChange={(event) => {
            const next = event.currentTarget.value;
            setValue(next);
            const match = locations.some((location) => locationLabel(location) === next);
            event.currentTarget.setCustomValidity(
              next && !match ? "Choose a published location from the suggestions." : "",
            );
          }}
          onBlur={(event) => {
            event.currentTarget.setCustomValidity(
              value && !selected ? "Choose a published location from the suggestions." : "",
            );
          }}
        />
      </label>
      <datalist id={listId}>
        {locations.map((location) => (
          <option key={location.id} value={locationLabel(location)} />
        ))}
      </datalist>
      <input type="hidden" name={name} value={selected?.id ?? ""} disabled={disabled} />
      <p className="text-xs text-muted">Only owner-published locations can be quoted or booked.</p>
    </>
  );
}
