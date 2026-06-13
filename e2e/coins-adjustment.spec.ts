import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3000";
const COMMANDER_EMAIL = "jajanuj@gmail.com";

/**
 * 透過 Next.js server-side API route 取得 magic link。
 * 由 Node.js server 呼叫 Supabase admin API，避免 Supabase 的 browser 環境封鎖。
 */
async function getCommanderMagicLink(request: import("@playwright/test").APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/api/test/auth-link`, {
    headers: { "Content-Type": "application/json" },
    data: { email: COMMANDER_EMAIL },
  });
  expect(res.ok(), `auth-link 失敗: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  expect(body.action_link, "沒有 action_link").toBeTruthy();
  return body.action_link as string;
}

const STORAGE_KEY = "sb-ryamhxizzyjhvvowzawf-auth-token";

/** 登入指揮官並跳到目標頁面 */
async function loginAsCommander(page: import("@playwright/test").Page, targetPath = "/commander/cadets") {
  const link = await getCommanderMagicLink(page.request);
  // Supabase verify → redirect 到 localhost:3000/#access_token=...（root page，無 Supabase client）
  await page.goto(link);
  await page.waitForURL(/localhost:3000/, { timeout: 15000 });

  // 從 URL hash 解析 token
  const rawHash = page.url().split("#")[1] ?? "";
  const params = new URLSearchParams(rawHash);
  const accessToken = params.get("access_token") ?? "";
  const refreshToken = params.get("refresh_token") ?? "";
  const expiresAt = parseInt(params.get("expires_at") ?? "0");
  const expiresIn = parseInt(params.get("expires_in") ?? "3600");

  expect(accessToken, "magic link 沒有 access_token").toBeTruthy();

  // 解碼 JWT payload 取 user 資訊
  const payloadBase64 = accessToken.split(".")[1] ?? "";
  const userPayload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());

  // 建立完整 session 物件，直接寫入 localStorage
  const session = {
    access_token: accessToken,
    token_type: "bearer",
    expires_in: expiresIn,
    expires_at: expiresAt,
    refresh_token: refreshToken,
    user: {
      id: userPayload.sub,
      aud: userPayload.aud,
      role: userPayload.role,
      email: userPayload.email,
      email_confirmed_at: userPayload.email_confirmed_at,
      phone: userPayload.phone ?? "",
      confirmed_at: userPayload.confirmed_at,
      app_metadata: userPayload.app_metadata ?? {},
      user_metadata: userPayload.user_metadata ?? {},
    },
  };

  await page.evaluate(
    ([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); },
    [STORAGE_KEY, session] as [string, typeof session]
  );

  // 前往目標頁（Supabase client 從 localStorage 讀取 session）
  await page.goto(`${BASE}${targetPath}`);
}

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
