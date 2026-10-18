/** Secret-safe acceptance probe. Default is offline. --live authorizes bounded Groq requests only. */
import { createClient } from "@supabase/supabase-js";
import { publicSupabaseConfig } from "../src/lib/supabase/config";
import { configuredSiteOrigin } from "../src/lib/site-origin";
import { conciergeSystem, extractGroqResponse } from "../src/lib/concierge";
import { z } from "zod";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Runtime secret injection is also supported. */
}
let probeStage = "configuration";
async function main() {
  const keys = [
    "GROQ_API_KEY",
    "GROQ_MODEL",
    "AI_RATE_LIMIT_SECRET",
    "NEXT_PUBLIC_TURNSTILE_SITE_KEY",
    "TURNSTILE_SECRET_KEY",
    "RESEND_API_KEY",
    "RESEND_WEBHOOK_SECRET",
    "NOTIFICATION_FROM",
    "NOTIFICATION_WORKER_SECRET",
  ];
  const present = Object.fromEntries(keys.map((key) => [key, !!process.env[key]?.trim()]));
  const config = publicSupabaseConfig(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
  const origin = configuredSiteOrigin(process.env);
  const model = process.env.GROQ_MODEL?.trim() ?? "";
  const ready =
    !!config &&
    !!origin &&
    z.uuid().safeParse(process.env.HAMDI_ORGANIZATION_ID).success &&
    present.GROQ_API_KEY &&
    /^[a-zA-Z0-9._/-]{1,100}$/.test(model) &&
    (process.env.AI_RATE_LIMIT_SECRET?.trim().length ?? 0) >= 32 &&
    present.NEXT_PUBLIC_TURNSTILE_SITE_KEY &&
    present.TURNSTILE_SECRET_KEY;
  const report: Record<string, unknown> = {
    environment: process.env.CODESPACES === "true" ? "Codespaces" : "other",
    present,
    configurationValid: ready,
    expectedCaptchaHostname: origin ? new URL(origin).hostname : null,
    captchaProviderVerification: "requires a real browser challenge; presence is not verification",
    enabled: process.env.GROQ_CONCIERGE_ENABLED === "true",
    enablementChanged: false,
    emailsSent: false,
    databaseWrites: false,
    productionReady: false,
  };
  if (!ready || !process.argv.includes("--live")) {
    report.liveProbe = ready ? "not requested" : "blocked_missing_or_invalid_configuration";
    console.log(JSON.stringify(report, null, 2));
    if (!ready) process.exitCode = 2;
    return;
  }
  probeStage = "model_access";
  const models = await fetch("https://api.groq.com/openai/v1/models", {
    headers: { Authorization: `Bearer ${process.env.GROQ_API_KEY}` },
    signal: AbortSignal.timeout(15000),
  });
  if (!models.ok) throw Error("Provider model validation unavailable");
  const modelList = z
    .object({ data: z.array(z.object({ id: z.string() })) })
    .parse(await models.json());
  if (!modelList.data.some((item) => item.id === model))
    throw Error("Configured model not available");
  probeStage = "published_supabase_grounding";
  const client = createClient(config!.url, config!.key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: context, error } = await client.rpc("concierge_context", {
    business_id: process.env.HAMDI_ORGANIZATION_ID,
  });
  const groundingAvailable = !error && !!context?.public;
  report.publicGroundingVerified = groundingAvailable;
  const records = groundingAvailable
    ? { public: context.public, fares: (context.fares ?? []).slice(0, 10) }
    : { public: null, fares: [] };
  if (JSON.stringify(records).length > 16000)
    throw Error("Grounding exceeds diagnostic input limit");
  const checks = [];
  for (const language of ["en", "ur", "ar"]) {
    probeStage = `groq_response_${language}`;
    const r = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        max_completion_tokens: 80,
        messages: [
          { role: "system", content: conciergeSystem },
          {
            role: "user",
            content: JSON.stringify({
              language,
              question:
                "In one short sentence, explain how a visitor can request a transfer. Do not quote prices or claim availability.",
              records,
            }),
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!r.ok)
      throw Error(
        r.status === 429 ? "Groq quota reached; no retries attempted" : "Groq probe unavailable",
      );
    const answer = extractGroqResponse(await r.json());
    const scriptMatches =
      language === "en" ? /[a-z]/i.test(answer) : /[\u0600-\u06ff]/.test(answer);
    if (!scriptMatches) throw Error("Requested language script not verified");
    checks.push({ language, providerResponse: true, scriptMatches });
  }
  report.liveProbe = groundingAvailable
    ? "provider_and_public_grounding_pass"
    : "provider_pass_public_grounding_blocked";
  if (!groundingAvailable) process.exitCode = 2;
  report.languageChecks = checks;
  report.codespaceBrowserAcceptance = "not verified by this CLI";
  console.log(JSON.stringify(report, null, 2));
}
void main().catch(() => {
  console.error(
    JSON.stringify({
      status: "BLOCKED",
      stage: probeStage,
      credentialsDisplayed: false,
      enablementChanged: false,
      databaseWrites: false,
      emailsSent: false,
    }),
  );
  process.exitCode = 1;
});
