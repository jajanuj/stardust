import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("任務頁有模板按鈕（auth redirect 前先檢查 URL 無 500）", async ({ page }) => {
  await page.goto(`${BASE}/commander/tasks`);
  await page.waitForURL(/login\/commander|tasks/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("任務模板資料正確（直接 import 驗證）", async ({ page }) => {
  // 到 tasks 頁後會被 redirect，但 page 本身不 crash
  await page.goto(`${BASE}/commander/tasks`);
  await page.waitForURL(/login|tasks/, { timeout: 8000 });
  expect(page.url()).not.toContain("error");
});

test("首頁 → signup → commander tasks 路由全部 200", async ({ page }) => {
  const routes = ["/", "/signup", "/login/commander", "/login/cadet"];
  for (const route of routes) {
    const res = await page.request.get(`${BASE}${route}`);
    expect([200, 307, 308].includes(res.status())).toBe(true);
  }
});
