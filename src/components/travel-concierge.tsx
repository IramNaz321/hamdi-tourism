"use client";
import { useState, useRef, useEffect, useId } from "react";
import { MessageCircle, ArrowUpRight, Send, X } from "lucide-react";
import { ConciergeVoice } from "./concierge-voice";
import { TurnstileChallenge } from "./turnstile-challenge";
import {
  conciergeLanguages,
  conciergeLocale,
  preferredConciergeLanguage,
} from "@/lib/concierge-languages";
import Link from "next/link";
import { conciergeErrorMessage } from "@/lib/concierge-errors";
import styles from "./travel-concierge.module.css";
type Turn = { id: number; role: "user" | "assistant"; content: string; language: string };
export function TravelConcierge({ bookingId }: { bookingId?: string } = {}) {
  const [open, setOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [message, setMessage] = useState("");
  const [answer, setAnswer] = useState("");
  const [history, setHistory] = useState<Turn[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState("");
  const [challengeKey, setChallengeKey] = useState(0);
  const initialized = useRef(false);
  const sequence = useRef(0);
  const turnId = useRef(0);
  const request = useRef<AbortController | null>(null);
  const textarea = useRef<HTMLTextAreaElement>(null);
  const launch = useRef<HTMLButtonElement>(null);
  const transcript = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (open) textarea.current?.focus();
  }, [open]);
  useEffect(() => {
    transcript.current?.scrollTo({ top: transcript.current.scrollHeight });
  }, [history, busy]);
  useEffect(
    () => () => {
      sequence.current++;
      request.current?.abort();
    },
    [],
  );
  function close() {
    sequence.current++;
    request.current?.abort();
    request.current = null;
    if (busy) setError("Response stopped. You can ask your question again.");
    setBusy(false);
    setToken("");
    setOpen(false);
    launch.current?.focus();
  }
  return (
    <aside className={styles.concierge} aria-label="Travel concierge">
      {open && (
        <section
          id={id}
          aria-labelledby={`${id}-title`}
          className={styles.window}
          dir={conciergeLocale(language).direction}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.stopPropagation();
              close();
            }
          }}
        >
          <header className={styles.header}>
            <div>
              <p>HAMDI TOURISM</p>
              <h2 id={`${id}-title`}>Travel concierge</h2>
            </div>
            <button type="button" aria-label="Close travel concierge" onClick={close}>
              <X size={19} />
            </button>
          </header>
          <div className={styles.body}>
            <p className={styles.hint}>
              Ask about your transfer. AI uses published information; never send payment details.
              Chats stay in this page’s memory and clear when you leave.
            </p>
            <label className={styles.language}>
              Language
              <select
                aria-label="Language"
                value={language}
                onChange={(event) => {
                  setLanguage(event.target.value);
                  setAnswer("");
                }}
              >
                {conciergeLanguages.map((item) => (
                  <option key={item.code} value={item.code}>
                    {item.label}
                  </option>
                ))}
              </select>
            </label>
            <div
              ref={transcript}
              className={styles.history}
              role="log"
              aria-label="Conversation history"
              aria-live="polite"
              aria-relevant="additions"
              aria-busy={busy}
            >
              {!history.length && (
                <p className={styles.welcome}>How can we help with your journey?</p>
              )}
              {history.map((turn) => (
                <div
                  key={turn.id}
                  className={turn.role === "user" ? styles.question : styles.reply}
                  lang={turn.language}
                  dir="auto"
                >
                  <span>{turn.role === "user" ? "You" : "HAMDI TOURISM"}</span>
                  <p dir="auto">{turn.content}</p>
                </div>
              ))}
              {busy && (
                <p role="status" className={styles.loading}>
                  Checking published information…
                </p>
              )}
            </div>
            {error && (
              <p className={styles.error} role="alert">
                {error}
              </p>
            )}
            <form
              onSubmit={async (event) => {
                event.preventDefault();
                const question = message.trim();
                if (busy || !question) return;
                const run = ++sequence.current;
                const controller = new AbortController();
                request.current = controller;
                const timeout = setTimeout(() => controller.abort(), 30000);
                setBusy(true);
                setError("");
                setAnswer("");
                const entry: Turn = {
                  id: ++turnId.current,
                  role: "user",
                  content: question,
                  language,
                };
                setHistory((previous) => [...previous, entry].slice(-12));
                try {
                  const response = await fetch("/api/concierge", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      message: question,
                      language,
                      token,
                      bookingId,
                      history: history
                        .slice(-6)
                        .map(({ role, content }) => ({ role, content: content.slice(0, 1000) })),
                    }),
                    signal: controller.signal,
                  });
                  const data = await response.json();
                  if (sequence.current !== run) return;
                  if (!response.ok) {
                    setError(conciergeErrorMessage(data.code, response.status, data.reason));
                  } else if (
                    typeof data.answer !== "string" ||
                    !data.answer.trim() ||
                    data.answer.length > 8000
                  ) {
                    setError("A response could not be verified. Please contact our team.");
                  } else {
                    setAnswer(data.answer);
                    setMessage("");
                    setHistory((previous) =>
                      [
                        ...previous,
                        {
                          id: ++turnId.current,
                          role: "assistant",
                          content: data.answer,
                          language,
                        } as Turn,
                      ].slice(-12),
                    );
                  }
                } catch {
                  if (sequence.current === run)
                    setError(
                      "Travel concierge is currently unavailable. Please try again or contact our team.",
                    );
                } finally {
                  clearTimeout(timeout);
                  if (sequence.current === run) {
                    request.current = null;
                    setBusy(false);
                    setToken("");
                    setChallengeKey((key) => key + 1);
                  }
                }
              }}
            >
              <label className={styles.composer}>
                Your question
                <textarea
                  ref={textarea}
                  name="message"
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  required
                  maxLength={1500}
                  rows={2}
                  lang={language}
                  dir="auto"
                  disabled={busy}
                />
              </label>
              <ConciergeVoice
                key={language}
                language={language}
                answer={answer}
                onTranscript={setMessage}
                disabled={busy}
              />
              {process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && (
                <TurnstileChallenge
                  key={challengeKey}
                  action="travel_concierge"
                  onToken={setToken}
                />
              )}
              <button type="submit" className={styles.send} disabled={busy || !message.trim()}>
                <Send size={15} aria-hidden="true" />
                {busy ? "Checking…" : "Ask concierge"}
              </button>
            </form>
            <div className={styles.links}>
              <Link href="/book">
                Plan a transfer <ArrowUpRight size={14} />
              </Link>
              <Link href="/#contact">Contact our team</Link>
            </div>
          </div>
        </section>
      )}
      <button
        ref={launch}
        className={styles.launch}
        onClick={() => {
          if (open) {
            close();
            return;
          }
          if (!initialized.current) {
            setLanguage(
              preferredConciergeLanguage(
                navigator.languages?.length
                  ? navigator.languages
                  : [navigator.language, document.documentElement.lang],
              ),
            );
            initialized.current = true;
          }
          setOpen(true);
        }}
        aria-expanded={open}
        aria-controls={id}
      >
        <MessageCircle size={19} aria-hidden="true" />
        Travel concierge
      </button>
    </aside>
  );
}
