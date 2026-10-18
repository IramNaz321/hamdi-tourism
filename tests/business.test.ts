import { test } from "node:test";
import assert from "node:assert/strict";
import sharp from "sharp";
import { uaeDateTime, journeySchema } from "../src/lib/booking-validation";
import { settingsSchema } from "../src/lib/settings-validation";
import { prepareImage } from "../src/lib/image-validation";
import { publishedFleetCapacityError } from "../src/lib/fleet-capacity";
const pickup = "10000000-0000-4000-8000-000000000001";
const dropoff = "10000000-0000-4000-8000-000000000002";
const inputTime = (days: number) =>
  new Date(Date.now() + days * 86400000 + 14400000).toISOString().slice(0, 16);
const journey = {
  pickup_id: pickup,
  dropoff_id: dropoff,
  pickup_at: inputTime(2),
  return_at: "",
  passengers: "2",
  luggage: "1",
  category: "sedan",
  transfer_type: "one_way",
  flight: "",
  extras: [],
};
test("enquiry validation rejects repeated locations, past dates, invalid calendar dates and fractional passengers", () => {
  for (const patch of [
    { dropoff_id: pickup },
    { pickup_at: "2020-01-01T10:00" },
    { pickup_at: "2099-02-31T10:00" },
    { passengers: "2.5" },
    { luggage: "-1" },
  ])
    assert.throws(() => journeySchema.parse({ ...journey, ...patch }));
});
test("return enquiry requires a later real return pickup and unique optional extras", () => {
  assert.throws(() => journeySchema.parse({ ...journey, transfer_type: "return" }));
  assert.throws(() => journeySchema.parse({ ...journey, extras: [pickup, pickup] }));
  const parsed = journeySchema.parse({
    ...journey,
    transfer_type: "return",
    return_at: inputTime(3),
  });
  assert.ok(parsed.return_at! > parsed.pickup_at);
});
test("UAE dates are host-timezone independent and invalid dates do not normalize silently", () => {
  assert.equal(uaeDateTime("2027-01-01T10:00"), "2027-01-01T06:00:00.000Z");
  assert.throws(() => uaeDateTime("2027-02-30T10:00"));
});
test("transfer vehicle checks require a published category with sufficient real capacity", () => {
  const fleet = [
    { category: "sedan", capacity: 3, luggage_capacity: 2 },
    { category: "van", capacity: 7, luggage_capacity: 5 },
  ];
  assert.equal(
    publishedFleetCapacityError(fleet, { category: "sedan", passengers: 3, luggage: 2 }),
    undefined,
  );
  assert.match(
    publishedFleetCapacityError(fleet, { category: "sedan", passengers: 4, luggage: 2 }) ?? "",
    /can carry/,
  );
  assert.match(
    publishedFleetCapacityError(fleet, { category: "van", passengers: 5, luggage: 6 }) ?? "",
    /can carry/,
  );
  assert.match(
    publishedFleetCapacityError([], { category: "sedan", passengers: 1, luggage: 0 }) ?? "",
    /No vehicles/,
  );
  assert.match(
    publishedFleetCapacityError([{ category: "sedan", capacity: 3, luggage_capacity: null }], {
      category: "sedan",
      passengers: 1,
      luggage: 1,
    }) ?? "",
    /can carry/,
  );
});
test("settings reject CSS injection, malformed WhatsApp and unsupported currencies", () => {
  const input = {
    display_name: "Entered business name",
    contact_email: "",
    phone: "",
    whatsapp: "",
    address: "",
    about_text: "",
    booking_policy: "",
    cancellation_policy: "",
    currency: "AED",
    published: false,
    enquiries_enabled: false,
    minimum_notice_hours: 0,
    turnaround_minutes: 0,
    brand_color: "#946732",
    ink_color: "#183431",
    canvas_color: "#f5f6f3",
    font_family: "system",
  };
  assert.ok(settingsSchema.safeParse(input).success);
  for (const patch of [
    { brand_color: "red;url(javascript:alert(1))" },
    { whatsapp: "not a number" },
    { currency: "USD" },
    { turnaround_minutes: -1 },
  ])
    assert.equal(settingsSchema.safeParse({ ...input, ...patch }).success, false);
});
test("uploads reject spoofed MIME, SVG and oversized files", async () => {
  for (const file of [
    new File(["not an image"], "fake.jpg", { type: "image/jpeg" }),
    new File(["<svg/>"], "vector.svg", { type: "image/svg+xml" }),
    new File([new Uint8Array(4 * 1024 * 1024 + 1)], "large.png", { type: "image/png" }),
  ])
    await assert.rejects(() => prepareImage(file));
});
test("valid image uploads are re-encoded and resized, stripping arbitrary file metadata", async () => {
  const png = await sharp({
    create: { width: 2000, height: 1000, channels: 3, background: "white" },
  })
    .png()
    .toBuffer();
  const file = new File([new Uint8Array(png)], "test-only.png", { type: "image/png" });
  const metadata = await sharp(await prepareImage(file)).metadata();
  assert.equal(metadata.format, "webp");
  assert.equal(metadata.width, 1600);
  assert.equal(metadata.height, 800);
  assert.equal(metadata.exif, undefined);
});
