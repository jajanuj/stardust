# StarDuty 星際學院 — 專案進度

> 這是進度的單一真相來源(single source of truth)。每次交付一段功能/頁面/修正後固定更新此檔。
> 設計細節見 [`StarDuty-plan.md`](./StarDuty-plan.md)。

**最後更新:2026-06-12**
**計畫版次:v0.5**

---

## 進度總覽

| 階段 | 範圍 | 狀態 |
|------|------|------|
| Phase 0 | 基礎建設(骨架、DB、驗證、核心 API) | ✅ 完成 |
| 環境設定 | 金鑰填寫、本機建置、跑 migration | 🔄 進行中 |
| Phase 1 | MVP 核心(學員/任務管理、任務列表) | ⏳ 未開始 |
| Phase 2 | 商城與獎勵 | ⏳ 未開始 |
| Phase 3 | 遊戲化與體驗優化 | ⏳ 未開始 |
| Phase 4 | 進階功能 | ⏳ 未開始 |

圖例:✅ 完成 ・ 🔄 進行中 ・ ⏳ 未開始 ・ ⛔ 受阻

---

## Phase 0 — 基礎建設 ✅

- [x] 專案骨架與設定檔(package.json、tsconfig、next.config、tailwind、postcss、.gitignore)
- [x] 星際深色主題基礎(globals.css、layout、登入入口頁)
- [x] 資料庫 schema migration(`supabase/migrations/0001_schema.sql`,18 張表)
- [x] 積分原子交易 RPC(`0002_functions.sql`:complete_task / redeem_reward / approve / reject / adjust_coins)
- [x] Row Level Security 與輔助函式(`0003_rls.sql`)
- [x] 學員 KID 代碼登入 + 自簽 JWT + 登入鎖定(`/api/kids/auth`)
- [x] 指揮官 Email 登入(Supabase Auth)
- [x] 完成任務 API(`/api/tasks/complete` → RPC)
- [x] 兌換獎勵 API(`/api/rewards/redeem` → RPC)
- [x] Supabase client / admin、JWT 簽發與驗證、RPC 錯誤對應

---

## 環境設定 🔄

- [x] `.env.local` 建立
- [x] `npm install`(本機)
- [ ] 三把金鑰確認填妥:`NEXT_PUBLIC_SUPABASE_ANON_KEY`(publishable)、`SUPABASE_SERVICE_ROLE_KEY`(secret)、`SUPABASE_JWT_SECRET`(Legacy JWT Secret)
- [ ] Supabase SQL Editor 依序執行 `0001` → `0002` → `0003`
- [ ] `npm run dev` 本機驗證登入流程

> 驗證機制決議:採方案 A(學員自簽 HS256 JWT + RLS)。專案現用簽章金鑰為 ECC(P-256),靠 **Legacy JWT Secret(尚未撤銷)** 驗證自簽 token。**切勿 revoke 該 legacy key**,否則學員登入失效。

---

## Phase 1 — MVP 核心 🔄

- [x] Onboarding:`/signup` 四步驟流程（帳號→家庭→學員→KID登入卡）+ `/api/onboarding` server route + Playwright E2E 5 tests 通過
- [ ] 指揮官:學員管理(新增/編輯/停用、產生 KID、重設 PIN)
- [ ] 指揮官:任務管理(一次性/每日/週期、審核開關)
- [ ] 學員:任務列表(以 completion_date 判定完成狀態)
- [ ] 學員:勾選完成(串接 `/api/tasks/complete`、星塵動畫)
- [ ] 指揮官:待審核頁(核可/駁回)
- [ ] 每日結算 Cron(`/api/tasks/daily-reset`)

---

## Phase 2 — 商城與獎勵 ⏳

- [ ] 指揮官:建立獎勵(計時型、庫存、Storage 圖片)
- [ ] 學員:星塵商城(分類、餘額)
- [ ] 學員:兌換流程(串接 `/api/rewards/redeem`)
- [ ] 指揮官:待兌現清單 + 標記已兌現
- [ ] 學員:心願清單
- [ ] 計時器功能
- [ ] 星塵流水帳頁面

---

## Phase 3 — 遊戲化與體驗優化 ⏳

- [ ] 寵物系統(pets + pet_stages)
- [ ] 成就徽章系統
- [ ] 指揮官留言
- [ ] 完成動畫、通知中心
- [ ] PWA(manifest + Service Worker)
- [ ] 手機體驗優化

---

## Phase 4 — 進階功能 ⏳

- [ ] Web Push 推播(VAPID)
- [ ] 任務模板庫
- [ ] 星塵排行榜
- [ ] 週/月統計報表
- [ ] 資料匯出 / 備份
- [ ] 多語系

---

## 變更日誌(交付紀錄)

| 日期 | 交付內容 |
|------|----------|
| 2026-06-12 | 計畫文件 v0.3 → v0.5(架構審查補強、學員驗證方案定案) |
| 2026-06-12 | Phase 0 完成:專案骨架 + DB migration(schema/RPC/RLS)+ 學員/指揮官登入 + 完成/兌換 API |
| 2026-06-12 | 文件結構整理:plan 與 progress 移入 `docs/`,新增本進度檔 |
| 2026-06-12 | Phase 1 Onboarding:`/signup` 多步驟流程 + `/api/onboarding` + Playwright E2E（5/5 通過） |
