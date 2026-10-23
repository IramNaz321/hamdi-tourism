// @vitest-environment jsdom
import { afterEach, expect, it, vi } from "vitest";
import { act, cleanup, renderHook } from "@testing-library/react";
import { useRemote } from "../src/useRemote";
const state = vi.hoisted(() => ({ dataRevision: 0 }));
vi.mock("../src/state", () => ({ useApp: () => state }));
afterEach(() => {
  cleanup();
  state.dataRevision = 0;
});
it("lets slow reads finish instead of aborting them on every polling tick", async () => {
  let finish!: (v: string) => void;
  let signal!: AbortSignal;
  const load = vi.fn((s: AbortSignal) => {
    signal = s;
    return new Promise<string>((resolve) => {
      finish = resolve;
    });
  });
  const h = renderHook(() => useRemote(load));
  state.dataRevision++;
  h.rerender();
  state.dataRevision++;
  h.rerender();
  expect(load).toHaveBeenCalledTimes(1);
  expect(signal.aborted).toBe(false);
  await act(async () => finish("persisted booking"));
  expect(h.result.current.data).toBe("persisted booking");
  expect(h.result.current.loading).toBe(false);
  state.dataRevision++;
  h.rerender();
  expect(load).toHaveBeenCalledTimes(2);
});
it("cancels reads when the account or record changes and ignores their stale results", async () => {
  const reads: Array<{ signal: AbortSignal; finish: (v: string) => void }> = [];
  const load = (signal: AbortSignal) =>
    new Promise<string>((finish) => reads.push({ signal, finish }));
  const h = renderHook(({ id }) => useRemote(load, [id]), { initialProps: { id: "customer-one" } });
  h.rerender({ id: "customer-two" });
  expect(reads[0].signal.aborted).toBe(true);
  await act(async () => {
    reads[0].finish("private old record");
    reads[1].finish("new account record");
  });
  expect(h.result.current.data).toBe("new account record");
});
