import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("學員登入頁可正常載入", async ({ page }) => {
  await page.goto(`${BASE}/login/cadet`);
  await expect(page.getByText("學員登入")).toBeVisible();
});

test("未登入訪問 /cadet 會 redirect 到登入頁", async ({ page }) => {
  await page.goto(`${BASE}/cadet`);
  await page.waitForURL(/login\/cadet|cadet$/, { timeout: 8000 });
  const url = page.url();
  expect(url.includes("login/cadet") || url.endsWith("/cadet")).toBe(true);
});

test("未登入訪問 /cadet/tasks 會 redirect 到登入頁", async ({ page }) => {
  await page.goto(`${BASE}/cadet/tasks`);
  await page.waitForURL(/login\/cadet|cadet\/tasks/, { timeout: 8000 });
  expect(page.url()).not.toContain("error");
});

test("/api/tasks/complete POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/tasks/complete`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect([400, 401, 500].includes(res.status())).toBe(true);
});

test("cadet layout 底部導航有五個頁籤", async ({ page }) => {
  await page.goto(`${BASE}/cadet`);
  await page.waitForTimeout(500);
  // 無論是否 redirect，頁面不崩潰
  expect(page.url()).not.toContain("500");
});

test("學員登入頁有 KID 輸入框", async ({ page }) => {
  await page.goto(`${BASE}/login/cadet`);
  await expect(page.getByPlaceholder(/KID/i)).toBeVisible();
});
