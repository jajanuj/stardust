import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("待審核頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/commander/approvals`);
  await page.waitForURL(/login\/commander|approvals/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("/api/approvals/approve 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/approvals/approve`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("/api/approvals/reject 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/approvals/reject`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("/api/tasks/daily-reset 無 cron secret 回傳 401", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/tasks/daily-reset`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(401);
});

test("底部導航待審核連結可點擊", async ({ page }) => {
  await page.goto(`${BASE}/commander`);
  const link = page.locator("nav").getByText("待審核");
  await expect(link).toBeVisible({ timeout: 5000 });
});
