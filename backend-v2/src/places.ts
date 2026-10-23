import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { ServiceError } from "../../frontend-v2/src/domain.ts";
import { pool } from "./db.ts";
export async function registerPlaces(app: FastifyInstance) {
  app.get("/api/v2/places/config", async () => ({
    configured: true,
    browserKey: "",
    countryCode: "AE",
    localTestMode: process.env.LOCAL_TEST_MODE === "true",
  }));
  app.post("/api/v2/places/search", async (req) => {
    const { query } = z.object({ query: z.string().trim().min(1).max(120) }).parse(req.body);
    const { rows } = await pool.query(
      "select id,data from hamdi.places where country_code='AE' and source='catalog' and (strpos(lower(data->>'name'),lower($1))>0 or strpos(lower(data->>'city'),lower($1))>0) order by data->>'city',data->>'name' limit 40",
      [query],
    );
    return {
      predictions: rows.map((r) => ({ placeId: r.id, label: `${r.data.name} · ${r.data.city}` })),
    };
  });
  app.post("/api/v2/places/select", async (req) => {
    const { placeId } = z.object({ placeId: z.string().min(1).max(300) }).parse(req.body);
    const { rows } = await pool.query(
      "select data from hamdi.places where id=$1 and country_code='AE' and source='catalog'",
      [placeId],
    );
    if (!rows[0])
      throw new ServiceError("INVALID_LOCATION", "Choose a place from our UAE catalogue.");
    return rows[0].data;
  });
  app.post("/api/v2/places/reverse", async () => {
    throw new ServiceError("MAP_UNAVAILABLE", "Choose a place from our UAE catalogue.");
  });
}
