SET local check_function_bodies = off;

CREATE ROLE "hamdi_api" WITH NOSUPERUSER INHERIT NOCREATEROLE NOCREATEDB NOLOGIN NOREPLICATION NOBYPASSRLS;

CREATE SCHEMA "hamdi";

CREATE TABLE "hamdi"."auth_challenges" (
  "id"         uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "email"      text                     NOT NULL,
  "attempts"   integer                  NOT NULL DEFAULT 0,
  "expires_at" timestamp with time zone NOT NULL DEFAULT (now() + '00:10:00'::interval),
  CONSTRAINT "auth_challenges_attempts_check" CHECK (((attempts >= 0) AND (attempts <= 6))),
  CONSTRAINT "auth_challenges_pkey" PRIMARY KEY (id)
);

ALTER TABLE "hamdi"."auth_challenges"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."bookings" (
  "id"          uuid                     NOT NULL,
  "reference"   text                     NOT NULL,
  "customer_id" uuid                     NOT NULL,
  "driver_id"   uuid,
  "vehicle_id"  uuid,
  "status"      text                     NOT NULL,
  "pickup_at"   timestamp with time zone NOT NULL,
  "data"        jsonb                    NOT NULL,
  "revision"    bigint                   NOT NULL DEFAULT 1,
  "created_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "bookings_check1" CHECK (((data ->> 'status'::text) = status)),
  CONSTRAINT "bookings_check" CHECK (((data ->> 'id'::text) = (id)::text)),
  CONSTRAINT "bookings_data_check1"
    CHECK (((((data ->> 'amountRefunded'::text))::bigint >= 0) AND (((data ->> 'amountRefunded'::text))::bigint <= ((data ->> 'amountPaid'::text))::bigint))),
  CONSTRAINT "bookings_data_check" CHECK ((((data ->> 'amountPaid'::text))::bigint >= 0)),
  CONSTRAINT "bookings_pkey" PRIMARY KEY (id),
  CONSTRAINT "bookings_reference_key" UNIQUE (reference),
  CONSTRAINT "bookings_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'confirmed'::text, 'in_progress'::text, 'completed'::text, 'cancelled'::text])))
);

ALTER TABLE "hamdi"."bookings"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."custom_requests" (
  "id"         uuid                     NOT NULL,
  "reference"  text                     NOT NULL,
  "email"      text                     NOT NULL,
  "data"       jsonb                    NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "custom_requests_pkey" PRIMARY KEY (id),
  CONSTRAINT "custom_requests_reference_key" UNIQUE (reference)
);

ALTER TABLE "hamdi"."custom_requests"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."drivers" (
  "id"                uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"              text                     NOT NULL,
  "email"             text                     NOT NULL,
  "phone"             text                     NOT NULL,
  "licence_number"    text                     NOT NULL DEFAULT ''::text,
  "licence_until"     date                     NOT NULL,
  "active"            boolean                  NOT NULL DEFAULT false,
  "available"         boolean                  NOT NULL DEFAULT true,
  "onboarding_status" text                     NOT NULL DEFAULT 'invited'::text,
  "invited_at"        timestamp with time zone NOT NULL DEFAULT now(),
  "submitted_at"      timestamp with time zone,
  "created_at"        timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "drivers_email_check" CHECK ((email = lower(email))),
  CONSTRAINT "drivers_email_key" UNIQUE (email),
  CONSTRAINT "drivers_name_check" CHECK (((length(name) >= 2) AND (length(name) <= 100))),
  CONSTRAINT "drivers_onboarding_status_check" CHECK ((onboarding_status = ANY (ARRAY['invited'::text, 'submitted'::text, 'approved'::text]))),
  CONSTRAINT "drivers_pkey" PRIMARY KEY (id)
);

ALTER TABLE "hamdi"."drivers"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."events" (
  "id"         bigint                   GENERATED ALWAYS AS IDENTITY NOT NULL,
  "booking_id" uuid,
  "actor_id"   uuid,
  "action"     text                     NOT NULL,
  "at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "events_pkey" PRIMARY KEY (id)
);

ALTER TABLE "hamdi"."events"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."idempotency" (
  "actor"      text                     NOT NULL,
  "key"        text                     NOT NULL,
  "operation"  text                     NOT NULL,
  "target"     text                     NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "idempotency_pkey" PRIMARY KEY (actor, key)
);

ALTER TABLE "hamdi"."idempotency"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."places" (
  "id"           text                     NOT NULL,
  "data"         jsonb                    NOT NULL,
  "country_code" text                     NOT NULL,
  "source"       text                     NOT NULL,
  "verified_at"  timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "places_country_code_check" CHECK ((country_code = 'AE'::text)),
  CONSTRAINT "places_pkey" PRIMARY KEY (id),
  CONSTRAINT "places_source_check" CHECK ((source = ANY (ARRAY['catalog'::text, 'google'::text])))
);

ALTER TABLE "hamdi"."places"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."profiles" (
  "user_id"   uuid    NOT NULL,
  "role"      text    NOT NULL DEFAULT 'customer'::text,
  "name"      text    NOT NULL DEFAULT 'Customer'::text,
  "email"     text    NOT NULL,
  "driver_id" uuid,
  "active"    boolean NOT NULL DEFAULT true,
  CONSTRAINT "profiles_check" CHECK (((role = 'driver'::text) = (driver_id IS NOT NULL))),
  CONSTRAINT "profiles_driver_id_key" UNIQUE (driver_id),
  CONSTRAINT "profiles_email_key" UNIQUE (email),
  CONSTRAINT "profiles_pkey" PRIMARY KEY (user_id),
  CONSTRAINT "profiles_role_check" CHECK ((role = ANY (ARRAY['customer'::text, 'owner'::text, 'driver'::text])))
);

ALTER TABLE "hamdi"."profiles"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."quotes" (
  "id"         uuid                     NOT NULL,
  "data"       jsonb                    NOT NULL,
  "expires_at" timestamp with time zone NOT NULL,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "quotes_pkey" PRIMARY KEY (id)
);

ALTER TABLE "hamdi"."quotes"
  ENABLE ROW LEVEL SECURITY;

CREATE TABLE "hamdi"."vehicles" (
  "id"                 uuid                     NOT NULL DEFAULT gen_random_uuid(),
  "name"               text                     NOT NULL,
  "category_id"        text                     NOT NULL,
  "registration"       text                     NOT NULL,
  "registration_until" date                     NOT NULL,
  "passengers"         integer                  NOT NULL,
  "bags"               integer                  NOT NULL,
  "active"             boolean                  NOT NULL DEFAULT true,
  "created_at"         timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT "vehicles_bags_check" CHECK (((bags >= 0) AND (bags <= 6))),
  CONSTRAINT "vehicles_category_id_check" CHECK ((category_id = ANY (ARRAY['sedan'::text, 'luxury'::text, 'family'::text]))),
  CONSTRAINT "vehicles_passengers_check" CHECK (((passengers >= 1) AND (passengers <= 7))),
  CONSTRAINT "vehicles_pkey" PRIMARY KEY (id),
  CONSTRAINT "vehicles_registration_key" UNIQUE (registration)
);

ALTER TABLE "hamdi"."vehicles"
  ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION hamdi.driver_id()
  RETURNS uuid
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select driver_id from hamdi.profiles where user_id=auth.uid() and role='driver' and active and auth.uid() is not null;
$function$;

CREATE OR REPLACE FUNCTION hamdi.is_owner()
  RETURNS boolean
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path TO ''
  AS $function$
 select auth.uid() is not null and exists(select 1 from hamdi.profiles where user_id=auth.uid() and role='owner' and active);
$function$;

ALTER TABLE "hamdi"."bookings"
  ADD CONSTRAINT "bookings_customer_id_fkey" FOREIGN KEY (customer_id) REFERENCES auth.users(id);

ALTER TABLE "hamdi"."bookings"
  ADD CONSTRAINT "bookings_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES hamdi.drivers(id);

ALTER TABLE "hamdi"."events"
  ADD CONSTRAINT "events_actor_id_fkey" FOREIGN KEY (actor_id) REFERENCES auth.users(id);

ALTER TABLE "hamdi"."events"
  ADD CONSTRAINT "events_booking_id_fkey" FOREIGN KEY (booking_id) REFERENCES hamdi.bookings(id);

ALTER TABLE "hamdi"."profiles"
  ADD CONSTRAINT "profiles_driver_id_fkey" FOREIGN KEY (driver_id) REFERENCES hamdi.drivers(id);

ALTER TABLE "hamdi"."profiles"
  ADD CONSTRAINT "profiles_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

ALTER TABLE "hamdi"."bookings"
  ADD CONSTRAINT "bookings_vehicle_id_fkey" FOREIGN KEY (vehicle_id) REFERENCES hamdi.vehicles(id);

CREATE INDEX bookings_customer_idx ON hamdi.bookings USING btree (customer_id, created_at DESC);

CREATE INDEX bookings_driver_idx ON hamdi.bookings USING btree (driver_id, pickup_at);

CREATE UNIQUE INDEX bookings_one_active_driver ON hamdi.bookings USING btree (driver_id)
  WHERE (status = 'in_progress'::text);

CREATE UNIQUE INDEX bookings_one_active_vehicle ON hamdi.bookings USING btree (vehicle_id)
  WHERE (status = 'in_progress'::text);

CREATE INDEX bookings_status_idx ON hamdi.bookings USING btree (status, pickup_at);

CREATE INDEX custom_requests_email_idx ON hamdi.custom_requests USING btree (email, created_at DESC);

CREATE POLICY "bookings_read" ON "hamdi"."bookings"
  FOR SELECT
  TO "hamdi_api"
  USING (((customer_id = ( SELECT auth.uid() AS uid)) OR (driver_id = ( SELECT hamdi.driver_id() AS driver_id)) OR ( SELECT hamdi.is_owner() AS is_owner)));

CREATE POLICY "requests_read" ON "hamdi"."custom_requests"
  FOR SELECT
  TO "hamdi_api"
  USING (((email = ( SELECT profiles.email
   FROM hamdi.profiles
  WHERE (profiles.user_id = ( SELECT auth.uid() AS uid)))) OR ( SELECT hamdi.is_owner() AS is_owner)));

CREATE POLICY "drivers_read" ON "hamdi"."drivers"
  FOR SELECT
  TO "hamdi_api"
  USING (((id = ( SELECT hamdi.driver_id() AS driver_id)) OR ( SELECT hamdi.is_owner() AS is_owner)));

CREATE POLICY "places_read" ON "hamdi"."places"
  FOR SELECT
  TO "hamdi_api"
  USING (true);

CREATE POLICY "profiles_read" ON "hamdi"."profiles"
  FOR SELECT
  TO "hamdi_api"
  USING (((user_id = ( SELECT auth.uid() AS uid)) OR ( SELECT hamdi.is_owner() AS is_owner)));

CREATE POLICY "quotes_read" ON "hamdi"."quotes"
  FOR SELECT
  TO "hamdi_api"
  USING (true);

CREATE POLICY "vehicles_read" ON "hamdi"."vehicles"
  FOR SELECT
  TO "hamdi_api"
  USING ((( SELECT hamdi.is_owner() AS is_owner) OR (EXISTS ( SELECT 1
   FROM hamdi.bookings b
  WHERE ((b.vehicle_id = vehicles.id) AND (b.driver_id = ( SELECT hamdi.driver_id() AS driver_id)))))));

REVOKE ALL ON FUNCTION "hamdi"."driver_id"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "hamdi"."driver_id"() TO "hamdi_api";

REVOKE ALL ON FUNCTION "hamdi"."is_owner"() FROM PUBLIC;

GRANT EXECUTE ON FUNCTION "hamdi"."is_owner"() TO "hamdi_api";

GRANT USAGE ON SCHEMA "hamdi" TO "hamdi_api";

GRANT USAGE ON SEQUENCE "hamdi"."events_id_seq" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."auth_challenges" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."bookings" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."custom_requests" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."drivers" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."events" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."idempotency" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."places" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."profiles" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."quotes" TO "hamdi_api";

GRANT INSERT, SELECT, UPDATE ON TABLE "hamdi"."vehicles" TO "hamdi_api";

-- Cross-schema and role membership grants are omitted by a schema-scoped pull.
-- Required for API read transactions to SET LOCAL ROLE and call auth.uid().
GRANT "hamdi_api" TO "postgres";
GRANT USAGE ON SCHEMA "auth" TO "hamdi_api";
