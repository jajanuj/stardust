import { test, expect } from "@playwright/test";
import { BASE, loginAsCommander, getCommanderToken } from "./_auth";

// 多指揮官邀請碼：產生 → 第二位家長加入 → 出現在指揮官清單。
// 用 dev /api/test/temp-user 建/刪拋棄式帳號，afterEach 清乾淨。
test.describe("家庭邀請碼（多指揮官）", () => {
  let tempUserId = "";

  test.afterEach(async ({ page }) => {
    if (tempUserId) {
      await page.request.delete(`${BASE}/api/test/temp-user`, {
        headers: { "Content-Type": "application/json" }, data: { userId: tempUserId },
      }).catch(() => {});
      tempUserId = "";
    }
    const token = await getCommanderToken(page).catch(() => "");
    if (token) {
      await page.request.delete(`${BASE}/api/commander/family`, {
        headers: { Authorization: `Bearer ${token}` },
      }).catch(() => {});
    }
  });

  test("缺授權時 API 回 401", async ({ request }) => {
    expect((await request.get(`${BASE}/api/commander/family`)).status()).toBe(401);
  });

  test("產生邀請碼並可取得顯示", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getCommanderToken(page);

    const gen = await page.request.post(`${BASE}/api/commander/family`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(gen.ok(), `產生失敗: ${gen.status()} ${await gen.text()}`).toBeTruthy();
    const { inviteCode } = await gen.json();
    expect(inviteCode).toMatch(/^[A-Z0-9]{8}$/);

    const get = await page.request.get(`${BASE}/api/commander/family`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await get.json();
    expect(body.inviteCode).toBe(inviteCode);
    expect(body.commanders.length).toBeGreaterThanOrEqual(1);
    expect(body.commanders.some((c: { isMe: boolean }) => c.isMe)).toBeTruthy();
  });

  test("第二位家長用邀請碼加入家庭", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getCommanderToken(page);
    const { inviteCode } = await (await page.request.post(`${BASE}/api/commander/family`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();

    // 建立拋棄式第二位家長帳號
    const tu = await page.request.post(`${BASE}/api/test/temp-user`);
    expect(tu.ok(), `建臨時帳號失敗: ${tu.status()} ${await tu.text()}`).toBeTruthy();
    tempUserId = (await tu.json()).userId;

    // 用邀請碼加入
    const join = await page.request.post(`${BASE}/api/family/join`, {
      headers: { "Content-Type": "application/json" },
      data: { userId: tempUserId, code: inviteCode },
    });
    expect(join.ok(), `加入失敗: ${join.status()} ${await join.text()}`).toBeTruthy();

    // 指揮官清單應包含新帳號
    const after = await (await page.request.get(`${BASE}/api/commander/family`, {
      headers: { Authorization: `Bearer ${token}` },
    })).json();
    expect(after.commanders.some((c: { userId: string }) => c.userId === tempUserId)).toBeTruthy();
  });

  test("無效邀請碼被拒（400）", async ({ request }) => {
    const join = await request.post(`${BASE}/api/family/join`, {
      headers: { "Content-Type": "application/json" },
      data: { userId: "00000000-0000-0000-0000-000000000000", code: "ZZZZZZZZ" },
    });
    expect(join.status()).toBe(400);
  });
});
