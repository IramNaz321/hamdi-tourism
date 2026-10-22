import { test } from "node:test";
import assert from "node:assert/strict";
import { conciergeErrorMessage } from "../src/lib/concierge-errors";
test("concierge failure messages never invent provider capacity or confuse origin with CAPTCHA", () => {
  assert.match(
    conciergeErrorMessage("configuration_required", 503, "disabled"),
    /not been enabled/,
  );
  assert.doesNotMatch(
    conciergeErrorMessage("configuration_required", 503, "configuration_missing_or_invalid"),
    /not been enabled/,
  );
  assert.match(
    conciergeErrorMessage("grounding_unavailable", 503),
    /published business information/,
  );
  assert.match(conciergeErrorMessage("origin_mismatch", 403), /website address/);
  assert.doesNotMatch(conciergeErrorMessage("origin_mismatch", 403), /security check/);
  assert.doesNotMatch(conciergeErrorMessage("provider_unavailable", 503), /capacity/);
  assert.match(conciergeErrorMessage("security_check_required", 403), /security check/);
  assert.match(conciergeErrorMessage("provider_rate_limited", 429), /limit reached/);
  assert.ok(
    !conciergeErrorMessage("private-provider-canary", 500).includes("private-provider-canary"),
  );
});
