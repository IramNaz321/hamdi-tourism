import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import manifest from "../src/content/vehicle-photos.json";
test("local licensed showcase photos exist independently of any operational fleet", () => {
  assert.deepEqual(Object.keys(manifest).sort(), ["hero", "luxury", "sedan", "suv", "van"]);
  const provenance = JSON.parse(
    readFileSync("public/vehicle-photos/licenses/provenance.json", "utf8"),
  ) as { file: string; sha256: string }[];
  assert.equal(provenance.length, 4);
  for (const photo of Object.values(manifest)) {
    assert.deepEqual(Object.keys(photo).sort(), ["alt", "credit", "license", "source", "src"]);
    assert.ok(photo.src.startsWith("/vehicle-photos/"));
    assert.ok(photo.source.startsWith("https://commons.wikimedia.org/wiki/File:"));
    assert.ok(photo.license.startsWith("https://"));
    assert.ok(photo.credit);
    const bytes = readFileSync(`public${photo.src}`);
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a");
    const entry = provenance.find((item) => photo.src.endsWith(`/${item.file}.png`));
    assert.equal(createHash("sha256").update(bytes).digest("hex"), entry?.sha256);
  }
  assert.equal(manifest.hero.src, manifest.luxury.src);
});
