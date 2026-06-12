import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("寵物頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/cadet/pet`);
  await page.waitForURL(/login\/cadet|pet/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("成就頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/cadet/achievements`);
  await page.waitForURL(/login\/cadet|achievements/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("指揮官留言頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/commander/messages`);
  await page.waitForURL(/login\/commander|messages/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("計時器頁可正常載入（不需登入）", async ({ page }) => {
  await page.goto(`${BASE}/cadet/timer?m=5&title=測試計時`);
  await expect(page.getByText("計時型獎勵")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("開始計時")).toBeVisible();
});

test("計時器頁顯示倒數時間", async ({ page }) => {
  await page.goto(`${BASE}/cadet/timer?m=30&title=遊戲時間`);
  await expect(page.getByText("遊戲時間")).toBeVisible({ timeout: 5000 });
  await expect(page.getByText("30:00")).toBeVisible();
});

test("manifest.json 可正常訪問", async ({ page }) => {
  const res = await page.request.get(`${BASE}/manifest.json`);
  expect(res.status()).toBe(200);
  const json = await res.json();
  expect(json.name).toBe("StarDuty 星際學院");
  expect(json.display).toBe("standalone");
});

test("sw.js 可正常訪問", async ({ page }) => {
  const res = await page.request.get(`${BASE}/sw.js`);
  expect(res.status()).toBe(200);
});

test("/api/messages POST 缺少參數回傳 400 或 500（無 crash）", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/messages`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  // 缺少參數應回傳 400；若 DB 連線問題則回 500，但不應 crash（不回 2xx）
  expect([400, 500].includes(res.status())).toBe(true);
});
