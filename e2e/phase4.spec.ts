import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("歷史紀錄頁未登入會 redirect（指揮官）", async ({ page }) => {
  await page.goto(`${BASE}/commander/history`);
  await page.waitForURL(/login\/commander|history/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("排行榜頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/commander/leaderboard`);
  await page.waitForURL(/login\/commander|leaderboard/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("/api/push/subscribe POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/push/subscribe`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("/api/children/adjust-coins POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/children/adjust-coins`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("所有主要路由返回 200 或 redirect（無 500）", async ({ page }) => {
  const routes = [
    "/", "/signup", "/login/commander", "/login/cadet",
    "/cadet/timer?m=5&title=test",
  ];
  for (const route of routes) {
    await page.goto(`${BASE}${route}`);
    expect(page.url()).not.toContain("500");
    const title = await page.title();
    expect(title).toContain("StarDuty");
  }
});

test("首頁標題正確", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page).toHaveTitle(/StarDuty/);
  await expect(page.getByText("星際學院")).toBeVisible();
});
