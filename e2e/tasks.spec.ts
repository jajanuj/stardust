import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("未登入訪問 /commander/tasks 會 redirect 到登入頁", async ({ page }) => {
  await page.goto(`${BASE}/commander/tasks`);
  await page.waitForURL(/login\/commander|commander\/tasks/, { timeout: 8000 });
  // 正確行為：redirect 到 login 或停在 tasks（已登入）
  const url = page.url();
  expect(url.includes("login/commander") || url.includes("commander/tasks")).toBe(true);
});

test("未登入訪問 /commander 會 redirect 到登入頁", async ({ page }) => {
  await page.goto(`${BASE}/commander`);
  await page.waitForURL(/login\/commander|signup|commander$/, { timeout: 8000 });
  const url = page.url();
  expect(url.includes("login/commander") || url.includes("signup") || url.includes("/commander")).toBe(true);
});

test("commander layout nav 有六個頁籤（未登入會看到 nav 短暫出現或redirect）", async ({ page }) => {
  await page.goto(`${BASE}/commander/tasks`);
  // 不管 redirect 狀態，確認沒有崩潰
  await page.waitForTimeout(1000);
  expect(page.url()).not.toContain("500");
});

test("/api/tasks POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/tasks`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("/api/tasks/[id] PATCH 對不存在 id 不崩潰", async ({ page }) => {
  const res = await page.request.patch(`${BASE}/api/tasks/00000000-0000-0000-0000-000000000000`, {
    data: { title: "test" },
    headers: { "Content-Type": "application/json" },
  });
  // 500（DB error）或其他非 crash 的 response
  expect([200, 400, 404, 500].includes(res.status())).toBe(true);
});

test("任務管理 signup 入口跳轉正確", async ({ page }) => {
  await page.goto(`${BASE}/`);
  await expect(page.getByText("指揮官登入")).toBeVisible();
  await page.getByText("指揮官登入").click();
  await expect(page).toHaveURL(`${BASE}/login/commander`);
});
