import { test, expect } from "@playwright/test";
import { BASE, loginAsCommander } from "./_auth";

// ── 1. API 驗證測試（不需要登入）─────────────────────────────────────
test("adjust-coins API：缺少 childId 回傳 400", async ({ request }) => {
  const res = await request.post(`${BASE}/api/children/adjust-coins`, {
    data: { delta: 10 },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
  const body = await res.json();
  expect(body.error).toBeTruthy();
});

test("adjust-coins API：缺少 delta 回傳 400", async ({ request }) => {
  const res = await request.post(`${BASE}/api/children/adjust-coins`, {
    data: { childId: "00000000-0000-0000-0000-000000000000" },
    headers: { "Content-Type": "application/json" },
  });
  expect(res.status()).toBe(400);
});

// ── 2. 頁面結構測試（未登入）──────────────────────────────────────────
test("未登入：/commander/cadets 重導向登入", async ({ page }) => {
  await page.goto(`${BASE}/commander/cadets`);
  await page.waitForURL(/login\/commander/, { timeout: 8000 });
  expect(page.url()).toContain("login/commander");
});

// ── 3. 完整 E2E：登入 → 開啟星塵 modal → 調整 → 驗證成功畫面 ─────────
test("指揮官調整星塵完整流程", async ({ page }) => {
  // 登入
  await loginAsCommander(page, "/commander/cadets");

  // 等待學員列表載入
  await expect(page.locator("h1", { hasText: "學員管理" })).toBeVisible({ timeout: 10000 });

  // 確認至少有一位學員
  const firstCadet = page.locator(".card").first();
  await expect(firstCadet).toBeVisible({ timeout: 5000 });

  // 取得目前餘額（從卡片顯示）
  const balanceText = await firstCadet.locator("text=/⭐ \\d+ 星塵/").textContent();
  const currentBalance = balanceText ? parseInt(balanceText.match(/\d+/)?.[0] ?? "0") : 0;

  // 點擊 ⭐ 星塵 按鈕
  const coinsBtn = firstCadet.locator("button", { hasText: "⭐ 星塵" });
  await expect(coinsBtn).toBeVisible();
  await coinsBtn.click();

  // Modal 出現
  await expect(page.locator("text=調整星塵")).toBeVisible({ timeout: 3000 });
  await expect(page.locator(`text=目前餘額`)).toBeVisible();

  // 點選快速選擇 +5
  await page.locator("button", { hasText: "+5" }).first().click();

  // 確認自訂數值欄位也更新為 5
  const input = page.locator('input[type="number"]');
  await expect(input).toHaveValue("5");

  // 填寫原因（placeholder 是「例：額外獎勵、扣除罰款…」）
  const reasonInput = page.locator('input[maxlength="50"]');
  await reasonInput.fill("E2E 自動測試調整");

  // 確認調整按鈕可點擊
  const submitBtn = page.locator("button", { hasText: "確認調整" });
  await expect(submitBtn).not.toBeDisabled();
  await submitBtn.click();

  // 成功畫面：應顯示 +5 星塵 與新餘額
  await expect(page.locator("text=+5 星塵")).toBeVisible({ timeout: 8000 });
  await expect(page.locator("text=現有")).toBeVisible();

  // 驗證新餘額比舊餘額多 5（若能取得）
  const newBalanceText = await page.locator("text=/\\d+ 星塵/").last().textContent();
  if (newBalanceText && currentBalance > 0) {
    const newBalance = parseInt(newBalanceText.match(/\d+/)?.[0] ?? "0");
    expect(newBalance).toBe(currentBalance + 5);
  }

  // 關閉 modal
  await page.locator("button", { hasText: "完成" }).click();
  await expect(page.locator("text=調整星塵")).not.toBeVisible({ timeout: 3000 });
});

test("指揮官扣除星塵：負值快速選擇", async ({ page }) => {
  await loginAsCommander(page, "/commander/cadets");
  await expect(page.locator("h1", { hasText: "學員管理" })).toBeVisible({ timeout: 10000 });

  const coinsBtn = page.locator("button", { hasText: "⭐ 星塵" }).first();
  await coinsBtn.click();
  await expect(page.locator("text=調整星塵")).toBeVisible({ timeout: 3000 });

  // 點選 -5
  await page.locator("button", { hasText: "-5" }).first().click();
  const input = page.locator('input[type="number"]');
  await expect(input).toHaveValue("-5");

  // 提交
  await page.locator("button", { hasText: "確認調整" }).click();

  // 成功畫面：顯示 -5 星塵
  await expect(page.locator("text=-5 星塵")).toBeVisible({ timeout: 8000 });
  await page.locator("button", { hasText: "完成" }).click();
});

test("輸入 0 時確認按鈕應停用", async ({ page }) => {
  await loginAsCommander(page, "/commander/cadets");
  await expect(page.locator("h1", { hasText: "學員管理" })).toBeVisible({ timeout: 10000 });

  const coinsBtn = page.locator("button", { hasText: "⭐ 星塵" }).first();
  await coinsBtn.click();
  await expect(page.locator("text=調整星塵")).toBeVisible({ timeout: 3000 });

  // 預設值 0，按鈕應停用
  const submitBtn = page.locator("button", { hasText: "確認調整" });
  await expect(submitBtn).toBeDisabled();
});
