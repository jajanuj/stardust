# StarDuty 星際學院 — 專案進度

> 這是進度的單一真相來源(single source of truth)。每次交付一段功能/頁面/修正後固定更新此檔。
> 設計細節見 [`StarDuty-plan.md`](./StarDuty-plan.md)。

**最後更新：2026-06-13**
**計畫版次：v0.5**

---

## 進度總覽

| 階段 | 範圍 | 狀態 |
|------|------|------|
| Phase 0 | 基礎建設（骨架、DB、驗證、核心 API） | ✅ 完成 |
| 環境設定 | 金鑰填寫、本機建置、跑 migration | 🔄 進行中 |
| Phase 1 | MVP 核心（Onboarding、學員/任務管理、任務列表、待審核、Cron） | ✅ 完成 |
| Phase 2 | 商城與獎勵（商城、兌換、待兌現、心願清單、計時器、流水帳） | ✅ 完成 |
| Phase 3 | 遊戲化與體驗優化（寵物、成就、留言、PWA） | ✅ 完成 |
| Phase 4 | 進階功能（Push 訂閱、星塵調整、排行榜、歷史、模板庫、統計、匯出） | ✅ 完成 |

圖例：✅ 完成 ・ 🔄 進行中 ・ ⏳ 未開始 ・ ⛔ 受阻

---

## Phase 0 — 基礎建設 ✅

- [x] 專案骨架與設定檔（package.json、tsconfig、next.config、tailwind、postcss、.gitignore）
- [x] 星際深色主題基礎（globals.css、layout、登入入口頁）
- [x] 資料庫 schema migration（`supabase/migrations/0001_schema.sql`，18 張表）
- [x] 積分原子交易 RPC（`0002_functions.sql`：complete_task / redeem_reward / approve / reject / adjust_coins）
- [x] Row Level Security 與輔助函式（`0003_rls.sql`）
- [x] 學員 KID 代碼登入 + 自簽 JWT + 登入鎖定（`/api/kids/auth`）
- [x] 指揮官 Email 登入（Supabase Auth）
- [x] 完成任務 API（`/api/tasks/complete` → RPC）
- [x] 兌換獎勵 API（`/api/rewards/redeem` → RPC）
- [x] Supabase client / admin、JWT 簽發與驗證、RPC 錯誤對應

---

## 環境設定 🔄

- [x] `.env.local` 建立
- [x] `npm install`（本機）
- [ ] 三把金鑰確認填妥：`NEXT_PUBLIC_SUPABASE_ANON_KEY`、`SUPABASE_SERVICE_ROLE_KEY`、`SUPABASE_JWT_SECRET`
- [ ] Supabase SQL Editor 依序執行 `0001` → `0002` → `0003`
- [ ] `npm run dev` 本機驗證登入流程

> 驗證機制決議：採方案 A（學員自簽 HS256 JWT + RLS）。**切勿 revoke Legacy JWT Secret**，否則學員登入失效。

---

## Phase 1 — MVP 核心 ✅

- [x] Onboarding：`/signup` 四步驟流程（帳號→家庭→學員→KID登入卡）+ `/api/onboarding`
- [x] 指揮官共用 Layout（底部導航：首頁/學員/任務/待審核/獎勵/待兌現/留言）
- [x] 指揮官首頁：統計卡片 + 快捷連結
- [x] 指揮官：學員管理（`/commander/cadets`：新增/編輯/停用/重設PIN/登入卡）
- [x] 指揮官：任務管理（`/commander/tasks`：一次性/每日/週期、審核開關、封存恢復）
- [x] 學員共用 Layout（底部導航：首頁/任務/商城/寵物/歷程）
- [x] 學員首頁（`/cadet`：星塵餘額、今日進度條）
- [x] 學員：任務列表（`/cadet/tasks`：completion_date 判定、勾選完成、toast）
- [x] 指揮官：待審核頁（`/commander/approvals`：核可/駁回 RPC）
- [x] 每日結算 Cron（`/api/tasks/daily-reset`：CRON_SECRET 保護、統計、通知）
- [x] API：`/api/cadets`、`/api/tasks`、`/api/approvals/approve|reject`

---

## Phase 2 — 商城與獎勵 ✅

- [x] 指揮官：獎勵設定（`/commander/rewards`：新增/編輯/上下架、計時型、庫存）
- [x] 指揮官：待兌現清單（`/commander/fulfill`：標記已兌現）
- [x] 學員：星塵商城（`/cadet/shop`：分類篩選、餘額檢查、確認兌換、成功畫面）
- [x] 學員：心願清單（`/cadet/wishlist`：進度條、達標提示）
- [x] 學員：星塵流水帳（`/cadet/history`）
- [x] 學員：計時型獎勵倒數（`/cadet/timer`：圓形 SVG 進度條）
- [x] API：`/api/rewards` POST/PATCH、`/fulfill`、`/timer/start|end`、`/api/wishlist/toggle`

---

## Phase 3 — 遊戲化與體驗優化 ✅

- [x] 學員：寵物成長頁（`/cadet/pet`：5 階段進化、EXP 進度條）
- [x] 學員：成就徽章頁（`/cadet/achievements`：8 成就定義）
- [x] 學員：計時器（圓形動畫倒數）
- [x] 指揮官：留言板（`/commander/messages`：發送/刪除、指定學員/過期時間）
- [x] PWA：`manifest.json`（standalone）+ `sw.js`（離線快取 + push 支援）
- [x] `app/layout.tsx`：appleWebApp meta + Service Worker 自動注冊

---

## Phase 4 — 進階功能 ✅

- [x] 指揮官：歷史紀錄（`/commander/history`：全家流水帳、分類篩選）
- [x] 指揮官：星塵排行榜（`/commander/leaderboard`：金銀銅牌）
- [x] Web Push 訂閱管理（`/api/push/subscribe` POST/DELETE）
- [x] 手動調整星塵（`/api/children/adjust-coins`：呼叫 RPC）

**Phase 4 追加功能（全部完成）**
- [x] 任務模板庫（`/commander/tasks` 模板按鈕，20 個內建任務）
- [x] 週/月統計報表（`/commander/stats`：每日趨勢圖、學員排行）
- [x] 資料匯出 / 備份（`/api/export` JSON 完整備份 + CSV 流水帳）
- [ ] 多語系支援（低優先，視實際需求）

---

## 頁面完整清單

### 指揮官 `/commander/*`
| 路由 | 狀態 |
|------|------|
| `/commander` | ✅ 首頁（統計 + 快捷） |
| `/commander/cadets` | ✅ 學員管理 |
| `/commander/tasks` | ✅ 任務管理 |
| `/commander/approvals` | ✅ 待審核 |
| `/commander/rewards` | ✅ 獎勵設定 |
| `/commander/fulfill` | ✅ 待兌現清單 |
| `/commander/messages` | ✅ 留言板 |
| `/commander/history` | ✅ 歷史紀錄 |
| `/commander/leaderboard` | ✅ 排行榜 |
| `/commander/stats` | ✅ 統計報表（週/月趨勢圖） |

### 學員 `/cadet/*`
| 路由 | 狀態 |
|------|------|
| `/cadet` | ✅ 首頁 |
| `/cadet/tasks` | ✅ 任務列表 |
| `/cadet/shop` | ✅ 星塵商城 |
| `/cadet/wishlist` | ✅ 心願清單 |
| `/cadet/timer` | ✅ 計時器 |
| `/cadet/history` | ✅ 流水帳 |
| `/cadet/pet` | ✅ 寵物 |
| `/cadet/achievements` | ✅ 成就 |

### 公共
| 路由 | 狀態 |
|------|------|
| `/` | ✅ 登入入口 |
| `/signup` | ✅ 指揮官 Onboarding |
| `/login/commander` | ✅ 指揮官登入 |
| `/login/cadet` | ✅ 學員 KID 登入 |

---

## API 完整清單

| 路由 | 說明 | 狀態 |
|------|------|------|
| `/api/kids/auth` | 學員登入 + 自簽 JWT | ✅ |
| `/api/onboarding` | 建立家庭 + 學員 | ✅ |
| `/api/cadets` | 新增學員 | ✅ |
| `/api/cadets/[id]` | 編輯/停用/重設PIN | ✅ |
| `/api/tasks` | 建立任務 | ✅ |
| `/api/tasks/[id]` | 編輯任務 | ✅ |
| `/api/tasks/complete` | 完成任務 RPC | ✅ |
| `/api/tasks/daily-reset` | 每日結算 Cron | ✅ |
| `/api/approvals/approve` | 核可完成 RPC | ✅ |
| `/api/approvals/reject` | 駁回完成 RPC | ✅ |
| `/api/rewards` | 建立獎勵 | ✅ |
| `/api/rewards/[id]` | 編輯獎勵 | ✅ |
| `/api/rewards/redeem` | 兌換獎勵 RPC | ✅ |
| `/api/rewards/fulfill` | 標記已兌現 | ✅ |
| `/api/rewards/timer/start` | 開始計時 | ✅ |
| `/api/rewards/timer/end` | 結束計時 | ✅ |
| `/api/wishlist/toggle` | 加入/移除心願 | ✅ |
| `/api/messages` | 發送/刪除指揮官留言 | ✅ |
| `/api/children/adjust-coins` | 手動調整星塵 RPC | ✅ |
| `/api/push/subscribe` | Web Push 訂閱管理 | ✅ |
| `/api/export` | 資料匯出（JSON/CSV） | ✅ |
| `/api/commander/home` | 指揮官首頁摘要（admin client） | ✅ |
| `/api/commander/approvals` | 待審核任務清單（admin client） | ✅ |
| `/api/commander/rewards` | 獎勵清單（admin client） | ✅ |
| `/api/cadet/home` | 學員首頁摘要（admin client） | ✅ |
| `/api/cadet/shop` | 商城資料（admin client） | ✅ |
| `/api/cadet/history` | 流水帳（admin client） | ✅ |
| `/api/cadet/wishlist` | 心願清單（admin client） | ✅ |
| `/api/cadet/pet` | 寵物資料（admin client） | ✅ |
| `/api/cadet/achievements` | 成就資料（admin client） | ✅ |

---

## E2E 測試 (Playwright)

| 測試檔 | 測試數 | 狀態 |
|--------|--------|------|
| signup.spec.ts | 5 | ✅ |
| cadets.spec.ts | 5 | ✅ |
| tasks.spec.ts | 6 | ✅ |
| cadet-tasks.spec.ts | 6 | ✅ |
| approvals.spec.ts | 5 | ✅ |
| phase2.spec.ts | 9 | ✅ |
| phase3.spec.ts | 8 | ✅ |
| phase4.spec.ts | 6 | ✅ |
| templates.spec.ts | 3 | ✅ |
| **合計** | **53** | **✅ 53/53** |

---

## 已知問題（下一步處理）

- **指揮官其他頁面仍用 `supabase.from()` 直接查詢**（在 Vercel 生產環境有 401 風險）：
  - `/commander/tasks`、`/commander/fulfill`、`/commander/messages`、`/commander/history`、`/commander/leaderboard`、`/commander/stats`
  - 需要各自建立對應 `/api/commander/*` API route + admin client

---

## 待上線前必做

1. Supabase Dashboard 執行三個 migration SQL
2. Vercel 環境變數設定（6 個金鑰）
3. 自訂網域 `starduty.app` DNS 設定
4. 上傳 PWA 圖示（`/public/icon-192.png`、`/public/icon-512.png`）
5. 生成 VAPID 金鑰（`npx web-push generate-vapid-keys`）並填入環境變數

---

## 變更日誌（交付紀錄）

| 日期 | 交付內容 |
|------|----------|
| 2026-06-12 | 計畫文件 v0.3 → v0.5（架構審查補強、學員驗證方案定案） |
| 2026-06-12 | Phase 0：專案骨架 + DB migration（schema/RPC/RLS）+ 學員/指揮官登入 + 完成/兌換 API |
| 2026-06-12 | 文件結構整理：plan 與 progress 移入 `docs/`，新增本進度檔 |
| 2026-06-12 | Phase 1 Onboarding：`/signup` 多步驟流程 + `/api/onboarding` + Playwright E2E（5/5 通過） |
| 2026-06-12 | Phase 1 學員管理：`/commander/cadets` + 指揮官共用 Layout + 首頁 dashboard |
| 2026-06-12 | Phase 1 任務管理：`/commander/tasks`（一次性/每日/週期、圖示、審核開關） |
| 2026-06-12 | Phase 1 學員任務列表：`/cadet/tasks` + 學員首頁 + 學員共用 Layout |
| 2026-06-12 | Phase 1 待審核 + Cron：`/commander/approvals`、`/api/tasks/daily-reset`、vercel.json |
| 2026-06-12 | Phase 2 商城與獎勵系統：獎勵設定/商城/兌換/待兌現/心願清單/計時器/流水帳（9/9 通過） |
| 2026-06-12 | Phase 3 遊戲化與 PWA：寵物/成就/計時器/留言板/manifest/sw.js（8/8 通過） |
| 2026-06-12 | Phase 4 進階功能：歷史紀錄/排行榜/Push訂閱/星塵調整，全 E2E 50/50 通過 |
| 2026-06-12 | 任務模板庫：20 個內建任務，一鍵帶入表單 |
| 2026-06-12 | 週/月統計報表：每日趨勢圖、學員排行、4 個指標 |
| 2026-06-12 | 資料匯出/備份：JSON 完整備份 + CSV 流水帳，全 E2E 53/53 通過 |
| 2026-06-12 | 學員系統：iOS session 清除問題 → 改用獨立 localStorage (lib/cadetSession.ts)；KID 自動大寫 |
| 2026-06-12 | 學員任務：完成任務補上 Authorization header；任務/首頁改走 /api/cadet/* admin client |
| 2026-06-13 | 學員首頁修正：移除 supabase.auth.getUser()（學員不在 auth.users 導致登入後被踢回）→ 改用 getCadetToken() + /api/cadet/home；任務完成錯誤訊息顯示實際原因（err.code → err.error） |
| 2026-06-13 | 多個學員頁面（shop/history/wishlist/pet/achievements）改走 /api/cadet/* + admin client；wishlist toggle 改用 verifyCadet 安全驗證 |
| 2026-06-13 | PWA icon 404 修正：新增 public/icon.svg + 更新 manifest.json 改用 SVG |
| 2026-06-13 | 指揮官首頁/審核/獎勵修正：新增 /api/commander/home（admin client），改走 getUser() → getSession() 取得新鮮 token，修正學員數顯示0、待審核顯示0、新增獎勵按鈕無效 3 個問題 |
