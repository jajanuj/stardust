import { test, expect, Page } from "@playwright/test";

// 完成任務「星塵飛入」動畫（計畫 §5.2）
// 只驗證前端行為：以 page.route 攔截學員 API 回傳固定資料，不依賴、也不寫入 Supabase。

const BASE = "http://localhost:3001";
const CHILD = { id: "child-e2e", name: "小測", avatar: "🚀", coins: 10 };

function task(id: string, title: string, reward: number, requireApproval = false) {
  return {
    id, title, description: null, icon: "🧹", coins_reward: reward,
    task_type: "daily", recur_days: null, require_approval: requireApproval,
    is_shared: false, status: "active", task_completions: [],
  };
}

async function setup(page: Page, completeStatus: "approved" | "pending") {
  let completed = false;
  const tasks = [task("t-fly", "掃地", 5, completeStatus === "pending")];

  await page.route("**/api/cadet/notifications**", (r) =>
    r.fulfill({ json: { notifications: [], unread: 0 } }));
  await page.route("**/api/cadet/tasks", (r) =>
    r.fulfill({
      json: {
        coins: completed && completeStatus === "approved" ? 15 : 10,
        tasks: completed
          ? tasks.map((t) => ({
              ...t,
              task_completions: [{
                id: "c1", status: completeStatus, child_id: CHILD.id,
                completion_date: new Date().toLocaleDateString("sv-SE"),
              }],
            }))
          : tasks,
      },
    }));
  await page.route("**/api/tasks/complete", async (r) => {
    completed = true;
    await r.fulfill({
      json: completeStatus === "approved" ? { status: "approved", balance: 15 } : { status: "pending", balance: 10 },
    });
  });

  await page.goto(`${BASE}/`);
  await page.evaluate((info) => {
    localStorage.setItem("sd_cadet_token", "e2e-fake-token");
    localStorage.setItem("sd_cadet_info", JSON.stringify(info));
  }, CHILD);
  await page.goto(`${BASE}/cadet/tasks`);
  await expect(page.getByText("掃地")).toBeVisible();
  await expect(page.getByTestId("coin-balance")).toContainText("10");
}

test("完成任務：星塵從按鈕飛入餘額徽章，抵達後餘額更新並浮出 +N", async ({ page }) => {
  await setup(page, "approved");

  await page.locator("button", { hasText: "✓" }).click();

  // 動畫進行中：星塵粒子出現，餘額尚未跳動到新值
  const particles = page.getByTestId("stardust-particle");
  await expect(particles.first()).toBeAttached();
  expect(await particles.count()).toBeGreaterThanOrEqual(3);
  await expect(page.getByTestId("coin-balance")).toContainText("10");

  // 抵達後：粒子圖層移除、+5 浮出、餘額更新為 15
  await expect(page.getByTestId("stardust-plus")).toHaveText("+5");
  await expect(page.getByTestId("stardust-fly")).toHaveCount(0);
  await expect(page.getByTestId("coin-balance")).toContainText("15");
  await expect(page.getByText("今日已完成 (1)")).toBeVisible();
});

test("需審核任務：不播放星塵動畫，餘額不變", async ({ page }) => {
  await setup(page, "pending");

  await page.locator("button", { hasText: "✓" }).click();
  await expect(page.getByText("已回報！等待指揮官審核中")).toBeVisible();
  await expect(page.getByText("今日已完成 (1)")).toBeVisible();
  await expect(page.getByTestId("stardust-particle")).toHaveCount(0);
  await expect(page.getByTestId("coin-balance")).toContainText("10");
});

test.describe("減少動態效果", () => {
  test.use({ contextOptions: { reducedMotion: "reduce" } });

  test("偏好減少動態時跳過動畫，餘額直接更新", async ({ page }) => {
    await setup(page, "approved");

    await page.locator("button", { hasText: "✓" }).click();
    await expect(page.getByTestId("coin-balance")).toContainText("15");
    await expect(page.getByTestId("stardust-particle")).toHaveCount(0);
  });
});
