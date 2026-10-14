import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../src/content/vehicle-photos.json";
test("four original optimized studio visuals exist without operational inventory", () => {
  const provenance = JSON.parse(
    readFileSync("public/vehicle-photos/studio-provenance.json", "utf8"),
  ) as { file: string; sha256: string }[];
  assert.equal(provenance.length, 4);
  for (const key of ["sedan", "luxury", "van", "suv"] as const) {
    const photo = manifest[key];
    assert.match(photo.alt, /marketing visualization/);
    assert.equal(photo.source, "/vehicle-photos/STUDIO-PROVENANCE.md");
    const bytes = readFileSync(`public${photo.src}`);
    assert.equal(bytes.subarray(8, 12).toString(), "WEBP");
    assert.equal(
      createHash("sha256").update(bytes).digest("hex"),
      provenance.find((p) => p.file === photo.src)?.sha256,
    );
    assert.ok(bytes.length < 300000);
  }
});
