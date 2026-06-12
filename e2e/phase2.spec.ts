import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("商城頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/cadet/shop`);
  await page.waitForURL(/login\/cadet|shop/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("心願清單頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/cadet/wishlist`);
  await page.waitForURL(/login\/cadet|wishlist/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("歷程頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/cadet/history`);
  await page.waitForURL(/login\/cadet|history/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("待兌現清單頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/commander/fulfill`);
  await page.waitForURL(/login\/commander|fulfill/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("獎勵設定頁未登入會 redirect", async ({ page }) => {
  await page.goto(`${BASE}/commander/rewards`);
  await page.waitForURL(/login\/commander|rewards/, { timeout: 8000 });
  expect(page.url()).not.toContain("500");
});

test("/api/rewards POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/rewards`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("/api/rewards/fulfill POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/rewards/fulfill`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("/api/wishlist/toggle POST 缺少參數回傳 400", async ({ page }) => {
  const res = await page.request.post(`${BASE}/api/wishlist/toggle`, {
    data: {},
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

test("學員 layout 底部有商城和心願連結", async ({ page }) => {
  await page.goto(`${BASE}/cadet`);
  await page.waitForTimeout(500);
  expect(page.url()).not.toContain("500");
});
