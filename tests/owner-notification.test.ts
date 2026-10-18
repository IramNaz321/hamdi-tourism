import { test } from "node:test";
import assert from "node:assert/strict";
import {
  ownerBookingNotificationRecipient,
  ownerBookingNotificationSubject,
  ownerBookingNotificationText,
  parseOwnerBookingNotification,
} from "../src/lib/notification-adapter";

const booking = () =>
  parseOwnerBookingNotification({
    id: "a0000000-0000-4000-8000-000000000001",
    booking_id: "a0000000-0000-4000-8000-000000000001",
    lease: "a0000000-0000-4000-8000-000000000002",
    reference: "HAMDI-123",
    pickup_name: "Dubai Airport",
    dropoff_name: "City Hotel",
    customer_name: "Passenger One",
    customer_email: "passenger@example.test",
    customer_phone: "+971500000000",
    pickup_at: "2026-10-17T10:30:00+00:00",
    passengers: 2,
    luggage: 2,
    vehicle_category: "sedan",
    price_aed: 250,
    payment_status: "unpaid",
    flight_number: "EK123",
    attempt: 1,
  });

test("owner booking notice has a fixed recipient and only operational booking details", () => {
  assert.equal(ownerBookingNotificationRecipient, "hamdi.tourism@mail.ru");
  assert.equal(ownerBookingNotificationSubject("HAMDI-123"), "New booking request · HAMDI-123");
  const text = ownerBookingNotificationText(booking());
  assert.match(text, /Booking reference: HAMDI-123/);
  assert.match(text, /Customer: Passenger One/);
  assert.match(text, /Customer email: passenger@example.test/);
  assert.match(text, /Customer phone: \+971500000000/);
  assert.match(text, /Pickup: Dubai Airport/);
  assert.match(text, /Drop-off: City Hotel/);
  assert.match(text, /Passengers: 2/);
  assert.match(text, /Luggage: 2/);
  assert.match(text, /Vehicle category: sedan/);
  assert.match(text, /Agreed fare: AED 250.00 · payment status: unpaid/);
  assert.match(text, /Flight number: EK123/);
  assert.match(text, /17 Oct 2026, 14:30 UAE time/);
  assert.doesNotMatch(text, /notes/i);
});

test("owner booking notification validation rejects extra private fields and line-break injection", () => {
  assert.throws(() => parseOwnerBookingNotification({ ...booking(), customer_email: "private@example.test" }));
  assert.equal(ownerBookingNotificationSubject("HAMDI-123\nForged"), "New booking request · HAMDI-123 Forged");
});
