import pg, { type PoolClient } from "pg";
import { ServiceError } from "../../frontend-v2/src/domain.ts";
export type Actor = {
  id: string;
  email: string;
  name: string;
  role: "customer" | "owner" | "driver";
  driverId: string | null;
};
export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  min: 2,
  idleTimeoutMillis: 300000,
  connectionTimeoutMillis: 15000,
  keepAlive: true,
  keepAliveInitialDelayMillis: 10000,
});
// pg removes failed idle clients; handle the event so a Docker reconnect cannot crash the API.
pool.on("error", () => {
  console.warn("Database connection lost; the next request will reconnect.");
});
export function requireRole(actor: Actor | null, role: Actor["role"]): asserts actor is Actor {
  if (!actor) throw new ServiceError("UNAUTHENTICATED", "Sign in to continue.");
  if (actor.role !== role)
    throw new ServiceError("FORBIDDEN", "Your account cannot perform this action.");
}
export async function transaction<T>(work: (db: PoolClient) => Promise<T>) {
  const db = await pool.connect();
  try {
    await db.query("begin");
    await db.query("set local lock_timeout='5s'");
    const result = await work(db);
    await db.query("commit");
    return result;
  } catch (e) {
    await db.query("rollback");
    throw e;
  } finally {
    db.release();
  }
}
export async function lock(db: PoolClient, key: string) {
  await db.query("select pg_advisory_xact_lock(hashtextextended($1,0))", [key]);
}
export async function actorFor(id: string): Promise<Actor | null> {
  const { rows } = await pool.query(
    'select user_id id,email,name,role,driver_id "driverId" from hamdi.profiles where user_id=$1 and active',
    [id],
  );
  return rows[0] ?? null;
}
export async function visibleRead<T>(
  actor: Actor,
  query: string,
  args: unknown[] = [],
): Promise<T[]> {
  return transaction(async (db) => {
    await db.query("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor.id, role: "authenticated" }),
    ]);
    await db.query("set local role hamdi_api");
    return (await db.query(query, args)).rows;
  });
}
export async function replay(
  db: PoolClient,
  actor: string,
  key: string,
  operation: string,
): Promise<string | null> {
  if (!key || key.length > 200)
    throw new ServiceError("INVALID_KEY", "A valid action key is required.");
  await lock(db, `key:${actor}:${key}`);
  const { rows } = await db.query(
    "select operation,target from hamdi.idempotency where actor=$1 and key=$2",
    [actor, key],
  );
  if (rows[0] && rows[0].operation !== operation)
    throw new ServiceError("KEY_REUSED", "This action key was already used for another operation.");
  return rows[0]?.target ?? null;
}
export async function remember(
  db: PoolClient,
  actor: string,
  key: string,
  operation: string,
  target: string,
) {
  await db.query("insert into hamdi.idempotency(actor,key,operation,target) values($1,$2,$3,$4)", [
    actor,
    key,
    operation,
    target,
  ]);
}
