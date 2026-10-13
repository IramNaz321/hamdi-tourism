"use client";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Volume2, VolumeX } from "lucide-react";

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
}: {
  photo?: { src: string; alt: string; credit: string; source: string; license: string } | null;
}) {
  const muted = useSyncExternalStore(subscribeMute, muteSnapshot, () => false);
  const [revving, setRevving] = useState(false);
  const [notice, setNotice] = useState("");
  const context = useRef<AudioContext | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const active = useRef(false);
  const stop = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    active.current = false;
    const previous = context.current;
    context.current = null;
    if (previous && previous.state !== "closed") void previous.close().catch(() => {});
  }, []);
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
    setNotice(muted ? "Engine animation. Sound muted." : "Synthesized V8-style engine revving.");
    timer.current = setTimeout(() => {
      stop();
      setRevving(false);
    }, 1600);
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
      const start = audio.currentTime;
      const output = audio.createGain();
      const filter = audio.createBiquadFilter();
      const compressor = audio.createDynamicsCompressor();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(280, start);
      filter.frequency.exponentialRampToValueAtTime(1500, start + 0.45);
      filter.frequency.exponentialRampToValueAtTime(280, start + 1.3);
      output.gain.setValueAtTime(0, start);
      output.gain.linearRampToValueAtTime(0.09, start + 0.08);
      output.gain.linearRampToValueAtTime(0.14, start + 0.45);
      output.gain.exponentialRampToValueAtTime(0.001, start + 1.35);
      output.connect(filter);
      filter.connect(compressor);
      compressor.connect(audio.destination);
      // Original V8-style firing approximation: 4 firing pulses/revolution.
      // Not a licensed BMW recording, actual fleet claim or microphone capture.
      const texture = audio.createBuffer(1, Math.ceil(audio.sampleRate * 1.4), audio.sampleRate);
      const samples = texture.getChannelData(0);
      let smooth = 0;
      for (let i = 0; i < samples.length; i++) {
        smooth = (smooth + 0.12 * (Math.random() * 2 - 1)) / 1.12;
        samples[i] = smooth;
      }
      const exhaust = audio.createBufferSource();
      exhaust.buffer = texture;
      const exhaustLevel = audio.createGain();
      exhaustLevel.gain.value = 0.4;
      exhaust.connect(exhaustLevel);
      exhaustLevel.connect(output);
      exhaust.start(start);
      exhaust.stop(start + 1.4);
      // Original synthesized combustion harmonics; no recording or microphone access.
      for (let harmonic = 1; harmonic <= 6; harmonic++) {
        const oscillator = audio.createOscillator();
        const level = audio.createGain();
        oscillator.type = harmonic === 1 ? "sawtooth" : "triangle";
        oscillator.frequency.setValueAtTime(48 * harmonic, start);
        oscillator.frequency.exponentialRampToValueAtTime(205 * harmonic, start + 0.45);
        oscillator.frequency.exponentialRampToValueAtTime(50 * harmonic, start + 1.3);
        level.gain.value = 1 / (harmonic * harmonic * 2.5);
        oscillator.connect(level);
        level.connect(output);
        oscillator.start(start);
        oscillator.stop(start + 1.4);
      }
    } catch {
      stop();
      setRevving(false);
      setNotice("Sound is unavailable in this browser.");
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
    if (next) {
      stop();
      setRevving(false);
    }
    setNotice(next ? "Sound muted." : "Sound enabled. Choose Rev engine to listen.");
  }
  return (
    <div
      className="car-stage absolute inset-y-10 right-0 w-full lg:w-3/5 opacity-90 lg:opacity-100 pointer-events-none"
      data-car-revving={revving}
    >
      {photo ? (
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
            . Editorial image; ownership and availability are not implied.
          </p>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center p-8 text-center">
          <p className="text-sm text-white/70">
            Approved real vehicle photography is currently unavailable.
          </p>
        </div>
      )}
      <p className="sr-only">
        Original synthesized V8-style sound; not an authentic BMW recording or a claim about the
        photographed vehicle’s make or engine.
      </p>
      <div className="car-controls absolute bottom-0 right-6 flex items-center gap-2 pointer-events-auto text-white text-xs">
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
