import { useEffect, useRef, useState } from "react";
import { errorMessage } from "./domain";
import { useApp } from "./state";
/** Revalidate on mutations/focus/polling without cancelling a slow in-flight read. */
export function useRemote<T>(load: (signal: AbortSignal) => Promise<T>, keys: unknown[] = []) {
  const { dataRevision } = useApp();
  const keyValue = JSON.stringify(keys);
  const priorKey = useRef(keyValue);
  const loader = useRef(load);
  loader.current = load;
  const active = useRef<AbortController | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    active.current = controller;
    if (priorKey.current !== keyValue) {
      setData(null);
      priorKey.current = keyValue;
    }
    setLoading(true);
    setError("");
    loader
      .current(controller.signal)
      .then((value) => {
        if (!controller.signal.aborted) setData(value);
      })
      .catch((e) => {
        if (!controller.signal.aborted && e.name !== "AbortError") setError(errorMessage(e));
      })
      .finally(() => {
        if (active.current === controller) active.current = null;
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
      if (active.current === controller) active.current = null;
    };
  }, [retry, ...keys]);
  useEffect(() => {
    if (!active.current) setRetry((n) => n + 1);
  }, [dataRevision]);
  return { data, error, loading, reload: () => setRetry((n) => n + 1) };
}
