import { expect, test, type Page } from "@playwright/test";
import path from "node:path";

const preview = (page: Page) => page.getByTestId("component-preview");

async function previewBox(page: Page) {
  const box = await preview(page).boundingBox();
  if (!box) throw new Error("preview not visible");
  return box;
}

test("fixed height keeps a constant visual height across viewport widths", async ({ page }) => {
  const expected: Array<[number, number]> = [
    [360, 180],
    [767, 383.5],
    [1535, 767.5],
  ];
  for (const [vw, w] of expected) {
    await page.goto(`/?v=1&vw=${vw}&mode=fixed&h=640&ar=9:16&fit=cover&z=0.5`);
    await expect(preview(page)).toBeVisible();
    const box = await previewBox(page);
    expect(box.height).toBeCloseTo(320, 0);
    expect(box.width).toBeCloseTo(w, 0);
  }
});

test("aspect-ratio height scales proportionally with width", async ({ page }) => {
  await page.goto(`/?v=1&vw=800&mode=aspect&car=16:9&z=0.5`);
  const a = await previewBox(page);
  await page.goto(`/?v=1&vw=1600&mode=aspect&car=16:9&z=0.5`);
  const b = await previewBox(page);
  expect(a.height).toBeCloseTo(225, 0);
  expect(b.height).toBeCloseTo(450, 0);
});

test("inspector reports the acceptance crop values", async ({ page }) => {
  await page.goto(`/?v=1&vw=430&mode=fixed&h=640&ar=9:16&fit=cover`);
  await expect(page.getByText("16.3% crop")).toBeVisible();
  await page.goto(`/?v=1&vw=767&mode=fixed&h=640&ar=4:5&fit=cover`);
  await expect(page.getByText("33.2% crop")).toBeVisible();
});

test("shared URL reconstructs the configuration and stays in sync", async ({ page }) => {
  await page.goto(`/?v=1&vw=430&mode=fixed&h=500&ar=4:5&fit=contain&x=20&y=80`);
  await expect(page.getByRole("radio", { name: "contain" })).toHaveAttribute("data-active", "true");
  await expect(page.getByLabel("Viewport width in pixels", { exact: true })).toHaveValue("430");
  await page.getByLabel("Viewport width in pixels", { exact: true }).fill("512");
  await page.getByLabel("Viewport width in pixels", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/vw=512/);
  await expect(page).toHaveURL(/h=500/);
  await expect(page).toHaveURL(/fit=contain/);
});

test("browser object-fit rendering agrees with the geometry engine", async ({ page }) => {
  await page.goto(`/?v=1&vw=767&mode=fixed&h=640&ar=native&fit=cover&x=50&y=50&z=1`);
  const img = preview(page).locator("img");
  await expect(img).toHaveAttribute("src", /landscape/);
  // For a native 1920×1072 source in 767×640, cover renders 1146.3×640 → 66.9% visible.
  await expect(page.getByText("66.9%", { exact: true })).toBeVisible();
  const fit = await img.evaluate((el) => getComputedStyle(el).objectFit);
  expect(fit).toBe("cover");
});

test("uploaded images are never sent to a server", async ({ page }) => {
  const outgoing: string[] = [];
  page.on("request", (r) => {
    if (r.method() !== "GET" || !r.url().startsWith("http://localhost")) outgoing.push(`${r.method()} ${r.url()}`);
  });
  await page.goto("/");
  await page.getByRole("radio", { name: "Upload image" }).click();
  await page.getByLabel("Choose image file").setInputFiles(path.join(__dirname, "../public/samples/product.webp"));
  await expect(page.getByText("1932×1932")).toBeVisible();
  await expect(preview(page).locator("img")).toHaveAttribute("src", /^blob:/);
  expect(outgoing.filter((r) => !r.includes("blob:"))).toEqual([]);
});

test.describe("canvas scrolling", () => {
  test.use({ viewport: { width: 1290, height: 810 } });

  const centerOf = async (page: Page, testId: string) => {
    const b = (await page.getByTestId(testId).boundingBox())!;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };

  test("lands with the component centered when zoomed in", async ({ page }) => {
    await page.goto(`/?v=1&vw=390&z=1.7`);
    await expect(page.getByText("170%", { exact: true })).toBeVisible();
    const c = await centerOf(page, "canvas-scroller");
    const p = await centerOf(page, "component-preview");
    expect(Math.abs(c.x - p.x)).toBeLessThan(2);
    expect(Math.abs(c.y - 20 - p.y)).toBeLessThan(2);
  });

  test("scrolling a zoomed canvas pans it and never scrolls the page", async ({ page }) => {
    await page.goto(`/?v=1&vw=390&z=1.7`);
    const c = await centerOf(page, "canvas-scroller");
    await page.mouse.move(c.x, c.y);
    for (let i = 0; i < 12; i++) await page.mouse.wheel(0, 300);
    await page.waitForTimeout(200);
    const state = await page.getByTestId("canvas-scroller").evaluate((el) => ({
      top: el.scrollTop,
      max: el.scrollHeight - el.clientHeight,
      pageY: window.scrollY,
    }));
    expect(state.top).toBeGreaterThanOrEqual(state.max - 1);
    expect(state.pageY).toBe(0);
  });

  test("a canvas that fits lets the page scroll", async ({ page }) => {
    await page.goto(`/?v=1&vw=390&z=0.5`);
    const c = await centerOf(page, "canvas-scroller");
    await page.mouse.move(c.x, c.y);
    await page.mouse.wheel(0, 400);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(0);
  });

  test("pinch / ctrl+wheel zoom keeps the point under the pointer", async ({ page }) => {
    // Start zoomed in so the canvas can scroll on both axes; a stage that fits
    // is centered by layout and can't be anchored.
    await page.goto(`/?v=1&vw=390&z=1.5`);
    await expect(page.getByText("150%", { exact: true })).toBeVisible();
    const scroller = (await page.getByTestId("canvas-scroller").boundingBox())!;
    const pt = { x: scroller.x + scroller.width * 0.4, y: scroller.y + scroller.height * 0.4 };
    const before = (await preview(page).boundingBox())!;
    const f0 = { x: (pt.x - before.x) / before.width, y: (pt.y - before.y) / before.height };
    await page.mouse.move(pt.x, pt.y);
    await page.keyboard.down("Control");
    for (let i = 0; i < 4; i++) await page.mouse.wheel(0, -60);
    await page.keyboard.up("Control");
    await page.waitForTimeout(200);
    const after = (await preview(page).boundingBox())!;
    expect(after.width).toBeGreaterThan(before.width * 1.5);
    expect((pt.x - after.x) / after.width).toBeCloseTo(f0.x, 2);
    expect((pt.y - after.y) / after.height).toBeCloseTo(f0.y, 2);
  });

  test("zoom buttons keep a centered component centered", async ({ page }) => {
    await page.goto(`/?v=1&vw=390&z=0.5`);
    await expect(page.getByText("50%", { exact: true })).toBeVisible();
    for (let i = 0; i < 4; i++) await page.getByRole("button", { name: "Zoom in" }).click();
    await expect(page.getByText("150%", { exact: true })).toBeVisible();
    const c = await centerOf(page, "canvas-scroller");
    const p = await centerOf(page, "component-preview");
    expect(Math.abs(c.x - p.x)).toBeLessThan(2);
    expect(Math.abs(c.y - 20 - p.y)).toBeLessThan(2);
  });
});

test("works in light and dark themes", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("radio", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("radio", { name: "Light theme" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
});
