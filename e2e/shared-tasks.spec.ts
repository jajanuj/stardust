import { test, expect } from "@playwright/test";
import { BASE, loginAsCommander, getCommanderToken } from "./_auth";

// 搶單制：一份共用任務，先完成先得，只發一次。
// 用兩位學員 token 對同一搶單任務並發完成，驗證只有一人成功。
test.describe("搶單制共用任務", () => {
  let createdTaskId = "";
  let claimerChildId = "";
  let claimReward = 0;

  test.afterEach(async ({ page }) => {
    // 刪測試任務（cascade 完成紀錄）+ 還原搶到者星塵
    if (createdTaskId) {
      await page.request.delete(`${BASE}/api/tasks/${createdTaskId}`).catch(() => {});
      createdTaskId = "";
    }
    if (claimerChildId && claimReward) {
      await page.request.post(`${BASE}/api/children/adjust-coins`, {
        headers: { "Content-Type": "application/json" },
        data: { childId: claimerChildId, delta: -claimReward, reason: "e2e cleanup" },
      }).catch(() => {});
      claimerChildId = "";
      claimReward = 0;
    }
  });

  test("兩位學員搶同一任務，只有一人成功（先搶先得）", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getCommanderToken(page);

    // 家庭資訊 + 學員清單
    const ctx = await page.request.get(`${BASE}/api/commander/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(ctx.ok()).toBeTruthy();
    const { familyId, userId, cadets } = await ctx.json();
    test.skip((cadets?.length ?? 0) < 2, "家庭需至少 2 位學員才能測搶單");
    const [a, b] = cadets;

    // 建立搶單任務
    claimReward = 3;
    const create = await page.request.post(`${BASE}/api/tasks`, {
      headers: { "Content-Type": "application/json" },
      data: {
        familyId, createdBy: userId, title: `E2E搶單_${Date.now()}`,
        taskType: "daily", coinsReward: claimReward, assignedTo: null, isShared: true,
      },
    });
    expect(create.ok(), `建任務失敗: ${create.status()} ${await create.text()}`).toBeTruthy();
    const { task } = await create.json();
    createdTaskId = task.id;
    expect(task.is_shared, "任務應為搶單").toBe(true);

    // 兩位學員 token
    async function cadetToken(childId: string) {
      const r = await page.request.post(`${BASE}/api/test/cadet-token`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { childId },
      });
      expect(r.ok(), `cadet-token 失敗: ${r.status()}`).toBeTruthy();
      return (await r.json()).token as string;
    }
    const tokenA = await cadetToken(a.id);
    const tokenB = await cadetToken(b.id);

    // A 先搶 → 成功、即時入帳
    const ra = await page.request.post(`${BASE}/api/tasks/complete`, {
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" },
      data: { taskId: task.id },
    });
    expect(ra.ok(), `A 完成失敗: ${ra.status()} ${await ra.text()}`).toBeTruthy();
    const aBody = await ra.json();
    expect(aBody.status).toBe("approved");
    expect(aBody.shared).toBe(true);
    claimerChildId = a.id;

    // B 再搶 → 被擋（already_claimed）
    const rb = await page.request.post(`${BASE}/api/tasks/complete`, {
      headers: { Authorization: `Bearer ${tokenB}`, "Content-Type": "application/json" },
      data: { taskId: task.id },
    });
    expect(rb.ok(), "B 不應成功").toBeFalsy();
    const bBody = await rb.json();
    const hit = bBody.error?.includes("already_claimed") || bBody.message?.includes("被搶走") || bBody.message?.includes("already_claimed");
    expect(hit, `B 應收到 already_claimed，實得: ${JSON.stringify(bBody)}`).toBeTruthy();
  });

  test("一般（非搶單）任務：兩位學員都能各自完成", async ({ page }) => {
    await loginAsCommander(page, "/commander");
    const token = await getCommanderToken(page);

    const ctx = await page.request.get(`${BASE}/api/commander/tasks`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { familyId, userId, cadets } = await ctx.json();
    test.skip((cadets?.length ?? 0) < 2, "家庭需至少 2 位學員");
    const [a, b] = cadets;

    claimReward = 2;
    const create = await page.request.post(`${BASE}/api/tasks`, {
      headers: { "Content-Type": "application/json" },
      data: {
        familyId, createdBy: userId, title: `E2E一般_${Date.now()}`,
        taskType: "daily", coinsReward: claimReward, assignedTo: null, isShared: false,
      },
    });
    const { task } = await create.json();
    createdTaskId = task.id;

    async function cadetToken(childId: string) {
      const r = await page.request.post(`${BASE}/api/test/cadet-token`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        data: { childId },
      });
      return (await r.json()).token as string;
    }
    const tokenA = await cadetToken(a.id);
    const tokenB = await cadetToken(b.id);

    const ra = await page.request.post(`${BASE}/api/tasks/complete`, {
      headers: { Authorization: `Bearer ${tokenA}`, "Content-Type": "application/json" }, data: { taskId: task.id },
    });
    const rb = await page.request.post(`${BASE}/api/tasks/complete`, {
      headers: { Authorization: `Bearer ${tokenB}`, "Content-Type": "application/json" }, data: { taskId: task.id },
    });
    // 兩人都成功（各做一份）
    expect(ra.ok() && rb.ok(), "一般任務兩人都應成功").toBeTruthy();

    // 還原兩人星塵
    for (const id of [a.id, b.id]) {
      await page.request.post(`${BASE}/api/children/adjust-coins`, {
        headers: { "Content-Type": "application/json" },
        data: { childId: id, delta: -claimReward, reason: "e2e cleanup" },
      }).catch(() => {});
    }
    claimerChildId = ""; claimReward = 0;
  });
});
