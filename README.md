# StarDuty 星際學院

親子任務獎勵系統 — 指揮官（家長）設定星際任務，學員（小孩）完成後賺取星塵，在商城兌換真實獎勵。

- 完整設計：[`docs/StarDuty-plan.md`](./docs/StarDuty-plan.md)（v0.5）
- 開發進度：[`docs/PROGRESS.md`](./docs/PROGRESS.md)（每次交付更新）

## 技術棧

Next.js 14（App Router）· Supabase（Auth / Postgres / Realtime / Storage）· Tailwind CSS · Vercel · Playwright（E2E）

## 功能總覽

### 指揮官（家長）
- **Onboarding**：四步驟建立家庭帳號與學員 KID 登入卡
- **學員管理**：新增/編輯/停用學員、重設 PIN、下載登入卡
- **任務管理**：一次性/每日/週期任務、審核開關、封存恢復、20 個內建模板、自訂常用任務（跨裝置 DB 同步）
- **待審核**：核可/駁回學員完成申請
- **獎勵設定**：新增/編輯/上下架獎勵（含計時型與庫存管理）
- **待兌現清單**：標記已兌現
- **留言板**：發送訊息給指定學員（可設過期時間）
- **排行榜**：全家星塵金銀銅牌排名
- **歷史紀錄**：全家流水帳、分類篩選
- **週/月統計報表**：每日趨勢圖、學員排行、4 項指標
- **資料匯出/備份**：JSON 完整備份 + CSV 流水帳
- **手動調整星塵**：快速 ±5/10/20/50 或自訂數值，附原因欄位

### 學員（小孩）
- **首頁**：星塵餘額、今日任務進度條
- **任務列表**：勾選完成、待審核狀態顯示
- **星塵商城**：分類篩選、餘額檢查、確認兌換
- **心願清單**：星塵進度條、達標提示
- **計時型獎勵**：圓形 SVG 倒數計時器
- **星塵流水帳**：完整收支紀錄
- **寵物成長**：5 階段進化、EXP 進度條
- **成就徽章**：8 種成就解鎖

### 系統
- PWA（離線快取、可安裝、Web Push 推播）
- 每日 Cron 自動結算（Vercel Cron）
- 全站 Row Level Security（Supabase RLS）
- 學員 KID 代碼登入（HS256 自簽 JWT）

## 本機開發

```bash
npm install
cp .env.local.example .env.local   # 填入 Supabase 與 VAPID 金鑰
npm run dev                         # http://localhost:3000
```

## Supabase 設定

於 Supabase SQL Editor 依序執行 `supabase/migrations/` 下的檔案：

1. `0001_schema.sql` — 建立所有資料表（18 張）
2. `0002_functions.sql` — 積分原子交易 RPC（complete_task / redeem_reward / approve / reject / adjust_coins）
3. `0003_rls.sql` — Row Level Security 與輔助函式
4. `0004_grants.sql` — 各角色資料表存取權限
5. `0005_ensure_rpc_grants.sql` — 確保 RPC 函式授權
6. `0006_custom_templates.sql` — 常用任務欄位擴充（task_templates）

環境變數（見 `.env.local.example`）：

| 變數 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 前端 client |
| `SUPABASE_SERVICE_ROLE_KEY` | 僅 server，admin client 使用 |
| `SUPABASE_JWT_SECRET` | 簽發 / 驗證學員自簽 JWT |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Web Push 推播 |
| `CRON_SECRET` | 每日結算 Cron 保護 |

## 頁面清單

### 指揮官 `/commander/*`
| 路由 | 說明 |
|------|------|
| `/commander` | 首頁（統計 + 快捷連結） |
| `/commander/cadets` | 學員管理 |
| `/commander/tasks` | 任務管理（含模板庫） |
| `/commander/approvals` | 待審核 |
| `/commander/rewards` | 獎勵設定 |
| `/commander/fulfill` | 待兌現清單 |
| `/commander/messages` | 留言板 |
| `/commander/history` | 歷史紀錄 |
| `/commander/leaderboard` | 星塵排行榜 |
| `/commander/stats` | 週/月統計報表 |

### 學員 `/cadet/*`
| 路由 | 說明 |
|------|------|
| `/cadet` | 首頁（餘額 + 進度條） |
| `/cadet/tasks` | 任務列表 |
| `/cadet/shop` | 星塵商城 |
| `/cadet/wishlist` | 心願清單 |
| `/cadet/timer` | 計時型獎勵倒數 |
| `/cadet/history` | 星塵流水帳 |
| `/cadet/pet` | 寵物成長 |
| `/cadet/achievements` | 成就徽章 |

### 公共
| 路由 | 說明 |
|------|------|
| `/` | 登入入口 |
| `/signup` | 指揮官 Onboarding（四步驟） |
| `/login/commander` | 指揮官登入 |
| `/login/cadet` | 學員 KID 代碼登入 |

## 目錄結構

```
app/
  page.tsx                    登入入口
  signup/                     Onboarding 四步驟
  login/commander             指揮官登入
  login/cadet                 學員 KID 登入
  commander/                  指揮官後台（10 頁）
  cadet/                      學員介面（8 頁）
  api/
    kids/auth                 學員登入 + 自簽 JWT
    onboarding                建立家庭與學員
    cadets/[id]               學員 CRUD
    tasks/[id]                任務 CRUD + complete + daily-reset
    approvals/                approve / reject RPC
    rewards/[id]              獎勵 CRUD + redeem + fulfill + timer
    wishlist/toggle           心願清單切換
    messages                  留言板
    children/adjust-coins     手動調整星塵 RPC
    push/subscribe            Web Push 訂閱管理
    export                    資料匯出（JSON/CSV）
    commander/                指揮官端資料 API（admin client）
    cadet/                    學員端資料 API（admin client）
lib/
  supabase/client.ts          前端 client
  supabase/admin.ts           server service-role client
  auth/cadetJwt.ts            簽發學員 JWT
  auth/verifyCadet.ts         驗證學員 JWT
  cadetSession.ts             學員 session localStorage 管理
  errors.ts                   RPC 錯誤對應
supabase/migrations/          SQL migration（0001–0006）
e2e/                          Playwright E2E 測試（62 個，全通過）
public/
  manifest.json               PWA manifest
  sw.js                       Service Worker（離線 + Push）
  icon.svg                    PWA 圖示
```

## E2E 測試

```bash
npx playwright test           # 執行全部 62 個測試
```

測試覆蓋：Onboarding、學員管理、任務管理、審核流程、商城兌換、Phase 2–4 所有功能、星塵調整、自訂常用任務。

## 上線前檢查

1. Supabase SQL Editor 依序執行 `0001`–`0006` migration
2. Vercel 環境變數設定（7 個金鑰）
3. 生成 VAPID 金鑰：`npx web-push generate-vapid-keys`
4. 上傳 PWA 圖示（`/public/icon-192.png`、`/public/icon-512.png`）
5. 自訂網域 `starduty.app` DNS 設定
