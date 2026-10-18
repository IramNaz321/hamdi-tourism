import { test, expect } from "@playwright/test";
import { build } from "esbuild";

let bundle: string;

test.beforeAll(async () => {
  const result = await build({
    stdin: {
      contents: `import React from 'react';import {createRoot} from 'react-dom/client';import {LocationPicker} from './src/components/location-picker';createRoot(document.getElementById('root')).render(<LocationPicker label="Pickup location" name="pickup_id" disabled={false} locations={[{id:'a1000000-0000-4000-8000-000000000001',name:'Dubai International Airport',city:'Dubai',kind:'airport',airport_code:'DXB',description:null,image_path:null,featured_destination:false}]} />);`,
      resolveDir: process.cwd(),
      loader: "tsx",
    },
    bundle: true,
    write: false,
    format: "iife",
    platform: "browser",
    jsx: "automatic",
    define: { "process.env.NODE_ENV": '"production"' },
  });
  bundle = result.outputFiles[0].text;
});

test("location search only submits an exact owner-published suggestion", async ({ page }) => {
  await page.setContent('<form><div id="root"></div></form>');
  await page.addScriptTag({ content: bundle });
  const input = page.getByLabel("Pickup location");
  const idField = page.locator('input[name="pickup_id"]');
  const listId = await input.getAttribute("list");

  expect(
    await page
      .locator(`#${listId}`)
      .locator("option")
      .evaluateAll((options) => options.map((option) => (option as HTMLOptionElement).value)),
  ).toEqual(["Dubai International Airport · Dubai · DXB · airport"]);

  await input.fill("Fictional Dubai Hotel");
  await expect(idField).toHaveValue("");
  expect(await input.evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(false);

  await input.fill("Dubai International Airport · Dubai · DXB · airport");
  await expect(idField).toHaveValue("a1000000-0000-4000-8000-000000000001");
  expect(await input.evaluate((element: HTMLInputElement) => element.validity.valid)).toBe(true);
});
