/** Offline only. This script has no sending or database execution path. */
import { bookingEmailReadiness } from "../src/lib/booking-email-readiness";
try {
  process.loadEnvFile(".env.local");
} catch {
  /* Runtime secrets may be injected instead. */
}
const report = bookingEmailReadiness(process.env);
console.log(JSON.stringify(report, null, 2));
if (report.status === "BLOCKED") process.exitCode = 2;
