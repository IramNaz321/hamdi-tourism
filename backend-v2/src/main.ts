import Fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import { z } from "zod";
import { ServiceError } from "../../frontend-v2/src/domain.ts";
import { pool } from "./db.ts";
import { registerAuth } from "./auth.ts";
import { registerResources } from "./resources.ts";
import { registerBookings } from "./bookings.ts";
import { registerRequests } from "./requests.ts";
import { registerPayments } from "./payments.ts";
import { registerPlaces } from "./places.ts";
export async function buildApp() {
  if (process.env.NODE_ENV === "production" && process.env.LOCAL_TEST_MODE === "true")
    throw new Error("Local payment and early-trip controls cannot run in production.");
  const app = Fastify({
    logger:
      process.env.NODE_ENV === "test"
        ? false
        : {
            level: "info",
            redact: ["req.headers.authorization", "req.headers.cookie", "res.headers.set-cookie"],
          },
    bodyLimit: 32768,
  });
  await app.register(rateLimit, { global: true, max: 200, timeWindow: "1 minute" });
  app.addHook("onRequest", async (req, reply) => {
    reply.header("Cache-Control", "no-store");
    reply.header("X-Content-Type-Options", "nosniff");
    const origin = req.headers.origin;
    if (origin && origin !== (process.env.APP_ORIGIN ?? "http://localhost:4173")) {
      reply.code(403);
      throw new ServiceError("FORBIDDEN", "This request origin is not permitted.");
    }
  });
  app.setErrorHandler((error, req, reply) => {
    if (error instanceof z.ZodError)
      return reply
        .code(400)
        .send({ code: "INVALID_INPUT", message: error.issues[0]?.message ?? "Check your input." });
    if (error instanceof ServiceError) {
      const status =
        error.code === "UNAUTHENTICATED"
          ? 401
          : error.code === "FORBIDDEN"
            ? 403
            : error.code === "NOT_FOUND"
              ? 404
              : 409;
      return reply.code(status).send({ code: error.code, message: error.message });
    }
    const code = (error as { code?: string }).code;
    if (code === "23505")
      return reply
        .code(409)
        .send({
          code: "CONFLICT",
          message: "This record already exists or an active resource is already in use.",
        });
    if (code === "55P03" || code === "40P01" || code === "40001")
      return reply
        .code(409)
        .send({
          code: "BUSY",
          message: "Another operation changed this booking. Refresh and retry.",
        });
    if ((error as { statusCode?: number }).statusCode === 429)
      return reply
        .code(429)
        .send({ code: "RATE_LIMIT", message: "Too many requests. Wait briefly and retry." });
    req.log.error({ code, requestId: req.id }, "API operation failed");
    return reply
      .code(500)
      .send({
        code: "INTERNAL",
        message: "The service could not complete this request. Try again.",
      });
  });
  app.get("/api/v2/health", async () => {
    await pool.query("select 1");
    return {
      ok: true,
      persistence: "postgres",
      auth: "supabase",
      localTestMode: process.env.LOCAL_TEST_MODE === "true",
    };
  });
  await registerAuth(app);
  await registerPlaces(app);
  await registerResources(app);
  await registerBookings(app);
  await registerRequests(app);
  await registerPayments(app);
  app.addHook("onClose", async () => pool.end());
  return app;
}
if (process.env.NODE_ENV !== "test") {
  const app = await buildApp();
  await app.listen({ host: "127.0.0.1", port: Number(process.env.PORT ?? 4180) });
  for (const signal of ["SIGINT", "SIGTERM"] as const)
    process.once(signal, async () => {
      await app.close();
      process.exit(0);
    });
}
