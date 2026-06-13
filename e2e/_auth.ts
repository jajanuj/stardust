import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const BASE = "http://localhost:3000";
const COMMANDER_EMAIL = "jajanuj@gmail.com";
const STORAGE_KEY = "sb-ryamhxizzyjhvvowzawf-auth-token";

/**
 * 透過 Next.js server-side API route 取得 magic link。
 * 由 Node.js server 呼叫 Supabase admin API，避免 Supabase 的 browser 環境封鎖。
 */
async function getCommanderMagicLink(request: APIRequestContext): Promise<string> {
  const res = await request.post(`${BASE}/api/test/auth-link`, {
    headers: { "Content-Type": "application/json" },
    data: { email: COMMANDER_EMAIL },
  });
  expect(res.ok(), `auth-link 失敗: ${res.status()} ${await res.text()}`).toBeTruthy();
  const body = await res.json();
  expect(body.action_link, "沒有 action_link").toBeTruthy();
  return body.action_link as string;
}

/** 登入指揮官並跳到目標頁面（magic link + localStorage session 注入） */
export async function loginAsCommander(page: Page, targetPath = "/commander"): Promise<void> {
  const link = await getCommanderMagicLink(page.request);
  await page.goto(link);
  await page.waitForURL(/localhost:3000/, { timeout: 15000 });

  const rawHash = page.url().split("#")[1] ?? "";
  const params = new URLSearchParams(rawHash);
  const accessToken = params.get("access_token") ?? "";
  const refreshToken = params.get("refresh_token") ?? "";
  const expiresAt = parseInt(params.get("expires_at") ?? "0");
  const expiresIn = parseInt(params.get("expires_in") ?? "3600");

  expect(accessToken, "magic link 沒有 access_token").toBeTruthy();

  const payloadBase64 = accessToken.split(".")[1] ?? "";
  const userPayload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());

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

  await page.goto(`${BASE}${targetPath}`);
}

/** 從已登入頁面的 localStorage 取出 access_token（供 afterEach 清理用） */
export async function getAccessToken(page: Page): Promise<string> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  if (!raw) return "";
  try {
    return (JSON.parse(raw) as { access_token?: string }).access_token ?? "";
  } catch {
    return "";
  }
}
