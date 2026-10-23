import { useEffect, useRef, useState } from "react";
import { MapPin, MagnifyingGlass } from "@phosphor-icons/react";
import { errorMessage, type Catalog, type PlacePrediction } from "../domain";
import { useApp } from "../state";
import { Alert } from "./ui";
type Place = Catalog["locations"][number];
export function PlaceSelect({
  id,
  value,
  onChange,
  invalid = false,
}: {
  id: string;
  value: string;
  onChange: (id: string, place?: Place) => void;
  invalid?: boolean;
}) {
  const { service, catalog, registerLocation } = useApp();
  const selected = catalog?.locations.find((l) => l.id === value);
  const ref = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [open, setOpen] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [index, setIndex] = useState(-1);
  const [token] = useState(() => crypto.randomUUID());
  useEffect(() => {
    if (selected) setQuery(selected.name);
  }, [value, selected?.name]);
  useEffect(() => {
    function outside(e: PointerEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, []);
  useEffect(() => {
    if (!open || query.trim().length < 1) {
      setPredictions([]);
      setBusy(false);
      return;
    }
    const c = new AbortController();
    const timer = setTimeout(() => {
      setBusy(true);
      service
        .searchPlaces(query, token, c.signal)
        .then((v) => {
          setPredictions(v.predictions);
          setIndex(-1);
          setError("");
        })
        .catch((e) => {
          if (e.name !== "AbortError") setError(errorMessage(e));
        })
        .finally(() => {
          if (!c.signal.aborted) setBusy(false);
        });
    }, 180);
    return () => {
      clearTimeout(timer);
      c.abort();
    };
  }, [query, open, token, service]);
  function choose(p: Place) {
    setError("");
    registerLocation(p);
    onChange(p.id, p);
    setQuery(p.name);
    setOpen(false);
    setPredictions([]);
  }
  async function select(p: PlacePrediction) {
    setBusy(true);
    setError("");
    try {
      choose(await service.selectPlace(p.placeId, token));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  if (service.mode === "mock")
    return (
      <select
        id={id}
        value={value}
        aria-invalid={invalid}
        onChange={(e) => onChange(e.target.value)}
      >
        <option value="">Select location</option>
        {catalog?.locations.map((l) => (
          <option key={l.id} value={l.id}>
            {l.name}
          </option>
        ))}
      </select>
    );
  return (
    <div className="place-select" ref={ref}>
      <div className="place-search-input">
        <MagnifyingGlass size={18} />
        <input
          id={id}
          role="combobox"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={`${id}-places`}
          aria-expanded={open && predictions.length > 0}
          aria-activedescendant={index >= 0 ? `${id}-place-${index}` : undefined}
          aria-invalid={invalid}
          value={query}
          placeholder="Search a UAE place or emirate"
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            if (value) onChange("");
          }}
          onKeyDown={(e) => {
            if (e.key === "Escape") setOpen(false);
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, predictions.length - 1));
            }
            if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            }
            if (e.key === "Enter" && open) {
              e.preventDefault();
              if (index >= 0 && predictions[index]) void select(predictions[index]);
            }
          }}
        />
      </div>
      {open && predictions.length ? (
        <div className="place-predictions">
          <ul role="listbox" id={`${id}-places`}>
            {predictions.map((p, i) => (
              <li key={p.placeId} role="option" aria-selected={index === i} id={`${id}-place-${i}`}>
                <button type="button" onClick={() => select(p)}>
                  <MapPin size={17} />
                  {p.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {busy ? (
        <p className="field-hint" role="status">
          Finding your place…
        </p>
      ) : null}
      {open && query && !busy && !predictions.length ? (
        <p className="field-hint">No matching place. Try an emirate name or choose below.</p>
      ) : null}
      {error ? <Alert>{error}</Alert> : null}
      <div className="place-secondary">
        <select
          aria-label={`UAE locations for ${id}`}
          value={value}
          onChange={(e) => {
            const p = catalog?.locations.find((l) => l.id === e.target.value);
            if (p) choose(p);
          }}
        >
          <option value="">Browse all UAE locations</option>
          {Array.from(new Set(catalog?.locations.map((l) => l.city)))
            .sort()
            .map((city) => (
              <optgroup key={city} label={city}>
                {catalog?.locations
                  .filter((l) => l.city === city)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.shortName}
                    </option>
                  ))}
              </optgroup>
            ))}
        </select>
      </div>
    </div>
  );
}
