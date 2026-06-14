import { test, expect } from "@playwright/test";
import { BASE, loginAsCommander, loginAsCadet, getCommanderToken } from "./_auth";

const TITLE = `E2E通知_${Date.now()}`;
const CADET_TITLE = `E2E學員通知_${Date.now()}`;

// 寫入真實家庭 DB；每個測試後刪掉 type='test' 的測試通知（含指揮官與學員）。
// 用快取的 commander token（不依賴頁面 localStorage，cadet 頁也能清）。
async function cleanupTestNotifs(page: import("@playwright/test").Page) {
  const token = await getCommanderToken(page).catch(() => "");
  if (!token) return;
  await page.request.delete(`${BASE}/api/test/seed-notification`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

test.describe("站內通知中心", () => {
  test.afterEach(async ({ page }) => { await cleanupTestNotifs(page); });

  test("缺授權時通知 API 回 401", async ({ request }) => {
    expect((await request.get(`${BASE}/api/commander/notifications`)).status()).toBe(401);
    expect((await request.get(`${BASE}/api/cadet/notifications`)).status()).toBe(401);
  });

  test("指揮官：種通知 → 鈴鐺未讀徽章 → 通知頁顯示 → 全部已讀", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getCommanderToken(page);

    const seed = await page.request.post(`${BASE}/api/test/seed-notification`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { title: TITLE, body: "這是 E2E 測試通知內容" },
    });
    expect(seed.ok(), `seed 失敗: ${seed.status()}`).toBeTruthy();

    // 回首頁 → 鈴鐺未讀徽章
    await page.goto(`${BASE}/commander`);
    const bell = page.locator('a[aria-label="通知"]');
    await expect(bell).toBeVisible({ timeout: 10000 });
    await expect(bell.locator("span")).toBeVisible({ timeout: 8000 });

    // 通知頁顯示
    await page.goto(`${BASE}/commander/notifications`);
    await expect(page.locator("h1", { hasText: "通知" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${TITLE}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=這是 E2E 測試通知內容")).toBeVisible();

    // 全部已讀
    const markBtn = page.locator("button", { hasText: "全部標為已讀" });
    await expect(markBtn).toBeVisible();
    await markBtn.click();
    await expect(markBtn).toHaveCount(0, { timeout: 5000 });

    // 鈴鐺徽章消失
    await page.goto(`${BASE}/commander`);
    await expect(page.locator('a[aria-label="通知"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[aria-label="通知"] span')).toHaveCount(0, { timeout: 8000 });
  });

  test("指揮官：無未讀時不顯示全部已讀按鈕", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getCommanderToken(page);
    await page.request.delete(`${BASE}/api/test/seed-notification`, { headers: { Authorization: `Bearer ${token}` } });
    await page.request.patch(`${BASE}/api/commander/notifications`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" }, data: {},
    });

    await page.goto(`${BASE}/commander/notifications`);
    await expect(page.locator("h1", { hasText: "通知" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator("button", { hasText: "全部標為已讀" })).toHaveCount(0);
  });

  test("學員：種通知 → 鈴鐺未讀徽章 → 通知頁顯示 → 全部已讀", async ({ page }) => {
    const child = await loginAsCadet(page, "/cadet");
    const token = await getCommanderToken(page);

    const seed = await page.request.post(`${BASE}/api/test/seed-notification`, {
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      data: { title: CADET_TITLE, body: "學員測試通知內容", recipient: "cadet", childId: child.id },
    });
    expect(seed.ok(), `seed 失敗: ${seed.status()}`).toBeTruthy();

    // 學員首頁 → 鈴鐺未讀徽章
    await page.goto(`${BASE}/cadet`);
    const bell = page.locator('a[aria-label="通知"]');
    await expect(bell).toBeVisible({ timeout: 10000 });
    await expect(bell.locator("span")).toBeVisible({ timeout: 8000 });

    // 通知頁顯示
    await page.goto(`${BASE}/cadet/notifications`);
    await expect(page.locator("h1", { hasText: "通知" })).toBeVisible({ timeout: 10000 });
    await expect(page.locator(`text=${CADET_TITLE}`)).toBeVisible({ timeout: 8000 });
    await expect(page.locator("text=學員測試通知內容")).toBeVisible();

    // 全部已讀 → 徽章消失
    const markBtn = page.locator("button", { hasText: "全部已讀" });
    await expect(markBtn).toBeVisible();
    await markBtn.click();
    await page.goto(`${BASE}/cadet`);
    await expect(page.locator('a[aria-label="通知"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('a[aria-label="通知"] span')).toHaveCount(0, { timeout: 8000 });
  });
});
