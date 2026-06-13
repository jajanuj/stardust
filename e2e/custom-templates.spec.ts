import { test, expect } from "@playwright/test";
import { BASE, loginAsCommander, getAccessToken } from "./_auth";

const UNIQUE_TITLE = `E2E常用任務_${Date.now()}`;

test.describe("常用任務（自訂模板）", () => {
  // 此功能寫入真實家庭 DB，每個測試後清掉所有 E2E 前綴的常用任務，避免污染正式資料
  test.afterEach(async ({ page }) => {
    const token = await getAccessToken(page);
    if (!token) return;
    const res = await page.request.get(`${BASE}/api/commander/templates`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok()) return;
    const { templates } = await res.json();
    for (const t of templates ?? []) {
      if (typeof t.title === "string" && t.title.startsWith("E2E")) {
        await page.request.delete(`${BASE}/api/commander/templates/${t.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    }
  });

  test("完整流程：建內建模板 → 改內容 → 存常用 → 重開帶入 → 刪除", async ({ page }) => {
    await loginAsCommander(page, "/commander/tasks");
    await expect(page.locator("h1", { hasText: "任務管理" })).toBeVisible({ timeout: 10000 });

    // 開啟模板庫
    await page.locator("button", { hasText: "📋 模板" }).click();
    await expect(page.locator("text=任務模板庫")).toBeVisible({ timeout: 5000 });

    // 一開始沒有常用任務區塊
    await expect(page.locator("text=⭐ 常用任務")).toHaveCount(0);

    // 點第一個內建模板（居家整潔 → 整理床舖）
    await page.locator("button", { hasText: "整理床舖" }).first().click();

    // 表單開啟並預填
    await expect(page.locator("h2", { hasText: "新增任務" })).toBeVisible({ timeout: 5000 });
    const titleInput = page.locator('label:has-text("任務名稱") input');
    await expect(titleInput).toHaveValue("整理床舖");

    // 修改內容
    await titleInput.fill(UNIQUE_TITLE);
    const descInput = page.locator('label:has-text("說明") textarea');
    await descInput.fill("這是 E2E 測試自訂說明");

    // 存為常用任務
    const saveTplBtn = page.locator("button", { hasText: "存為常用任務" });
    await expect(saveTplBtn).toBeVisible();
    await saveTplBtn.click();
    await expect(page.locator("button", { hasText: "已加入常用任務" })).toBeVisible({ timeout: 3000 });

    // 關閉表單（不建立任務）
    await page.locator("button", { hasText: "取消" }).click();
    await expect(page.locator("h2", { hasText: "新增任務" })).not.toBeVisible({ timeout: 3000 });

    // 重新開啟模板庫 → 應看到常用任務區塊 + 我們的自訂模板
    await page.locator("button", { hasText: "📋 模板" }).click();
    await expect(page.locator("text=⭐ 常用任務")).toBeVisible({ timeout: 5000 });
    await expect(page.locator(`text=${UNIQUE_TITLE}`)).toBeVisible();

    // 點選常用任務 → 表單帶入修改後內容
    await page.locator(`text=${UNIQUE_TITLE}`).click();
    await expect(page.locator("h2", { hasText: "新增任務" })).toBeVisible({ timeout: 5000 });
    await expect(page.locator('label:has-text("任務名稱") input')).toHaveValue(UNIQUE_TITLE);
    await expect(page.locator('label:has-text("說明") textarea')).toHaveValue("這是 E2E 測試自訂說明");

    // 關閉表單，回模板庫刪除常用任務
    await page.locator("button", { hasText: "取消" }).click();
    await page.locator("button", { hasText: "📋 模板" }).click();
    await expect(page.locator(`text=${UNIQUE_TITLE}`)).toBeVisible({ timeout: 5000 });
    await page.locator('button[aria-label="刪除常用任務"]').first().click();

    // 刪除後常用任務消失
    await expect(page.locator(`text=${UNIQUE_TITLE}`)).toHaveCount(0);
    await expect(page.locator("text=⭐ 常用任務")).toHaveCount(0);
  });

  test("常用任務在頁面重新整理後仍存在", async ({ page }) => {
    await loginAsCommander(page, "/commander/tasks");
    await expect(page.locator("h1", { hasText: "任務管理" })).toBeVisible({ timeout: 10000 });

    const title = `E2E持久化_${Date.now()}`;

    // 透過模板存一個常用任務
    await page.locator("button", { hasText: "📋 模板" }).click();
    await page.locator("button", { hasText: "整理床舖" }).first().click();
    await expect(page.locator("h2", { hasText: "新增任務" })).toBeVisible({ timeout: 5000 });
    await page.locator('label:has-text("任務名稱") input').fill(title);
    await page.locator("button", { hasText: "存為常用任務" }).click();
    await expect(page.locator("button", { hasText: "已加入常用任務" })).toBeVisible({ timeout: 3000 });
    await page.locator("button", { hasText: "取消" }).click();

    // 重新整理頁面
    await page.reload();
    await expect(page.locator("h1", { hasText: "任務管理" })).toBeVisible({ timeout: 10000 });

    // 重開模板庫，常用任務仍在
    await page.locator("button", { hasText: "📋 模板" }).click();
    await expect(page.locator(`text=${title}`)).toBeVisible({ timeout: 5000 });

    // 清理
    await page.locator('button[aria-label="刪除常用任務"]').first().click();
  });

  test("空白名稱時存為常用任務會擋下並提示", async ({ page }) => {
    await loginAsCommander(page, "/commander/tasks");
    await expect(page.locator("h1", { hasText: "任務管理" })).toBeVisible({ timeout: 10000 });

    // 直接新增（空表單）
    await page.locator("button", { hasText: "+ 新增" }).click();
    await expect(page.locator("h2", { hasText: "新增任務" })).toBeVisible({ timeout: 5000 });

    // 名稱留空，按存為常用任務 → 應出現提示、且不顯示成功
    await page.locator("button", { hasText: "存為常用任務" }).click();
    await expect(page.locator("text=請先輸入任務名稱")).toBeVisible({ timeout: 3000 });
    await expect(page.locator("button", { hasText: "已加入常用任務" })).toHaveCount(0);
  });
});
