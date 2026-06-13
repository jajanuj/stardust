-- StarDuty 星際學院 — 常用任務（自訂模板）欄位擴充 (v0.6)
-- 在 Supabase SQL Editor 執行此檔。
-- 目的：讓 task_templates 能儲存完整任務內容（說明、每週週期日），
--       供指揮官把修改過的模板存成「常用任務」後一鍵重複建立。

-- ── 擴充 task_templates 欄位（皆可空，對既有資料零影響）──
alter table task_templates
  add column if not exists description text,
  add column if not exists recur_days  int[];

-- ── 啟用 RLS（與其他資料表一致；實際存取走 service_role admin client，會繞過 RLS）──
alter table task_templates enable row level security;

drop policy if exists commander_rw_templates on task_templates;
create policy commander_rw_templates on task_templates
  for all using (is_family_member(family_id))
  with check (is_family_member(family_id));

-- ── 查詢效能（依家庭撈取）──
create index if not exists idx_task_templates_family
  on task_templates (family_id, created_at desc);
