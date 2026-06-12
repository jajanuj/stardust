import { test, expect } from "@playwright/test";

const BASE = "http://localhost:3001";

test("首頁有指揮官登入、學員登入、立即建立家庭連結", async ({ page }) => {
  await page.goto(BASE);
  await expect(page.getByText("指揮官登入")).toBeVisible();
  await expect(page.getByText("學員登入")).toBeVisible();
  await expect(page.getByText("立即建立家庭")).toBeVisible();
});

test("點擊立即建立家庭進入 signup 頁面，有步驟指示器與帳號表單", async ({ page }) => {
  await page.goto(BASE);
  await page.getByText("立即建立家庭").click();
  await expect(page).toHaveURL(`${BASE}/signup`);
  await expect(page.getByText("建立指揮官帳號")).toBeVisible();
  // 步驟指示器文字（exact）
  await expect(page.getByText("帳號", { exact: true })).toBeVisible();
  await expect(page.getByText("家庭", { exact: true })).toBeVisible();
  await expect(page.getByText("學員", { exact: true })).toBeVisible();
  await expect(page.getByText("完成", { exact: true })).toBeVisible();
});

test("密碼不一致顯示錯誤", async ({ page }) => {
  await page.goto(`${BASE}/signup`);
  await page.getByLabel("Email").fill("test@example.com");
  await page.getByLabel("密碼（至少 6 字元）").fill("123456");
  await page.getByLabel("確認密碼").fill("654321");
  await page.getByRole("button", { name: "下一步" }).click();
  await expect(page.getByText("兩次密碼不一致")).toBeVisible();
});

test("指揮官登入頁有返回連結", async ({ page }) => {
  await page.goto(`${BASE}/login/commander`);
  await expect(page.getByText("指揮官登入")).toBeVisible();
  await expect(page.getByRole("link", { name: "前往登入" })).not.toBeVisible();
});

test("signup 頁有前往登入連結", async ({ page }) => {
  await page.goto(`${BASE}/signup`);
  await expect(page.getByText("前往登入")).toBeVisible();
  await page.getByText("前往登入").click();
  await expect(page).toHaveURL(`${BASE}/login/commander`);
});
