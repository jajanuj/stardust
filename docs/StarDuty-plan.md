# StarDuty 星際學院 — 親子任務獎勵系統開發計畫

**版次：v0.5**
**最後更新：2026-06-12**
**技術棧：Next.js + Supabase + Vercel**

> **v0.4 重點補強（檢查後新增）**
> 本版針對 v0.3 進行架構審查，補上多項會影響上線安全與資料正確性的關鍵缺口：
> 1. **學員 Session 機制（嚴重）** — 學員不走 Supabase Auth，原 RLS 規則對學員無效。補上自簽 JWT 方案讓 RLS 可辨識學員身分。（見 §2.3、§3.10）
> 2. **積分原子性（嚴重）** — 完成任務、兌換獎勵若用 client 端「先讀餘額再寫入」會有併發/重複扣款風險。改用 Postgres RPC 交易函式並加上餘額檢查與冪等性。（見 §6.4）
> 3. **每日/週期任務完成判定** — 原「物理重置」改為「以日期查詢」，新增 `completion_date` 與唯一約束，避免重複完成。（見 §3.5、§5.5）
> 4. **審核流程** — 補上需審核任務的星塵入帳時機與駁回退款流程。（見 §5.6）
> 5. **新增資料表** — 通知、成就、寵物設定、指揮官留言、任務模板、推播訂閱、家庭成員。（見 §3.9–§3.16）
> 6. **推播通知架構** — Web Push（VAPID）+ Service Worker，含 iOS 16.4+ 限制。（見 §5.7、§6.5）
> 7. **Onboarding / 家庭建立流程、頭像儲存、兒童隱私合規、測試策略、錯誤與離線處理。**（見 §4.0、§9、§10、§11）

---

## 專案基本資訊

| 項目 | 內容 |
|------|------|
| 專案名稱 | StarDuty 星際學院 |
| 資料夾名稱 | `starduty` |
| GitHub Repo | `github.com/{username}/starduty` |
| 正式網址 | `starduty.app` |
| 開發預覽 | `starduty.vercel.app` |

---

## 目錄

1. [專案概述](#1-專案概述)
2. [系統架構](#2-系統架構)
3. [資料庫結構](#3-資料庫結構)
4. [頁面與功能清單](#4-頁面與功能清單)
5. [功能流程說明](#5-功能流程說明)
6. [API 串接規劃](#6-api-串接規劃)
7. [開發階段規劃](#7-開發階段規劃)
8. [部署流程](#8-部署流程)
9. [兒童隱私與合規](#9-兒童隱私與合規)
10. [測試與品質策略](#10-測試與品質策略)
11. [錯誤處理、離線與邊界情境](#11-錯誤處理離線與邊界情境)
12. [版次紀錄](#12-版次紀錄)

---

## 1. 專案概述

### 專案名稱
**StarDuty 星際學院**

### 角色對照表
| 角色 | 稱呼 | 說明 |
|------|------|------|
| 家長 | 指揮官 | 管理學員帳號、設定任務、設定獎勵、審核兌換 |
| 小孩 | 學員 | 完成任務、賺取星塵、兌換獎勵、養育寵物 |
| 虛擬貨幣 | 星塵 | 完成任務獲得，商城消費 |

### 目標
指揮官設定星際任務，學員完成後獲得星塵，在星塵商城兌換真實獎勵。

### 登入機制
- 指揮官：Email + 密碼（Supabase Auth）
- 學員：`KID-XXXXXX` 代碼 + 可選 PIN（無需 Email）

> **v0.4 補充：** 學員登入後如何維持身分、以及 RLS 如何辨識學員，見 §2.3 與 §3.10。

### 部署形式
PWA 網站（可加到手機主畫面，體驗接近原生 App）

---

## 2. 系統架構

### 2.1 整體架構圖

```
┌──────────────────────────────────────────────────────────┐
│                  使用者裝置（PWA / 瀏覽器）                  │
│   ┌─────────────────┐         ┌─────────────────┐          │
│   │  指揮官介面       │         │   學員介面        │          │
│   │ /commander/*     │         │   /cadet/*       │          │
│   └────────┬────────┘         └────────┬────────┘          │
│            │   Service Worker（離線快取 + Web Push）          │
└────────────┼───────────────────────────┼──────────────────┘
             │                           │
             ▼                           ▼
┌──────────────────────────────────────────────────────────┐
│                  Next.js App (Vercel)                      │
│  ┌────────────────────────────────────────────────────┐  │
│  │ App Router                                          │  │
│  │  ├── /app/commander/*  指揮官後台（Supabase Auth）    │  │
│  │  ├── /app/cadet/*      學員頁面（自簽 JWT）            │  │
│  │  ├── /api/*            API Routes（敏感操作/RPC 呼叫） │  │
│  │  └── components/       共用元件                       │  │
│  └────────────────────────────────────────────────────┘  │
│  Vercel Cron ──► /api/tasks/daily-reset（每日結算/提醒）    │
└───────────────┬──────────────────────────┬───────────────┘
                │ anon key + RLS            │ service_role key
                ▼ (client 讀取)             ▼ (server 敏感寫入)
┌──────────────────────────────────────────────────────────┐
│                        Supabase                           │
│  ┌──────────┐ ┌─────────────┐ ┌──────────┐ ┌──────────┐  │
│  │  Auth    │ │ PostgreSQL  │ │ Realtime │ │ Storage  │  │
│  │ (指揮官)  │ │ + RLS + RPC │ │(即時同步) │ │(頭像/icon)│ │
│  └──────────┘ └─────────────┘ └──────────┘ └──────────┘  │
└──────────────────────────────────────────────────────────┘
                │
                ▼ Web Push (VAPID)
        指揮官 / 學員裝置推播通知
```

### 2.2 技術選擇說明

| 技術 | 用途 | 原因 |
|------|------|------|
| Next.js 14 (App Router) | 前端框架 | 現有專案相同架構 |
| Supabase Auth | 指揮官身份驗證 | 整合簡單 |
| 自簽 JWT (jose) | 學員身份驗證 | 學員無 Email，需自訂憑證讓 RLS 可辨識（見 §2.3） |
| Postgres RPC (PL/pgSQL) | 積分原子交易 | 避免併發/重複扣款，單一交易內完成檢查與寫入 |
| Supabase Realtime | 即時同步 | 指揮官設定任務後學員立即看到 |
| Supabase Storage | 頭像 / 自訂 icon | 圖片上傳託管 |
| Web Push (VAPID) | 推播通知 | 兌換、計時、待審核提醒 |
| Tailwind CSS | 樣式 | 深色太空主題實作快速 |
| Vercel | 部署 + Cron | Git push 自動部署，內建排程 |

### 2.3 學員身分驗證機制（v0.4 新增・關鍵）

**問題：** v0.3 的 RLS 規則寫「學員只能讀自己 `child_id` 的資料」，但學員不經過 Supabase Auth，沒有 `auth.uid()`，RLS 無從判斷對象，規則形同虛設。

**方案：自簽 Supabase 相容 JWT。**
學員以 `KID-XXXXXX`（+PIN）登入後，由 server 用 Supabase 的 JWT Secret 簽出一張帶有自訂 claim 的 JWT，前端把它當成 Supabase access token 使用，RLS 即可透過 `auth.jwt()` 讀到學員身分。

```
學員輸入 KID 代碼 (+PIN)
        │
        ▼
POST /api/kids/auth  ─── 驗證 kid_code + bcrypt 比對 pin_hash
        │              （含登入失敗次數限制 / 鎖定，見 §3.10）
        ▼
server 用 SUPABASE_JWT_SECRET 簽發 JWT：
   {
     "sub": "<child uuid>",
     "role": "authenticated",
     "user_metadata": { "kind": "cadet",
                        "child_id": "<uuid>",
                        "family_id": "<uuid>" },
     "exp": <7 天>
   }
        │
        ▼
前端 supabase.auth.setSession({ access_token, refresh_token })
        │
        ▼
之後所有 client 查詢都帶此 JWT → RLS 以 auth.jwt() 判斷學員身分
```

> 敏感寫入（積分、兌換）一律走 §6.4 的 server-side RPC + service role，不依賴學員 JWT 直接寫表；JWT 主要用於「讀取自己的資料」與 Realtime 訂閱授權。

### 2.4 學員驗證方案決議（v0.5）

**決議：採方案 A（自簽 JWT，學員 client 直接讀，RLS 把關）。**
理由：本專案高度依賴 Realtime（任務即時出現、指揮官留言、計時提醒），方案 A 可直接以 JWT 訂閱，開發量小、延遲低、成本低；寫入則一律走 server RPC，安全性與方案 B 一致。曾評估的方案 B（學員所有讀寫走 server API + service role）安全面最小，但即時同步需自建、且每個讀取畫面都要對應 API，複雜度與成本較高，故不採用。

> **前提：** 寫入永遠不下放給學員 JWT，只用於「讀自己的資料」與 Realtime 訂閱。

**採方案 A 的必要風險控管（實作時務必落實）：**

| 風險 | 控管措施 |
|------|----------|
| `SUPABASE_JWT_SECRET` 外洩可偽造身分 | 僅存於 Vercel server 環境變數，不進前端 bundle、不寫入 repo；定期輪替 |
| 自簽 JWT 效期內難撤銷 | 效期縮短至 1–2 天 + refresh 換發；重設 PIN / 停用學員時即停發新 token |
| RLS 寫錯導致跨家庭外洩 | 補完整 RLS 測試（§10），涵蓋「只能讀自己」「不能改 coins」「跨家庭隔離」 |
| 學員裝置持有有效 token | 僅授予讀權限；所有積分異動經 RPC，token 無法直接寫表 |
| PIN 暴力破解 | 登入失敗鎖定（§3.10，近 15 分鐘失敗 ≥5 次擋下） |

---

## 3. 資料庫結構

> 慣例：所有資料表加 `created_at`；需要時加 `updated_at`（由 trigger 自動更新）。星塵相關寫入一律經 RPC，不開放 client 直接寫。

### 3.1 families（家庭）
```sql
create table families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text default 'Asia/Taipei',     -- 用於「今日」判定（v0.4 新增）
  owner_id    uuid references auth.users(id),  -- 建立者（主指揮官）
  created_at  timestamptz default now()
);
```

### 3.2 family_members（家庭成員 / 多指揮官，v0.4 新增）
```sql
-- 支援父母雙方皆為指揮官；owner_id 仍保留為主帳號
create table family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade,
  user_id     uuid references auth.users(id),
  role        text not null default 'commander', -- commander / viewer
  created_at  timestamptz default now(),
  unique(family_id, user_id)
);
```

### 3.3 children（學員）
```sql
create table children (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  avatar      text,                    -- emoji 或 Storage 圖片 URL
  birth_year  integer,                 -- 年齡分級用（隱私：僅存年份）
  kid_code    text unique not null,    -- KID-XXXXXX
  pin_hash    text,                    -- bcrypt，可選
  coins       integer default 0 check (coins >= 0),  -- 星塵餘額（不可為負）
  pet_id      uuid,                    -- 目前養育的寵物（references pets，見 §3.13）
  is_active   boolean default true,    -- 軟刪除
  created_at  timestamptz default now()
);
```

### 3.4 tasks（任務）
```sql
create table tasks (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid references families(id) on delete cascade,
  assigned_to    uuid references children(id),  -- null = 全家
  title          text not null,
  description    text,
  icon           text,                           -- 任務圖示（emoji/icon key）
  coins_reward   integer not null default 5 check (coins_reward >= 0),
  task_type      text not null default 'once',   -- once / daily / weekly
  recur_days     int[],                          -- 0=日…6=六（weekly 用）
  reset_hour     integer default 6,              -- 每日重置時間（daily 用，家庭時區）
  require_approval boolean default false,        -- 是否需指揮官審核
  status         text default 'active',          -- active / archived
  created_by     uuid references auth.users(id),
  created_at     timestamptz default now()
);
```

**task_type 說明：**
| 類型 | 說明 | 使用欄位 |
|------|------|----------|
| `once` | 一次性任務，完成後不再出現 | — |
| `daily` | 每日可再完成一次 | `reset_hour` |
| `weekly` | 指定星期幾出現 | `recur_days` |

> **v0.4 變更：** `recur_days` 由 `text[]` 改為 `int[]`（0–6），與 JS `Date.getDay()` 一致，省去字串對照。

### 3.5 task_completions（完成紀錄）
```sql
create table task_completions (
  id           uuid primary key default gen_random_uuid(),
  task_id      uuid references tasks(id) on delete cascade,
  child_id     uuid references children(id) on delete cascade,
  family_id    uuid references families(id),    -- 反正規化，方便 RLS / Realtime 過濾
  completion_date date not null default current_date, -- 以家庭時區計算的「完成日」
  completed_at timestamptz default now(),
  coins_earned integer not null,
  approved_by  uuid references auth.users(id),  -- 指揮官審核（選配）
  status       text default 'approved',         -- pending / approved / rejected
  -- 防止 daily/weekly 同一天重複完成同一任務
  unique(task_id, child_id, completion_date)
);
```

> **v0.4 關鍵變更：** 加入 `completion_date` + 唯一約束取代「物理重置」。每日/週期任務不刪資料，而是查「今天有沒有對應 completion」來判斷是否已完成（見 §5.5）。預設 `status` 改為 `approved`；需審核的任務由 RPC 寫入 `pending` 並暫不入帳。

### 3.6 rewards（獎勵商品）
```sql
create table rewards (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid references families(id) on delete cascade,
  title          text not null,
  description    text,
  image_url      text,                           -- Storage 圖片
  coin_cost      integer not null check (coin_cost >= 0),
  category       text,                           -- 娛樂 / 美食 / 體驗 / 親子
  stock          integer default -1,             -- -1 = 無限
  is_timed       boolean default false,          -- 計時型獎勵
  timer_minutes  integer,                        -- 計時分鐘數
  is_active      boolean default true,
  created_at     timestamptz default now()
);
```

### 3.7 redemptions（兌換紀錄）
```sql
create table redemptions (
  id               uuid primary key default gen_random_uuid(),
  reward_id        uuid references rewards(id),
  child_id         uuid references children(id) on delete cascade,
  family_id        uuid references families(id),  -- 反正規化，供 Realtime 過濾
  coins_spent      integer not null,
  status           text default 'fulfilled',      -- fulfilled / used / expired / refunded
  timer_started_at timestamptz,
  timer_ended_at   timestamptz,
  fulfilled_by     uuid references auth.users(id),
  fulfilled_at     timestamptz,
  redeemed_at      timestamptz default now()
);
```

> **v0.4 變更：** 新增 `family_id`（解決 v0.3 註記「Realtime filter 需 join 或 view」的問題，直接反正規化過濾）。`status` 增加 `refunded`（庫存不足或指揮官取消時退款）。

### 3.8 wishlists（心願清單）
```sql
create table wishlists (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid references children(id) on delete cascade,
  reward_id   uuid references rewards(id) on delete cascade,
  created_at  timestamptz default now(),
  unique(child_id, reward_id)
);
```

### 3.9 coin_transactions（星塵流水帳）
```sql
create table coin_transactions (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid references children(id) on delete cascade,
  family_id     uuid references families(id),
  delta         integer not null,     -- 正=獲得，負=花費
  balance_after integer not null,     -- 異動後餘額（對帳用，v0.4 新增）
  reason        text,                 -- task_complete / redeem / refund / manual_adjust / approval
  ref_id        uuid,                 -- 對應 task_completion / redemption id
  created_at    timestamptz default now()
);
```

### 3.10 cadet_login_attempts（學員登入防護，v0.4 新增）
```sql
-- 防止 PIN 暴力破解；超過門檻即短時間鎖定
create table cadet_login_attempts (
  id          uuid primary key default gen_random_uuid(),
  kid_code    text not null,
  ip_hash     text,
  success     boolean not null,
  attempted_at timestamptz default now()
);
create index on cadet_login_attempts (kid_code, attempted_at desc);
```

### 3.11 notifications（通知，v0.4 新增）
```sql
-- 兌換、待審核、計時到時、心願達標等站內通知
create table notifications (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid references families(id) on delete cascade,
  recipient_type text not null,       -- commander / cadet
  recipient_id   uuid,                -- user_id 或 child_id
  type           text not null,       -- redemption / approval_needed / timer_done / wish_reached ...
  title          text not null,
  body           text,
  ref_id         uuid,
  is_read        boolean default false,
  created_at     timestamptz default now()
);
create index on notifications (recipient_id, is_read, created_at desc);
```

### 3.12 push_subscriptions（推播訂閱，v0.4 新增）
```sql
create table push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  owner_type  text not null,          -- commander / cadet
  owner_id    uuid not null,          -- user_id 或 child_id
  endpoint    text not null unique,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);
```

### 3.13 pets / pet_stages（寵物系統，v0.4 新增）
```sql
-- 寵物實體（每位學員養育一隻；保留多隻擴充空間）
create table pets (
  id          uuid primary key default gen_random_uuid(),
  child_id    uuid references children(id) on delete cascade,
  species     text not null default 'star_slime',
  name        text,
  exp         integer default 0,
  stage       integer default 0,      -- 0=蛋 1=幼體 2=成體…
  created_at  timestamptz default now()
);

-- 成長階段設定（資料驅動，方便日後新增物種/階段）
create table pet_stages (
  id          uuid primary key default gen_random_uuid(),
  species     text not null,
  stage       integer not null,
  min_exp     integer not null,       -- 達到此 exp 進入該階段
  label       text not null,          -- 蛋 / 幼體 / 成體
  asset       text not null,          -- 圖片/動畫 key
  unique(species, stage)
);
```

> **v0.4 變更：** 把原本塞在 `children` 的 `pet_exp / pet_stage` 抽成獨立 `pets` 表，並用 `pet_stages` 做資料驅動的成長門檻，避免把成長規則寫死在程式碼。

### 3.14 achievements / child_achievements（成就徽章，v0.4 新增）
```sql
create table achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,   -- first_task / 7day_streak / 100_coins ...
  title       text not null,
  description text,
  icon        text not null,
  rule        jsonb not null          -- 解鎖條件（如 {"type":"streak","days":7}）
);

create table child_achievements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid references children(id) on delete cascade,
  achievement_id uuid references achievements(id),
  unlocked_at    timestamptz default now(),
  unique(child_id, achievement_id)
);
```

### 3.15 commander_messages（指揮官留言，v0.4 新增）
```sql
-- 對應 §4.3 學員首頁「指揮官留言」與 Phase 3 功能
create table commander_messages (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade,
  child_id    uuid references children(id),  -- null = 給全家
  author_id   uuid references auth.users(id),
  body        text not null,
  expires_at  timestamptz,                    -- 可設定顯示到何時
  created_at  timestamptz default now()
);
```

### 3.16 task_templates（任務模板庫，v0.4 新增・對應 Phase 4）
```sql
create table task_templates (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid references families(id),  -- null = 系統內建模板
  title        text not null,
  icon         text,
  coins_reward integer not null default 5,
  task_type    text not null default 'once',
  created_at   timestamptz default now()
);
```

### 3.17 RLS（Row Level Security）原則

| 資料表 | 指揮官 | 學員 | 寫入限制 |
|--------|--------|------|----------|
| families / family_members | 讀寫自己所屬 family | 唯讀自己 family 基本資訊 | — |
| children | 讀寫自己 family | 唯讀自己那筆 | 學員不可改 coins |
| tasks | 讀寫自己 family | 讀自己被指派/全家 | 學員唯讀 |
| task_completions | 讀寫自己 family | 讀自己；**寫經 RPC** | client 不直接 insert |
| rewards | 讀寫自己 family | 讀自己 family | 學員唯讀 |
| redemptions / coin_transactions | 讀自己 family | 讀自己 | **僅 RPC / service role 寫** |
| wishlists | 讀自己 family | 讀寫自己 | — |
| notifications | 讀自己（recipient） | 讀自己 | server 寫 |

判斷依據：
- 指揮官：`auth.uid()` 是否屬於該 `family_id` 的 `family_members`。
- 學員：`auth.jwt() -> user_metadata ->> 'child_id'` 是否等於資料列的 `child_id`（依 §2.3 自簽 JWT）。

範例 policy：
```sql
-- 學員只能讀自己的完成紀錄
create policy cadet_read_own_completions on task_completions
for select using (
  (auth.jwt() -> 'user_metadata' ->> 'child_id')::uuid = child_id
);

-- 指揮官讀寫自己家庭的任務
create policy commander_rw_tasks on tasks
for all using (
  family_id in (
    select family_id from family_members where user_id = auth.uid()
  )
);
```

---

## 4. 頁面與功能清單

### 4.0 Onboarding / 首次設定流程（v0.4 新增）

```
指揮官 Email 註冊 (Supabase Auth)
        ▼
建立家庭 families（自動寫入 family_members 為 owner）
        ▼
新增第一位學員 → 系統產生 KID-XXXXXX（+ 可選 PIN）
        ▼
顯示「學員登入卡」（KID 代碼 + QR，可列印/截圖給小孩）
        ▼
（選配）匯入內建任務模板快速建立常見家務
        ▼
進入指揮中心
```

### 4.1 公共頁面

| 路由 | 說明 |
|------|------|
| `/` | 登入入口選擇（指揮官 / 學員） |
| `/login/commander` | 指揮官 Email 登入 |
| `/signup` | 指揮官註冊 + 建立家庭（Onboarding） |
| `/login/cadet` | 學員 KID 代碼輸入 |
| `/login/cadet/pin` | PIN 驗證（若有設定） |

### 4.2 指揮官後台 `/commander/*`

| 路由 | 頁面名稱 | 核心功能 |
|------|----------|----------|
| `/commander` | 指揮中心 | 各學員今日完成狀況、待審核、兌現提醒、未讀通知 |
| `/commander/cadets` | 學員管理 | 新增/編輯/停用學員、查看餘額、重設 PIN、產生登入卡 |
| `/commander/tasks` | 任務管理 | 建立任務（一次性/每日/週期）、套用模板、審核開關 |
| `/commander/approvals` | 待審核（v0.4 新增） | 審核需核可的完成項目（核可入帳 / 駁回） |
| `/commander/rewards` | 獎勵設定 | 建立獎勵、計時型開關與分鐘數、庫存、上傳圖片 |
| `/commander/fulfill` | 待兌現清單 | 查看兌換紀錄、標記已兌現 |
| `/commander/messages` | 留言板（v0.4 新增） | 對學員發送留言 |
| `/commander/history` | 歷史紀錄 | 星塵異動流水帳、報表 |

### 4.3 學員介面 `/cadet/*`

| 路由 | 頁面名稱 | 核心功能 |
|------|----------|----------|
| `/cadet` | 首頁 | 今日任務、星塵餘額、寵物狀態、指揮官留言、通知 |
| `/cadet/tasks` | 我的任務 | 任務列表（分區）、勾選完成 |
| `/cadet/shop` | 星塵商城 | 獎勵商品、分類篩選、立即兌換、心願清單入口 |
| `/cadet/wishlist` | 心願清單 | 已收藏獎勵、距離目標差多少星塵 |
| `/cadet/timer` | 計時器 | 計時型獎勵倒數、時間到通知指揮官 |
| `/cadet/pet` | 我的寵物（v0.4 新增） | 寵物成長狀態、EXP 進度 |
| `/cadet/history` | 歷程 | 任務完成紀錄、兌換紀錄 |
| `/cadet/achievements` | 我的成就 | 徽章收集、里程碑 |

---

## 5. 功能流程說明

### 5.1 任務建立流程（指揮官）

```
點「新增任務」
  ↓
① 任務名稱（必填）
② 任務說明（選填）
③ 指派給誰（全部 / 特定學員）
④ 星塵獎勵數量
⑤ 任務類型
     ├── 一次性（完成後消失）
     ├── 每日任務（設定重置時間，預設 06:00）
     └── 週期任務（勾選星期幾）
⑥ 需要指揮官審核（開關，預設關閉）
  ↓
（可選）套用任務模板快速帶入
  ↓
儲存 → 學員透過 Realtime 立即看到新任務
```

### 5.2 完成任務流程（v0.4 補強：原子化 + 審核分支）

```
學員在「我的任務」勾選完成
  ↓
POST /api/tasks/complete  →  呼叫 RPC complete_task()
  ↓ (單一交易內)
  ├─ 檢查任務存在、屬於該學員、今日尚未完成（唯一約束）
  ├─ require_approval = false：
  │     寫 task_completions(status=approved)
  │     + coin_transactions(delta=+reward, balance_after)
  │     + children.coins 累加
  │     → 回傳新餘額；前端播放星塵飛入動畫
  └─ require_approval = true：
        寫 task_completions(status=pending)，**暫不入帳**
        → 建立 notification 給指揮官、推播提醒
  ↓
（若有寵物）pet.exp 增加，達門檻則升級 → 觸發成就檢查
```

### 5.3 兌換獎勵流程（即時到帳，v0.4 補強原子性）

```
學員進入星塵商城 → 點選獎勵 → 確認頁
  （顯示：獎勵內容、花費星塵、兌換後剩餘星塵）
  ↓
確認兌換 → POST /api/rewards/redeem → 呼叫 RPC redeem_reward()
  ↓ (單一交易內，含 SELECT ... FOR UPDATE 鎖定該學員列)
  ├─ 檢查餘額足夠（不足 → 直接拒絕，不扣款）
  ├─ 檢查庫存（stock=0 → 拒絕；>0 → 扣 1）
  ├─ 寫 redemptions + coin_transactions(delta=-cost) + children.coins 扣除
  ↓
回傳兌換券畫面（可截圖）
建立 notification 給指揮官 + 推播：「○○ 兌換了 ××」
  ↓
指揮官實際給予獎勵後 → 在「待兌現清單」點「已兌現」→ 標記完成
```

### 5.4 心願清單流程

```
學員在商城看到喜歡但星塵不足的獎勵
  ↓
點「加入心願」→ POST /api/wishlist/toggle → 存入 wishlists
  ↓
首頁 / 心願清單頁顯示：「距離『○○』還差 XX 星塵 ✨」
  ↓
每次完成任務後進度自動更新（client 計算 coin_cost - coins）
星塵足夠時：顯示「可以兌換囉！」並建立 wish_reached 通知
```

### 5.5 每日 / 週期任務的「是否已完成」判定（v0.4 新增）

不再物理刪除或重置任務，改以日期查詢，避免歷史資料遺失與重複完成：

```
讀取學員任務列表時：
  ├─ once   ：若存在任何 approved completion → 視為已完成（隱藏或標示）
  ├─ daily  ：查 completion_date = 今天（家庭時區）有無紀錄
  └─ weekly ：今天的 getDay() 在 recur_days 內才顯示；
              再查 completion_date = 今天有無紀錄
```
`task_completions` 的 `unique(task_id, child_id, completion_date)` 從 DB 層保證同一天不會重複入帳。Cron（§8）只負責「結算昨日未完成提醒 / 連續達成統計」，不刪資料。

### 5.6 審核流程（v0.4 新增）

```
需審核任務被完成 → completion(status=pending)，星塵未入帳
  ↓
指揮官「待審核」頁看到項目（+推播）
  ├─ 核可：RPC approve_completion()
  │        → status=approved + coin_transactions(+reward) + 餘額累加
  └─ 駁回：RPC reject_completion()
           → status=rejected（不入帳；學員收到通知）

若先入帳後才駁回（例如手動調整情境）：
  → 以 coin_transactions(delta=-reward, reason='refund') 沖銷，餘額回補
```

### 5.7 計時型獎勵流程（v0.4 補強推播）

```
指揮官建立獎勵時開啟「計時型」並設定分鐘數
  ↓
學員兌換後進入計時器頁面 → 點「開始計時」
  → POST /api/rewards/timer/start（記 timer_started_at）
  ↓
前景倒數（提示保持畫面開啟）
  ↓
時間到：
  ├─ 前景：學員端響鈴/震動
  └─ 背景/關屏：依賴 Web Push（需事先授權）→ 指揮官 + 學員收到
  → POST /api/rewards/timer/end（記 timer_ended_at + 發通知）
```

> **iOS 限制說明：** Web Push 在 iOS 需 16.4+ 且 App 已「加入主畫面」後才可註冊。計時器在前景時正常運作；背景/關屏的到時提醒不保證即時，建議計時期間提示學員保持畫面開啟，並把推播當作輔助而非唯一機制。

---

## 6. API 串接規劃

### 6.1 Supabase 直接呼叫（Client Side，讀取為主）

透過 RLS 保護（指揮官用 Supabase Auth token，學員用 §2.3 自簽 JWT）：

```typescript
// 取得今日任務（含今天的完成狀態）
const today = new Date().toISOString().slice(0, 10)
const { data } = await supabase
  .from('tasks')
  .select('*, task_completions!left(id,status,completion_date)')
  .eq('status', 'active')
  .or(`assigned_to.eq.${childId},assigned_to.is.null`)

// 取得心願清單（含距離目標差多少）
const { data: wishes } = await supabase
  .from('wishlists')
  .select('*, rewards(title, coin_cost, image_url)')
  .eq('child_id', childId)
```

### 6.2 Next.js API Routes（Server Side，敏感操作）

| 路由 | Method | 說明 |
|------|--------|------|
| `/api/kids/auth` | POST | 驗證 KID 代碼 + PIN，回傳自簽 JWT（含登入鎖定） |
| `/api/tasks/complete` | POST | 呼叫 `complete_task()` RPC |
| `/api/tasks/daily-reset` | POST | Cron 觸發：結算昨日、連續達成統計、提醒 |
| `/api/approvals/approve` | POST | 呼叫 `approve_completion()` RPC |
| `/api/approvals/reject` | POST | 呼叫 `reject_completion()` RPC |
| `/api/rewards/redeem` | POST | 呼叫 `redeem_reward()` RPC |
| `/api/rewards/fulfill` | POST | 指揮官標記已兌現 |
| `/api/rewards/timer/start` | POST | 開始計時 |
| `/api/rewards/timer/end` | POST | 結束計時 + 通知 |
| `/api/wishlist/toggle` | POST | 新增/移除心願 |
| `/api/children/adjust-coins` | POST | 指揮官手動調整星塵（經 RPC 記流水） |
| `/api/push/subscribe` | POST | 儲存 Web Push 訂閱 |

### 6.3 學員登入 API 範例（含 JWT 簽發，v0.4 新增）

```typescript
// app/api/kids/auth/route.ts
import { SignJWT } from 'jose'
import bcrypt from 'bcryptjs'
import { createClient } from '@supabase/supabase-js'

const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!   // 僅 server 使用
)

export async function POST(req: Request) {
  const { kidCode, pin } = await req.json()

  // 1) 登入鎖定檢查：近 15 分鐘失敗 >= 5 次 → 拒絕
  const since = new Date(Date.now() - 15 * 60_000).toISOString()
  const { count } = await admin
    .from('cadet_login_attempts')
    .select('*', { count: 'exact', head: true })
    .eq('kid_code', kidCode).eq('success', false).gte('attempted_at', since)
  if ((count ?? 0) >= 5) {
    return Response.json({ error: '嘗試太多次，請稍後再試' }, { status: 429 })
  }

  // 2) 查學員並比對 PIN
  const { data: child } = await admin
    .from('children').select('*').eq('kid_code', kidCode).eq('is_active', true).single()
  const ok = child && (!child.pin_hash || await bcrypt.compare(pin ?? '', child.pin_hash))
  await admin.from('cadet_login_attempts').insert({ kid_code: kidCode, success: !!ok })
  if (!ok) return Response.json({ error: '代碼或 PIN 錯誤' }, { status: 401 })

  // 3) 簽發 Supabase 相容 JWT（用 JWT Secret）
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!)
  const token = await new SignJWT({
    role: 'authenticated',
    user_metadata: { kind: 'cadet', child_id: child.id, family_id: child.family_id },
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(child.id)
    .setExpirationTime('7d')
    .sign(secret)

  return Response.json({ access_token: token, child: {
    id: child.id, name: child.name, avatar: child.avatar, coins: child.coins } })
}
```

### 6.4 Postgres RPC 交易函式（v0.4 新增・核心）

把所有積分異動包進單一交易，從根本避免「先讀後寫」的併發問題。

```sql
-- 完成任務（含審核分支與每日唯一性）
create or replace function complete_task(p_task_id uuid, p_child_id uuid)
returns jsonb
language plpgsql
security definer            -- 以函式擁有者權限執行，繞過 client 寫表限制
as $$
declare
  v_task   tasks%rowtype;
  v_reward integer;
  v_status text;
  v_balance integer;
begin
  select * into v_task from tasks where id = p_task_id and status = 'active';
  if not found then raise exception 'task_not_found'; end if;

  -- 指派檢查
  if v_task.assigned_to is not null and v_task.assigned_to <> p_child_id then
    raise exception 'not_assigned';
  end if;

  v_reward := v_task.coins_reward;
  v_status := case when v_task.require_approval then 'pending' else 'approved' end;

  -- 鎖定學員列，避免並發
  select coins into v_balance from children where id = p_child_id for update;

  -- 寫完成紀錄（唯一約束擋同日重複；若衝突丟例外）
  insert into task_completions(task_id, child_id, family_id, coins_earned, status)
  values (p_task_id, p_child_id, v_task.family_id, v_reward, v_status);

  -- 僅在不需審核時立即入帳
  if v_status = 'approved' then
    v_balance := v_balance + v_reward;
    update children set coins = v_balance where id = p_child_id;
    insert into coin_transactions(child_id, family_id, delta, balance_after, reason, ref_id)
    values (p_child_id, v_task.family_id, v_reward, v_balance, 'task_complete', p_task_id);
  end if;

  return jsonb_build_object('status', v_status, 'balance', v_balance);
exception
  when unique_violation then raise exception 'already_completed_today';
end; $$;
```

```sql
-- 兌換獎勵（餘額 + 庫存原子檢查）
create or replace function redeem_reward(p_reward_id uuid, p_child_id uuid)
returns jsonb
language plpgsql security definer
as $$
declare
  v_reward rewards%rowtype;
  v_balance integer;
  v_redemption_id uuid;
begin
  select * into v_reward from rewards where id = p_reward_id and is_active = true;
  if not found then raise exception 'reward_not_found'; end if;

  -- 鎖定學員列
  select coins into v_balance from children where id = p_child_id for update;
  if v_balance < v_reward.coin_cost then raise exception 'insufficient_coins'; end if;

  -- 庫存：-1 無限；0 售罄；>0 扣 1
  if v_reward.stock = 0 then raise exception 'out_of_stock'; end if;
  if v_reward.stock > 0 then
    update rewards set stock = stock - 1 where id = p_reward_id;
  end if;

  v_balance := v_balance - v_reward.coin_cost;
  update children set coins = v_balance where id = p_child_id;

  insert into redemptions(reward_id, child_id, family_id, coins_spent, status)
  values (p_reward_id, p_child_id, v_reward.family_id, v_reward.coin_cost, 'fulfilled')
  returning id into v_redemption_id;

  insert into coin_transactions(child_id, family_id, delta, balance_after, reason, ref_id)
  values (p_child_id, v_reward.family_id, -v_reward.coin_cost, v_balance, 'redeem', v_redemption_id);

  return jsonb_build_object('redemption_id', v_redemption_id, 'balance', v_balance);
end; $$;
```

> `approve_completion()` / `reject_completion()` / `adjust_coins()` 採相同模式：鎖定學員列、更新狀態、寫 `coin_transactions` 並回傳 `balance_after`。前端只呼叫 RPC，永遠不直接寫積分欄位。

### 6.5 Web Push（VAPID）伺服器端範例（v0.4 新增）

```typescript
// app/api/rewards/redeem/route.ts 內，兌換成功後通知指揮官
import webpush from 'web-push'
webpush.setVapidDetails('mailto:admin@starduty.app',
  process.env.VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!)

async function notifyCommanders(familyId: string, payload: object) {
  const { data: subs } = await admin.from('push_subscriptions')
    .select('endpoint,p256dh,auth')
    .eq('owner_type', 'commander')
    // owner_id 屬於該 family 的成員（實作時以 join / in 子查詢）
  await Promise.allSettled((subs ?? []).map(s =>
    webpush.sendNotification(
      { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
      JSON.stringify(payload)
    )))
}
```

### 6.6 Supabase Realtime 訂閱（v0.4 修正過濾）

```typescript
// 學員端：監聽指派給自己或全家的新任務
supabase.channel('tasks')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'tasks',
    filter: `family_id=eq.${familyId}`
  }, () => { /* 重新載入任務列表 */ })
  .subscribe()

// 指揮官端：監聽兌換（redemptions 現已有 family_id，免 join）
supabase.channel('redemptions')
  .on('postgres_changes', {
    event: 'INSERT', schema: 'public', table: 'redemptions',
    filter: `family_id=eq.${familyId}`
  }, () => { /* 顯示兌現提醒 */ })
  .subscribe()
```

---

## 7. 開發階段規劃

### Phase 0 — 基礎建設（v0.4 新增・約 1 週）
- [ ] Supabase 專案、schema、RPC 函式、RLS policy
- [ ] 學員自簽 JWT 機制（`/api/kids/auth` + setSession）
- [ ] Onboarding：註冊 → 建立家庭 → 新增第一位學員 → 登入卡

### Phase 1 — MVP 核心（2–3 週）
- [ ] Next.js 專案初始化（App Router + Tailwind）
- [ ] 太空深色主題基礎 UI 元件
- [ ] 指揮官 Email 登入 / 學員 KID 代碼登入（含登入鎖定）
- [ ] 指揮官：新增/管理學員帳號（產生 KID、重設 PIN）
- [ ] 指揮官：建立任務（一次性 / 每日 / 週期）
- [ ] 學員：任務列表（以日期判定完成狀態）
- [ ] 學員：勾選完成（`complete_task` RPC，星塵自動增加）
- [ ] 需審核任務的待審核頁 + 核可/駁回
- [ ] Cron 結算/提醒（不刪資料）

### Phase 2 — 商城與獎勵（1–2 週）
- [ ] 指揮官：建立獎勵（含計時型、庫存、圖片上傳 Storage）
- [ ] 學員：星塵商城（分類篩選、餘額顯示）
- [ ] 學員：兌換（`redeem_reward` RPC，原子扣款）
- [ ] 指揮官：待兌現清單 + 標記已兌現
- [ ] 學員：心願清單（加入/移除、進度、達標通知）
- [ ] 計時器功能（倒數 + 到時提醒）
- [ ] 星塵流水帳頁面

### Phase 3 — 遊戲化與體驗優化（1–2 週）
- [ ] 寵物系統（pets + pet_stages 資料驅動成長）
- [ ] 成就徽章系統（achievements 規則引擎）
- [ ] 指揮官留言（學員首頁顯示）
- [ ] 完成任務動畫（星塵飛入）
- [ ] 站內通知中心
- [ ] PWA 設定（manifest + Service Worker）
- [ ] 手機體驗優化（bottom nav、手勢）

### Phase 4 — 進階功能（視需求）
- [ ] Web Push 推播（VAPID + 訂閱管理 + iOS 權限流程）
- [ ] 任務模板庫（常見家務快速新增）
- [ ] 星塵排行榜（家庭內）
- [ ] 週/月統計報表
- [ ] 資料匯出 / 備份
- [ ] 多語系支援

---

## 8. 部署流程

```
本地開發
  └── git push → GitHub
        └── Vercel 自動偵測 → 建置 + 部署
              ├── Preview URL（PR 預覽）
              └── Production URL（main branch）

環境變數（Vercel Dashboard 設定）
  NEXT_PUBLIC_SUPABASE_URL
  NEXT_PUBLIC_SUPABASE_ANON_KEY
  SUPABASE_SERVICE_ROLE_KEY      ← 僅 server-side API 使用
  SUPABASE_JWT_SECRET            ← 簽發學員 JWT（v0.4 新增）
  VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY  ← Web Push（v0.4 新增）
```

### 每日結算 / 提醒機制
```json
// vercel.json
{
  "crons": [{
    "path": "/api/tasks/daily-reset",
    "schedule": "0 22 * * *"
  }]
}
```
> UTC 22:00 = 台灣時間 06:00。此 Cron 不再刪除任務資料，而是：統計昨日未完成、更新連續達成（streak）、發送提醒通知。實際「是否已完成」由 `completion_date` 查詢決定（見 §5.5）。

### 網域設定
1. 於網域商購買 `starduty.app`
2. Vercel Dashboard → Domains → 加入 `starduty.app`
3. 網域商 DNS 設定 CNAME 指向 `cname.vercel-dns.com`
4. 開發期間先用 `starduty.vercel.app`

### PWA 部署注意事項
- `next.config.js` 加入 `next-pwa` 套件，註冊 Service Worker（離線快取 + Web Push）
- `public/manifest.json` 設定名稱（StarDuty）、icon、主題色（深藍/星空）、`display: standalone`
- Vercel 自動支援 HTTPS（PWA 必要條件）
- iOS 推播需使用者先「加入主畫面」並授權

---

## 9. 兒童隱私與合規（v0.4 新增）

本產品的使用者包含未成年學員，設計時應遵守兒童個資保護原則（如 COPPA / GDPR-K 精神）：

- **最小化蒐集：** 學員不蒐集 Email、不蒐集完整生日（僅存 `birth_year` 供年齡分級），不接金流。
- **家長同意：** 學員帳號一律由指揮官（家長）建立，無自助註冊；登入卡由家長保管。
- **無第三方追蹤 / 廣告：** 不在學員介面放入任何廣告或行為追蹤 SDK。
- **資料可攜與刪除：** 提供家庭資料匯出與「刪除家庭」功能（級聯刪除所有學員資料）。
- **PIN 安全：** PIN 以 bcrypt 雜湊儲存，登入失敗鎖定（§3.10）防暴力破解。
- **內容適齡：** 任務/獎勵文字由家長輸入，介面以圖示為主，照顧低年齡識字量。

---

## 10. 測試與品質策略（v0.4 新增）

| 層級 | 範圍 | 工具建議 |
|------|------|----------|
| 單元測試 | RPC 邏輯（餘額不為負、重複完成、庫存）、JWT 簽發 | Vitest + pgTAP / Supabase 本地 |
| 整合測試 | API Routes（完成、兌換、審核、退款） | Vitest + supertest |
| RLS 測試 | 學員只能讀自己、不能改 coins、跨家庭隔離 | Supabase test harness |
| E2E | 登入 → 完成任務 → 兌換 → 兌現 主流程 | Playwright |
| 併發測試 | 同一任務/兌換並發請求只成功一次 | 自訂壓力腳本 |

**重點驗證案例：** 餘額不足兌換被拒且不扣款；同日重複完成被擋；需審核任務未核可前不入帳；駁回後退款正確；庫存為 0 不可兌換。

---

## 11. 錯誤處理、離線與邊界情境（v0.4 新增）

- **網路失敗：** 完成/兌換等寫入採「樂觀 UI + 失敗回滾」，並顯示重試。
- **冪等性：** 前端按鈕送出後鎖定，後端以唯一約束（同日完成）與交易確保不重複入帳。
- **離線：** Service Worker 快取靜態資源與最近任務；離線時禁用寫入動作並提示。
- **時區：** 「今日」一律以家庭設定時區（`families.timezone`，預設 Asia/Taipei）換算，避免跨日誤判。
- **餘額一致性：** 以 `coin_transactions.balance_after` 與 `children.coins` 定期對帳。
- **計時器中斷：** App 被關閉後重開，依 `timer_started_at + timer_minutes` 重算剩餘時間。
- **競態：** 所有積分 RPC 使用 `SELECT … FOR UPDATE` 鎖定學員列。

---

## 12. 版次紀錄

| 版次 | 日期 | 更新內容 |
|------|------|----------|
| v0.1 | 2026-06-11 | 初版，建立整體架構、資料庫設計、功能清單、開發階段規劃 |
| v0.2 | 2026-06-11 | 確定主題（星際學院）、角色命名（指揮官/學員/星塵）、任務三種類型、兌換即時到帳流程、心願清單、計時型獎勵、每日重置 Cron Job |
| v0.3 | 2026-06-12 | 確定資料夾名稱（starduty）、正式網址（starduty.app）、加入網域 DNS 設定流程 |
| v0.4 | 2026-06-12 | **架構審查補強：** ① 學員自簽 JWT 機制（修正 RLS 對學員無效的漏洞，§2.3/§3.17）② 積分原子交易 RPC（complete_task/redeem_reward，§6.4）③ 每日/週期任務改以 completion_date 判定 + 唯一約束（§3.5/§5.5）④ 審核流程與退款（§5.6）⑤ 新增資料表：family_members、notifications、push_subscriptions、pets/pet_stages、achievements、commander_messages、task_templates、cadet_login_attempts（§3.2–§3.16）⑥ Web Push 推播架構（§5.7/§6.5）⑦ Onboarding 流程、Supabase Storage 頭像、兒童隱私合規、測試策略、錯誤/離線/邊界處理（§4.0/§9/§10/§11）⑧ 補整體架構圖、完成/兌換/審核/計時流程圖與程式碼範例 |
| v0.5 | 2026-06-12 | **定案學員驗證方案：** 採方案 A（自簽 JWT + RLS，學員 client 直接讀），新增 §2.4 決議與必要風險控管（JWT Secret 保管、效期縮短 1–2 天 + refresh、RLS 測試、寫入僅走 RPC、PIN 登入鎖定）。寫入一律不下放學員 JWT。 |
