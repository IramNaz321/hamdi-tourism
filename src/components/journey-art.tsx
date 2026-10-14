"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { CAR_DRIVE_DURATION_MS, playEngineStartup } from "@/lib/car-engine-audio";

let memoryMuted = false;
let muteWritten = false;
function muteSnapshot() {
  if (muteWritten) return memoryMuted;
  try {
    return localStorage.getItem("hamdi-car-muted") === "true";
  } catch {
    return memoryMuted;
  }
}
function subscribeMute(callback: () => void) {
  const onStorage = () => {
    muteWritten = false;
    callback();
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("hamdi-car-mute", callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("hamdi-car-mute", callback);
  };
}
export function JourneyArt({
  photo,
  scene = false,
}: {
  scene?: boolean;
  photo?: { src: string; alt: string; credit: string; source: string; license: string } | null;
}) {
  const muted = useSyncExternalStore(subscribeMute, muteSnapshot, () => false);
  const [revving, setRevving] = useState(false);
  const [notice, setNotice] = useState("");
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const stopAudio = useCallback(() => {
    const previous = context.current;
    context.current = null;
    if (previous && previous.state !== "closed") void previous.close().catch(() => {});
  }, []);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    active.current = false;
    stopAudio();
  }, [stopAudio]);
  useEffect(() => {
    if (muted) stopAudio();
  }, [muted, stopAudio]);
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        stop();
        setRevving(false);
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      stop();
    };
  }, [stop]);
  async function rev() {
    if (active.current) return;
    active.current = true;
    setRevving(true);
    setNotice(
      muted
        ? "Cinematic drive effect. Sound muted."
        : "Synthesized engine startup and acceleration.",
    );
    timer.current = setTimeout(() => {
      stop();
      setRevving(false);
    }, CAR_DRIVE_DURATION_MS);
    if (muted) return;
    try {
      const Audio =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Audio) throw new Error("Audio unavailable");
      const audio = new Audio();
      context.current = audio;
      await audio.resume();
      if (context.current !== audio || !active.current) return;
      playEngineStartup(audio);
    } catch {
      stopAudio();
      setNotice("Sound is unavailable in this browser. The visual effect can still play.");
    }
  }
  function toggleMute() {
    const next = !muted;
    memoryMuted = next;
    muteWritten = true;
    try {
      localStorage.setItem("hamdi-car-muted", String(next));
    } catch {}
    window.dispatchEvent(new Event("hamdi-car-mute"));
    if (next) stopAudio();
    setNotice(next ? "Sound muted." : "Sound enabled. Choose Rev engine to listen.");
  }
  return (
    <div
      className={scene ? "cinematic-engine" : "car-stage pointer-events-none"}
      data-car-revving={revving}
      data-car-motion={scene ? "flat-scene" : "photo"}
    >
      {scene ? (
        <button
          type="button"
          aria-label="Rev the car engine"
          className="cinematic-car-hotspot"
          title="Start and rev the engine"
          onClick={() => void rev()}
        />
      ) : photo ? (
        <div className="space-y-2">
          <button
            type="button"
            aria-label="Rev the car engine"
            onClick={() => void rev()}
            className="car-interaction pointer-events-auto block w-full rounded-2xl overflow-hidden focus-visible:outline-2 focus-visible:outline-white"
          >
            <picture>
              <img
                src={photo.src}
                alt={photo.alt}
                width={1600}
                height={1000}
                fetchPriority="high"
                className="w-full aspect-[16/10] object-contain"
              />
            </picture>
          </button>
          <p className="text-xs text-white/70 pointer-events-auto">
            Photo:{" "}
            <a href={photo.source} rel="noopener noreferrer" className="underline">
              {photo.credit}
            </a>{" "}
            ·{" "}
            <a href={photo.license} rel="noopener noreferrer" className="underline">
              Licence
            </a>
            . Marketing showcase; ownership and availability are not implied.
          </p>
        </div>
      ) : null}
      <p className="sr-only">
        Original synthesized V8-style sound; not an authentic BMW recording or a claim about the
        photographed vehicle’s make or engine.
      </p>
      <div className="car-controls flex justify-center items-center gap-2 mt-4 pointer-events-auto text-white text-xs">
        <button
          type="button"
          onClick={() => void rev()}
          className="rounded-lg border border-white/30 bg-ink px-3 min-h-11 focus-visible:outline-2 focus-visible:outline-white"
        >
          Rev engine
        </button>
        <button
          type="button"
          onClick={toggleMute}
          aria-label="Mute engine sound"
          aria-pressed={muted}
          className="rounded-lg border border-white/30 bg-ink px-3 min-h-11 focus-visible:outline-2 focus-visible:outline-white"
        >
          {muted ? <VolumeX size={18} /> : <Volume2 size={18} />}
        </button>
        <span className="sr-only" aria-live="polite">
          {notice}
        </span>
      </div>
    </div>
  );
}
