"use client";
import { useEffect, useRef, useState } from "react";
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
const locales: Record<string, string> = { en: "en-AE", ar: "ar-AE", ur: "ur-PK", hi: "hi-IN" };
export function ConciergeVoice({
  language,
  answer,
  onTranscript,
}: {
  language: string;
  answer: string;
  onTranscript: (text: string) => void;
}) {
  const recognition = useRef<Recognition | null>(null);
  const [listening, setListening] = useState(false);
  const [muted, setMuted] = useState(true);
  const [notice, setNotice] = useState(
    "Voice requires a supported browser and microphone permission. Your browser's speech provider may process audio.",
  );
  function stop() {
    recognition.current?.abort();
    recognition.current = null;
    window.speechSynthesis?.cancel();
    setListening(false);
  }
  useEffect(() => {
    const stopHidden = () => {
      if (document.hidden) {
        recognition.current?.abort();
        window.speechSynthesis?.cancel();
      }
    };
    document.addEventListener("visibilitychange", stopHidden);
    return () => {
      document.removeEventListener("visibilitychange", stopHidden);
      recognition.current?.abort();
      recognition.current = null;
      window.speechSynthesis?.cancel();
    };
  }, [language]);
  return (
    <div className="space-y-2 border rounded-xl p-3">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="button secondary"
          disabled={listening}
          onClick={() => {
            const browser = window as SpeechWindow;
            const Constructor = browser.SpeechRecognition ?? browser.webkitSpeechRecognition;
            if (!Constructor || !window.isSecureContext) {
              setNotice("Voice input is unavailable in this browser. Please type your question.");
              return;
            }
            window.speechSynthesis?.cancel();
            const session = new Constructor();
            recognition.current = session;
            session.lang = locales[language];
            session.continuous = false;
            session.interimResults = false;
            session.onresult = (event) => {
              const transcript = event.results[0]?.[0]?.transcript;
              if (transcript) {
                onTranscript(transcript.slice(0, 1500));
                setNotice(
                  "Review your question, then choose Ask concierge. Nothing is sent automatically.",
                );
              }
            };
            session.onerror = (event) =>
              setNotice(
                event.error === "not-allowed"
                  ? "Microphone permission was denied. Please type your question."
                  : "Voice input is unavailable. Please type your question.",
              );
            session.onend = () => {
              setListening(false);
              recognition.current = null;
            };
            try {
              setListening(true);
              setNotice("Listening… Use Stop voice to end microphone input.");
              session.start();
            } catch {
              setListening(false);
              recognition.current = null;
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
            window.speechSynthesis?.cancel();
          }}
        >
          {muted ? "Unmute voice replies" : "Mute voice replies"}
        </button>
        <button
          type="button"
          className="button secondary"
          disabled={!answer || muted}
          onClick={() => {
            const synthesis = window.speechSynthesis;
            const voice = synthesis
              ?.getVoices()
              .find((v) => v.localService && v.lang.startsWith(language));
            if (!voice) {
              setNotice(
                "Spoken replies are unavailable in this language on this device. Please read the text answer.",
              );
              return;
            }
            synthesis.cancel();
            const utterance = new SpeechSynthesisUtterance(answer);
            utterance.lang = locales[language];
            utterance.voice = voice;
            utterance.onerror = () =>
              setNotice("Spoken reply is unavailable. Please read the text answer.");
            synthesis.speak(utterance);
          }}
        >
          Read answer aloud
        </button>
      </div>
      <p className="text-xs text-muted" role="status">
        {notice}
      </p>
    </div>
  );
}
