import { test, expect } from "@playwright/test";
import { BASE, loginAsCommander, getAccessToken } from "./_auth";

const TITLE = `E2E通知_${Date.now()}`;

test.describe("站內通知中心（指揮官）", () => {
  // 寫入真實家庭 DB；每個測試後刪掉 type='test' 的測試通知
  test.afterEach(async ({ page }) => {
    // 未導航到本站的測試（page 在 about:blank）讀 localStorage 會丟錯，直接略過
    if (!page.url().includes("localhost:3000")) return;
    const token = await getAccessToken(page).catch(() => "");
    if (!token) return;
    await page.request.delete(`${BASE}/api/test/seed-notification`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  });

  test("缺授權時通知 API 回 401", async ({ request }) => {
    const res = await request.get(`${BASE}/api/commander/notifications`);
    expect(res.status()).toBe(401);
  });

  test("種一筆通知 → 鈴鐺未讀紅點 → 通知頁顯示 → 全部已讀", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getAccessToken(page);
    expect(token).toBeTruthy();

    // 種一筆通知
    const seed = await page.request.post(`${BASE}/api/test/seed-notification`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { title: TITLE, body: "這是 E2E 測試通知內容" },
    });
    expect(seed.ok(), `seed 失敗: ${seed.status()}`).toBeTruthy();

    // 回首頁 → header 鈴鐺應出現未讀數字徽章
    await page.goto(`${BASE}/commander`);
    const bell = page.locator('a[aria-label="通知"]');
    await expect(bell).toBeVisible({ timeout: 10000 });
    await expect(bell.locator("span")).toBeVisible({ timeout: 8000 }); // 未讀徽章

    // 進通知頁 → 看到該通知與內容
    await page.goto(`${BASE}/commander/notifications`);
    await expect(page.locator("h1", { hasText: "通知" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${TITLE}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=這是 E2E 測試通知內容")).toBeVisible();

    // 全部標為已讀 → 按鈕消失、改顯示「全部已讀」
    const markBtn = page.locator("button", { hasText: "全部標為已讀" });
    await expect(markBtn).toBeVisible();
    await markBtn.click();
    await expect(page.locator("text=全部已讀")).toBeVisible({ timeout: 5000 });
    await expect(markBtn).toHaveCount(0);

    // 回首頁 → 鈴鐺徽章應消失（未讀 0）
    await page.goto(`${BASE}/commander`);
    await expect(page.locator('a[aria-label="通知"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[aria-label="通知"] span')).toHaveCount(0, { timeout: 8000 });
  });

  test("無通知時通知頁顯示空狀態", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getAccessToken(page);
    // 先清掉測試通知，確保乾淨
    await page.request.delete(`${BASE}/api/test/seed-notification`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    // 全部標為已讀（避免既有真實通知干擾未讀徽章判斷）
    await page.request.patch(`${BASE}/api/commander/notifications`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: {},
    });

    await page.goto(`${BASE}/commander/notifications`);
    await expect(page.locator("h1", { hasText: "通知" })).toBeVisible({ timeout: 10000 });
    // 沒有未讀 → 不顯示「全部標為已讀」按鈕
    await expect(page.locator("button", { hasText: "全部標為已讀" })).toHaveCount(0);
  });
});
