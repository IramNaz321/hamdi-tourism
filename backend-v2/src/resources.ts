import type { FastifyInstance, FastifyRequest } from "fastify";
import type { PoolClient } from "pg";
import {
  driverInputSchema,
  onboardingInputSchema,
  vehicleInputSchema,
  ServiceError,
  todayUae,
  type Resources,
} from "../../frontend-v2/src/domain.ts";
import { z } from "zod";
import { authenticate, admin, authClient } from "./auth.ts";
import { pool, transaction, requireRole, lock } from "./db.ts";
export const driverDto = (r: any): Resources["drivers"][number] => ({
  id: r.id,
  name: r.name,
  email: r.email,
  phone: r.phone,
  active: r.active,
  available: r.available,
  licenceUntil: String(r.licence_until).slice(0, 10),
  licenceNumber: r.licence_number,
  onboardingStatus: r.onboarding_status,
});
export const vehicleDto = (r: any): Resources["vehicles"][number] => ({
  id: r.id,
  name: r.name,
  categoryId: r.category_id,
  registration: r.registration,
  registrationUntil: String(r.registration_until).slice(0, 10),
  active: r.active,
  passengers: r.passengers,
  bags: r.bags,
});
export async function resources(db: PoolClient | typeof pool = pool): Promise<Resources> {
  const [d, v] = await Promise.all([
    db.query("select *,licence_until::text from hamdi.drivers order by created_at"),
    db.query("select *,registration_until::text from hamdi.vehicles order by created_at"),
  ]);
  return { drivers: d.rows.map(driverDto), vehicles: v.rows.map(vehicleDto) };
}
export async function registerResources(app: FastifyInstance) {
  app.get("/api/v2/owner/resources", async (req) => {
    requireRole(await authenticate(req), "owner");
    return resources();
  });
  app.post("/api/v2/owner/drivers", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "owner");
    const v = driverInputSchema.parse(req.body);
    // Provision Auth first; compensate if database insertion fails. Public signup never grants Driver.
    const { data, error } = await admin.auth.admin.createUser({
      email: v.email,
      email_confirm: true,
    });
    if (error || !data.user)
      throw new ServiceError(
        "EMAIL_IN_USE",
        "This email already has an account or could not be invited. Use a dedicated Driver email.",
      );
    let driver;
    try {
      driver = await transaction(async (db) => {
        const { rows } = await db.query(
          "insert into hamdi.drivers(name,email,phone,licence_until) values($1,$2,$3,current_date) returning *,licence_until::text",
          [v.name, v.email, v.phone],
        );
        const d = rows[0];
        await db.query(
          "insert into hamdi.profiles(user_id,role,name,email,driver_id) values($1,'driver',$2,$3,$4)",
          [data.user.id, v.name, v.email, d.id],
        );
        return driverDto(d);
      });
    } catch (e) {
      await admin.auth.admin.deleteUser(data.user.id);
      throw e;
    }
    const sent = await authClient().auth.signInWithOtp({
      email: v.email,
      options: { shouldCreateUser: false },
    });
    return { ...driver, invitationSent: !sent.error };
  });
  app.patch("/api/v2/owner/drivers/:id/active", async (req) => {
    requireRole(await authenticate(req), "owner");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const { rows } = await db.query(
        "select *,licence_until::text from hamdi.drivers where id=$1 for update",
        [id],
      );
      const d = rows[0];
      if (!d) throw new ServiceError("NOT_FOUND", "Driver not found.");
      if (!active) {
        const count = await db.query(
          "select count(*)::int n from hamdi.bookings where driver_id=$1 and status in ('pending','confirmed','in_progress')",
          [id],
        );
        if (count.rows[0].n)
          throw new ServiceError(
            "RESOURCE_ASSIGNED",
            "Reassign or cancel this driver’s open bookings before deactivating.",
          );
      } else if (d.onboarding_status === "invited" || d.licence_until < todayUae())
        throw new ServiceError(
          "ONBOARDING_REQUIRED",
          "The driver must submit valid onboarding details before activation.",
        );
      const updated = await db.query(
        "update hamdi.drivers set active=$2,onboarding_status=case when $2 then 'approved' else onboarding_status end where id=$1 returning *,licence_until::text",
        [id, active],
      );
      return driverDto(updated.rows[0]);
    });
  });
  app.post("/api/v2/owner/vehicles", async (req) => {
    requireRole(await authenticate(req), "owner");
    const v = vehicleInputSchema.parse(req.body);
    if (v.registrationUntil < todayUae())
      throw new ServiceError("INVALID_EXPIRY", "Registration must be valid today or later.");
    const { rows } = await pool.query(
      "insert into hamdi.vehicles(name,category_id,registration,registration_until,passengers,bags) values($1,$2,$3,$4,$5,$6) returning *,registration_until::text",
      [
        v.name,
        v.categoryId,
        v.registration.toUpperCase(),
        v.registrationUntil,
        v.passengers,
        v.bags,
      ],
    );
    return vehicleDto(rows[0]);
  });
  app.patch("/api/v2/owner/vehicles/:id/active", async (req) => {
    requireRole(await authenticate(req), "owner");
    const { id } = z.object({ id: z.uuid() }).parse(req.params);
    const { active } = z.object({ active: z.boolean() }).parse(req.body);
    return transaction(async (db) => {
      await lock(db, "scheduling");
      const current = await db.query(
        "select *,registration_until::text from hamdi.vehicles where id=$1 for update",
        [id],
      );
      if (!current.rows[0]) throw new ServiceError("NOT_FOUND", "Vehicle not found.");
      if (active && current.rows[0].registration_until < todayUae())
        throw new ServiceError(
          "INVALID_EXPIRY",
          "Update the expired registration before activation.",
        );
      if (!active) {
        const count = await db.query(
          "select count(*)::int n from hamdi.bookings where vehicle_id=$1 and status in ('pending','confirmed','in_progress')",
          [id],
        );
        if (count.rows[0].n)
          throw new ServiceError(
            "RESOURCE_ASSIGNED",
            "Reassign or cancel this vehicle’s open bookings before deactivating.",
          );
      }
      const { rows } = await db.query(
        "update hamdi.vehicles set active=$2 where id=$1 returning *,registration_until::text",
        [id, active],
      );
      return vehicleDto(rows[0]);
    });
  });
  app.get("/api/v2/driver/profile", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "driver");
    const { rows } = await pool.query(
      "select *,licence_until::text from hamdi.drivers where id=$1",
      [actor.driverId],
    );
    if (!rows[0]) throw new ServiceError("NOT_FOUND", "Driver profile not found.");
    return driverDto(rows[0]);
  });
  app.post("/api/v2/driver/onboarding", async (req) => {
    const actor = await authenticate(req);
    requireRole(actor, "driver");
    const v = onboardingInputSchema.parse(req.body);
    if (v.licenceUntil < todayUae())
      throw new ServiceError("INVALID_EXPIRY", "Enter a current licence expiry date.");
    return transaction(async (db) => {
      const { rows } = await db.query(
        "update hamdi.drivers set name=$2,phone=$3,licence_number=$4,licence_until=$5,onboarding_status='submitted',submitted_at=now() where id=$1 and onboarding_status='invited' returning *,licence_until::text",
        [actor.driverId, v.name, v.phone, v.licenceNumber, v.licenceUntil],
      );
      if (!rows[0])
        throw new ServiceError(
          "INVALID_STATE",
          "Onboarding has already been submitted. Contact the Owner to correct details.",
        );
      await db.query("update hamdi.profiles set name=$2 where user_id=$1", [actor.id, v.name]);
      return driverDto(rows[0]);
    });
  });
}
