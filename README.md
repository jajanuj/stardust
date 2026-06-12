# StarDuty 星際學院 🚀

親子任務獎勵系統 — 指揮官（家長）設定星際任務，學員（小孩）完成後賺取星塵，在商城兌換真實獎勵。

- 完整設計：[`docs/StarDuty-plan.md`](./docs/StarDuty-plan.md)（v0.5）
- 開發進度：[`docs/PROGRESS.md`](./docs/PROGRESS.md)（每次交付更新）

## 技術棧

Next.js 14（App Router）· Supabase（Auth / Postgres / Realtime / Storage）· Tailwind CSS · Vercel

## 本機開發

```bash
npm install
cp .env.local.example .env.local   # 填入 Supabase 與 VAPID 金鑰
npm run dev                         # http://localhost:3000
```

## Supabase 設定

於 Supabase SQL Editor 依序執行 `supabase/migrations/` 下的檔案：

1. `0001_schema.sql` — 建立所有資料表
2. `0002_functions.sql` — 積分原子交易 RPC（complete_task / redeem_reward / approve / reject / adjust）
3. `0003_rls.sql` — Row Level Security 與輔助函式

環境變數（見 `.env.local.example`）：

| 變數 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 前端 client |
| `SUPABASE_SERVICE_ROLE_KEY` | 僅 server，RPC 與敏感寫入 |
| `SUPABASE_JWT_SECRET` | 簽發 / 驗證學員自簽 JWT |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 推播 |

## 目前進度

進度集中於 [`docs/PROGRESS.md`](./docs/PROGRESS.md)（每次交付更新）。目前 Phase 0 基礎建設已完成。

## 目錄結構

```
app/
  page.tsx                登入入口
  login/commander         指揮官登入
  login/cadet             學員登入
  commander/              指揮官後台
  cadet/                  學員介面
  api/
    kids/auth             學員驗證 + 簽發 JWT
    tasks/complete        完成任務（RPC）
    rewards/redeem        兌換獎勵（RPC）
lib/
  supabase/client.ts      前端 client（含 setCadetSession）
  supabase/admin.ts       server service-role client
  auth/cadetJwt.ts        簽發學員 JWT
  auth/verifyCadet.ts     驗證學員 JWT
  errors.ts               RPC 錯誤對應
supabase/migrations/      SQL migration
```
