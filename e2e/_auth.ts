import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const BASE = "http://localhost:3000";
const COMMANDER_EMAIL = "jajanuj@gmail.com";
const STORAGE_KEY = "sb-ryamhxizzyjhvvowzawf-auth-token";

interface CommanderSession {
  access_token: string;
  token_type: string;
  expires_in: number;
  expires_at: number;
  refresh_token: string;
  user: Record<string, unknown>;
}

// 同一個 worker 內快取 commander session，避免每個測試都產生 magic link 被 Supabase 限流。
// access_token 效期 1 小時，遠長於整輪測試，故可安全重用。
let cachedSession: CommanderSession | null = null;

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

/**
 * 走 magic link 拿一份新的 commander session（解析 hash → 組 session 物件）。
 * Supabase 偶爾會因為短時間內重複產生 magic link 而回傳「無 token」的轉址，
 * 故重試數次（每次重新產生新 link）以消除此 flakiness。
 */
async function fetchCommanderSession(page: Page): Promise<CommanderSession> {
  let lastHash = "(none)";
  for (let attempt = 1; attempt <= 4; attempt++) {
    const link = await getCommanderMagicLink(page.request);
    await page.goto(link);
    await page.waitForURL(/localhost:3000/, { timeout: 15000 });

    const rawHash = page.url().split("#")[1] ?? "";
    const params = new URLSearchParams(rawHash);
    const accessToken = params.get("access_token") ?? "";
    if (accessToken) {
      const payloadBase64 = accessToken.split(".")[1] ?? "";
      const userPayload = JSON.parse(Buffer.from(payloadBase64, "base64url").toString());
      return {
        access_token: accessToken,
        token_type: "bearer",
        expires_in: parseInt(params.get("expires_in") ?? "3600"),
        expires_at: parseInt(params.get("expires_at") ?? "0"),
        refresh_token: params.get("refresh_token") ?? "",
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
    }
    lastHash = rawHash || "(empty)";
    await page.waitForTimeout(2000 * attempt); // backoff，等限流窗口
  }
  throw new Error(`magic link 連續取不到 access_token（最後 hash: ${lastHash}）`);
}

/** 取得（必要時產生並快取）commander session。 */
async function ensureCommanderSession(page: Page): Promise<CommanderSession> {
  const valid = cachedSession && cachedSession.expires_at * 1000 > Date.now() + 120_000;
  if (!valid) {
    cachedSession = await fetchCommanderSession(page);
  } else {
    // 快取命中：先導到本站根目錄，才能存取 localStorage
    await page.goto(`${BASE}/`);
  }
  return cachedSession!;
}

/** 登入指揮官並跳到目標頁面（session 快取 + localStorage 注入）。 */
export async function loginAsCommander(page: Page, targetPath = "/commander"): Promise<void> {
  const session = await ensureCommanderSession(page);
  await page.evaluate(
    ([key, value]) => { localStorage.setItem(key, JSON.stringify(value)); },
    [STORAGE_KEY, session] as [string, CommanderSession]
  );
  await page.goto(`${BASE}${targetPath}`);
}

/** 取得快取的 commander access_token（供測試直接呼叫 API / 清理用）。 */
export async function getCommanderToken(page: Page): Promise<string> {
  const session = await ensureCommanderSession(page);
  return session.access_token;
}

/** 從已登入頁面的 localStorage 取出 commander access_token。 */
export async function getAccessToken(page: Page): Promise<string> {
  const raw = await page.evaluate((k) => localStorage.getItem(k), STORAGE_KEY);
  if (!raw) return "";
  try {
    return (JSON.parse(raw) as { access_token?: string }).access_token ?? "";
  } catch {
    return "";
  }
}

export interface CadetInfo {
  id: string;
  name: string;
  avatar: string;
  coins: number;
}

/**
 * 登入學員並跳到目標頁面。
 * 先以 commander token 呼叫 dev 端點簽一張學員 JWT，再注入學員 localStorage session。
 */
export async function loginAsCadet(page: Page, targetPath = "/cadet"): Promise<CadetInfo> {
  const commanderToken = await getCommanderToken(page);
  const res = await page.request.post(`${BASE}/api/test/cadet-token`, {
    headers: { Authorization: `Bearer ${commanderToken}`, "Content-Type": "application/json" },
    data: {},
  });
  expect(res.ok(), `cadet-token 失敗: ${res.status()} ${await res.text()}`).toBeTruthy();
  const { token, child } = await res.json();
  expect(token, "沒有 cadet token").toBeTruthy();

  await page.goto(`${BASE}/`);
  await page.evaluate(
    ([t, info]) => {
      localStorage.setItem("sd_cadet_token", t as string);
      localStorage.setItem("sd_cadet_info", JSON.stringify(info));
    },
    [token, child] as [string, CadetInfo]
  );
  await page.goto(`${BASE}${targetPath}`);
  return child as CadetInfo;
}
