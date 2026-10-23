import { createClient, type Session as SupabaseSession } from "@supabase/supabase-js";
import type { FastifyInstance, FastifyRequest } from "fastify";
import { z } from "zod";
import { actorFor, pool, type Actor } from "./db.ts";
import { ServiceError } from "../../frontend-v2/src/domain.ts";
const url = process.env.SUPABASE_URL ?? "";
if (!/^http:\/\/(127\.0\.0\.1|localhost):\d+$/.test(url) && process.env.NODE_ENV !== "production")
  throw new Error(
    "Local development requires a local Supabase URL. Hosted projects are not permitted.",
  );
const options = {
  auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
};
export const admin = createClient(url, process.env.SUPABASE_SERVICE_ROLE_KEY ?? "", options);
export const authClient = () => createClient(url, process.env.SUPABASE_ANON_KEY ?? "", options);
export const tokenFrom = (request: FastifyRequest) =>
  request.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
const verifier = authClient();
export async function authenticate(request: FastifyRequest): Promise<Actor | null> {
  const token = tokenFrom(request);
  if (!token) return null;
  const { data, error } = await verifier.auth.getClaims(token);
  if (error || !data?.claims) {
    if (error?.name === "AuthRetryableFetchError")
      throw new ServiceError(
        "AUTH_UNAVAILABLE",
        "Sign-in verification is temporarily unavailable. Please retry.",
      );
    throw new ServiceError("UNAUTHENTICATED", "Your sign-in expired. Please sign in again.");
  }
  const claims = data.claims;
  if (!claims.sub || !claims.session_id)
    throw new ServiceError("UNAUTHENTICATED", "This session is invalid. Sign in again.");
  const session = await pool.query(
    "select 1 from auth.sessions where id=$1 and user_id=$2 and (not_after is null or not_after>now())",
    [claims.session_id, claims.sub],
  );
  if (!session.rowCount)
    throw new ServiceError("UNAUTHENTICATED", "This session has ended. Sign in again.");
  const actor = await actorFor(claims.sub);
  if (!actor) throw new ServiceError("FORBIDDEN", "Your account is inactive. Contact the Owner.");
  return actor;
}

function publicSession(actor: Actor) {
  return {
    id: actor.id,
    name: actor.name,
    email: actor.email,
    role: actor.role,
    driverId: actor.driverId,
  };
}
async function authResult(s: SupabaseSession) {
  let actor = await actorFor(s.user.id);
  if (!actor) {
    const existing = await pool.query("select 1 from hamdi.profiles where user_id=$1", [s.user.id]);
    if (existing.rowCount)
      throw new ServiceError("FORBIDDEN", "Your account is inactive. Contact the Owner.");
    await pool.query(
      "insert into hamdi.profiles(user_id,email,name,role) values($1,$2,'Customer','customer') on conflict(user_id) do nothing",
      [s.user.id, s.user.email!.toLowerCase()],
    );
    actor = await actorFor(s.user.id);
  }
  if (!actor) throw new ServiceError("FORBIDDEN", "Account unavailable.");
  return {
    session: publicSession(actor),
    tokens: {
      accessToken: s.access_token,
      refreshToken: s.refresh_token,
      expiresAt: s.expires_at!,
    },
  };
}
export async function registerAuth(app: FastifyInstance) {
  app.get("/api/v2/session", async (req) => {
    const actor = await authenticate(req);
    return actor ? publicSession(actor) : null;
  });
  app.post(
    "/api/v2/auth/challenges",
    { config: { rateLimit: { max: 8, timeWindow: "10 minutes" } } },
    async (req) => {
      const { email } = z
        .object({ email: z.email().transform((v) => v.toLowerCase()) })
        .parse(req.body);
      const { error } = await authClient().auth.signInWithOtp({
        email,
        options: { shouldCreateUser: true },
      });
      if (error)
        throw new ServiceError(
          "AUTH_UNAVAILABLE",
          "Could not send a sign-in code. Wait briefly and try again.",
        );
      const { rows } = await pool.query(
        "insert into hamdi.auth_challenges(email) values($1) returning id",
        [email],
      );
      return { id: rows[0].id };
    },
  );
  app.post(
    "/api/v2/auth/verify",
    { config: { rateLimit: { max: 20, timeWindow: "10 minutes" } } },
    async (req) => {
      const { challengeId, code } = z
        .object({ challengeId: z.uuid(), code: z.string().regex(/^\d{6}$/) })
        .parse(req.body);
      const { rows } = await pool.query(
        "update hamdi.auth_challenges set attempts=attempts+1 where id=$1 and attempts<5 and expires_at>now() returning email",
        [challengeId],
      );
      if (!rows[0])
        throw new ServiceError(
          "EXPIRED_CODE",
          "This code expired or too many attempts were made. Request a new one.",
        );
      const { data, error } = await authClient().auth.verifyOtp({
        email: rows[0].email,
        token: code,
        type: "email",
      });
      if (error || !data.session)
        throw new ServiceError(
          "INVALID_CODE",
          "That code is invalid or expired. Request a new one.",
        );
      await pool.query("delete from hamdi.auth_challenges where id=$1", [challengeId]);
      return authResult(data.session);
    },
  );
  app.post("/api/v2/auth/refresh", async (req) => {
    const { refreshToken } = z
      .object({ refreshToken: z.string().min(10).max(4000) })
      .parse(req.body);
    const { data, error } = await authClient().auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) throw new ServiceError("UNAUTHENTICATED", "Please sign in again.");
    return authResult(data.session);
  });
  app.delete("/api/v2/auth/session", async (req) => {
    const token = tokenFrom(req);
    if (token) await admin.auth.admin.signOut(token, "local");
    return null;
  });
}
