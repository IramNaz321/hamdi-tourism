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
export function JourneyArt() {
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
    setNotice(next ? "Sound muted." : "Sound enabled. Tap the car to rev.");
  }
  return (
    <div
      className="car-stage absolute inset-y-10 right-0 w-full lg:w-3/5 opacity-90 lg:opacity-100 pointer-events-none"
      data-car-revving={revving}
    >
      {" "}
      <svg
        viewBox="0 0 600 330"
        className="w-full relative"
        role="group"
        aria-label="Red coupe SUV illustration beside an abstract UAE skyline"
      >
        <defs>
          <linearGradient id="car" x2="0" y2="1">
            <stop stopColor="#ffaaa2" />
            <stop offset=".36" stopColor="#e73330" />
            <stop offset=".48" stopColor="#ff6b60" />
            <stop offset=".53" stopColor="#a91522" />
            <stop offset="1" stopColor="#570f1c" />
          </linearGradient>
          <linearGradient id="car-glass" x2="1" y2="1">
            <stop stopColor="#9cb4b2" />
            <stop offset=".48" stopColor="#355751" />
            <stop offset="1" stopColor="#102f2b" />
          </linearGradient>
          <radialGradient id="car-rim">
            <stop stopColor="#eef0e8" />
            <stop offset=".6" stopColor="#89988f" />
            <stop offset="1" stopColor="#31473f" />
          </radialGradient>
        </defs>
        <g stroke="#79958a" fill="none" opacity=".45" strokeWidth="2">
          <path d="M40 230V138h38v92m18 0V85h38v145m30 0V125h42v105m27 0V76h36v154m20 0V25h16v205m0-205 8-22 8 22v205m22 0V110h53v120m20 0V143h35v87m22 0V98h51v132" />
          <path d="M0 231h600" />
        </g>
        <ellipse cx="300" cy="283" rx="240" ry="23" fill="#061f1d" />
        <g
          role="button"
          tabIndex={0}
          aria-label="Rev the car engine"
          className="car-interaction pointer-events-auto cursor-pointer"
          onClick={() => void rev()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              void rev();
            }
          }}
        >
          <path d="m70 231 66-25 59-75h155l82 64 79 25 19 49H62Z" fill="url(#car)" />
          <path d="m158 207 47-62h82v62Zm143 0v-62h41l67 51 9 11Z" fill="url(#car-glass)" />
          <path d="M79 236h66v10H76m400-10h35v10h-30" fill="#f0ddac" />
          <path d="M171 222h238m-133-6h22m39 0h22" stroke="#758f83" strokeWidth="3" />
          <circle cx="169" cy="267" r="32" fill="#0d2320" />
          <circle cx="169" cy="267" r="17" fill="url(#car-rim)" />
          <circle cx="440" cy="267" r="32" fill="#0d2320" />
          <circle cx="440" cy="267" r="17" fill="url(#car-rim)" />
          <path d="M70 276h460" stroke="#81958b" />
          <path d="M153 216h264M305 165v89M146 254h283" stroke="#e7ece0" strokeOpacity=".5" />
          <path d="m360 192 13 6-5 12-14-3Z" fill="#8da094" stroke="#e2e6d8" />
          <path
            d="M154 255l30 24m-30 0 30-24m-15-5v34m256-28 30 24m-30 0 30-24m-15-5v34"
            stroke="#ccd4c9"
            strokeWidth="2"
          />
          <path d="m507 246 17 3" stroke="#b34d3f" strokeWidth="5" />
        </g>
      </svg>
      <p className="sr-only">
        Illustration only. Original synthesized V8-style sound approximation, not an authentic BMW
        recording or fleet listing.
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
