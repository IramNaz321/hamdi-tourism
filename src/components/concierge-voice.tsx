"use client";
import { useEffect, useRef, useState } from "react";
import { conciergeLocale } from "@/lib/concierge-languages";
type Recognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  abort(): void;
};
type SpeechWindow = Window & {
  SpeechRecognition?: new () => Recognition;
  webkitSpeechRecognition?: new () => Recognition;
};
export function ConciergeVoice({
  language,
  answer,
  onTranscript,
  disabled = false,
}: {
  language: string;
  answer: string;
  onTranscript: (text: string) => void;
  disabled?: boolean;
}) {
  const recognition = useRef<Recognition | null>(null);
  const utterance = useRef<SpeechSynthesisUtterance | null>(null);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(true);
  const [notice, setNotice] = useState(
    "Voice requires a supported browser and microphone permission. Your browser's speech provider may process audio or response text. This website does not record or store microphone audio.",
  );
  function cancelSpeech() {
    utterance.current = null;
    try {
      window.speechSynthesis?.cancel();
    } catch {
      /* Optional browser service. */
    }
  }
  function abortRecognition() {
    const session = recognition.current;
    recognition.current = null;
    if (session) {
      session.onresult = null;
      session.onerror = null;
      session.onend = null;
      try {
        session.abort();
      } catch {
        /* An already-ended browser session can throw. */
      }
    }
  }
  function stop() {
    abortRecognition();
    cancelSpeech();
    setListening(false);
    setNotice("Voice stopped. You can continue by typing.");
  }
  useEffect(() => {
    const stopHidden = () => {
      if (document.hidden) {
        abortRecognition();
        cancelSpeech();
        setListening(false);
      }
    };
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopHidden);
      abortRecognition();
      cancelSpeech();
    };
  }, [language]);
  return (
    <div data-concierge-voice className="space-y-2 border border-stone-300 rounded-xl p-3">
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          className="button secondary"
          disabled={listening || disabled}
          onClick={() => {
            const browser = window as SpeechWindow;
            const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
            if (!Constructor || !window.isSecureContext) {
              setNotice("Voice input is unavailable in this browser. Please type your question.");
              return;
            }
            cancelSpeech();
            abortRecognition();
            try {
              const session = new Constructor();
              recognition.current = session;
              session.lang = conciergeLocale(language).locale;
              session.continuous = false;
              session.interimResults = false;
              session.onresult = (event) => {
                if (recognition.current !== session) return;
                const text = event.results[0]?.[0]?.transcript?.trim();
                if (text) {
                  onTranscript(text.slice(0, 1500));
                  setNotice(
                    "Review your question, then choose Ask concierge. Nothing is sent automatically.",
                  );
                }
              };
              session.onerror = (event) => {
                if (recognition.current !== session) return;
                abortRecognition();
                setListening(false);
                setNotice(
                  event.error === "not-allowed" || event.error === "service-not-allowed"
                    ? "Microphone permission was denied. Please type your question."
                    : "Voice input is unavailable. Please type your question.",
                );
              };
              session.onend = () => {
                if (recognition.current === session) {
                  recognition.current = null;
                  setListening(false);
                }
              };
              setListening(true);
              setNotice("Listening… Use Stop voice to end microphone input.");
              session.start();
            } catch {
              abortRecognition();
              setListening(false);
              setNotice("Voice input is unavailable. Please type your question.");
            }
          }}
        >
          {listening ? "Listening…" : "Use microphone"}
        </button>
        <button type="button" className="button secondary" onClick={stop}>
          Stop voice
        </button>
        <button
          type="button"
          className="button secondary"
          aria-pressed={muted}
          onClick={() => {
            setMuted(!muted);
            cancelSpeech();
          }}
        >
          {muted ? "Unmute voice replies" : "Mute voice replies"}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!answer || muted || disabled}
          onClick={() => {
            try {
              const synthesis = window.speechSynthesis;
              if (!synthesis || typeof window.SpeechSynthesisUtterance !== "function") {
                setNotice(
                  "Spoken replies are unavailable on this device. Please read the text answer.",
                );
                return;
              }
              const voices = synthesis
                .getVoices()
                .filter((voice) => voice.lang.toLowerCase().split(/[-_]/)[0] === language);
              const voice = voices.find((voice) => voice.localService) ?? voices[0];
              if (!voice) {
                setNotice(
                  "Spoken replies are unavailable in this language on this device. Please read the text answer.",
                );
                return;
              }
              abortRecognition();
              setListening(false);
              cancelSpeech();
              const speech = new SpeechSynthesisUtterance(answer);
              utterance.current = speech;
              speech.lang = conciergeLocale(language).locale;
              speech.voice = voice;
              speech.onend = () => {
                if (utterance.current === speech) {
                  utterance.current = null;
                  setNotice("Spoken reply finished.");
                }
              };
              speech.onerror = () => {
                if (utterance.current === speech) {
                  utterance.current = null;
                  setNotice("Spoken reply is unavailable. Please read the text answer.");
                }
              };
              setNotice("Speaking… Use Stop voice or Mute voice replies to stop playback.");
              synthesis.speak(speech);
            } catch {
              cancelSpeech();
              setNotice("Spoken reply is unavailable. Please read the text answer.");
            }
          }}
        >
          Read answer aloud
        </button>
      </div>
      <p className="text-xs text-[#59606b]" role="status">
        {notice}
      </p>
    </div>
  );
}
