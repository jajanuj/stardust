import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";

test.describe("學員登入 — KID- 前綴自動顯示", () => {
  test("前綴固定顯示，只輸入後 6 碼", async ({ page }) => {
    await page.goto(`${BASE}/login/cadet`);
    await expect(page.locator("h1", { hasText: "學員登入" })).toBeVisible({ timeout: 8000 });

    // 固定 KID- 前綴可見
    await expect(page.getByText("KID-", { exact: true })).toBeVisible();

    const input = page.locator('input[aria-label="KID 代碼後六碼"]');
    await input.fill("ABC123");
    await expect(input).toHaveValue("ABC123");
  });

  test("貼上完整代碼會自動去掉 KID- 前綴", async ({ page }) => {
    await page.goto(`${BASE}/login/cadet`);
    const input = page.locator('input[aria-label="KID 代碼後六碼"]');
    await input.fill("KID-XYZ789");
    await expect(input).toHaveValue("XYZ789");

    // 小寫也轉大寫
    await input.fill("kid-ab12cd");
    await expect(input).toHaveValue("AB12CD");
  });

  test("送出時自動補回 KID- 前綴", async ({ page }) => {
    await page.goto(`${BASE}/login/cadet`);
    const input = page.locator('input[aria-label="KID 代碼後六碼"]');
    await input.fill("XYZ789");

    const reqPromise = page.waitForRequest(
      (r) => r.url().includes("/api/kids/auth") && r.method() === "POST"
    );
    await page.locator("button", { hasText: "出發" }).click();
    const req = await reqPromise;
    const body = JSON.parse(req.postData() ?? "{}");
    expect(body.kidCode).toBe("KID-XYZ789");
  });
});
