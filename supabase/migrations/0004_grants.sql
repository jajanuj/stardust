-- StarDuty 星際學院 — 明確授予各角色的資料表存取權限
-- 在 Supabase SQL Editor 執行此檔，解決 "permission denied for table" 錯誤

-- ── 讓 service_role (admin client) 可以操作所有資料表 ──
grant usage on schema public to service_role;
grant all privileges on all tables in schema public to service_role;
grant all privileges on all sequences in schema public to service_role;
grant all privileges on all functions in schema public to service_role;

-- ── 讓 authenticated (指揮官 + 學員 RLS 篩選後) 可以讀寫 ──
grant usage on schema public to authenticated;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- ── 讓 anon (未登入者) 只能讀取公開資料 ──
grant usage on schema public to anon;

-- ── 確保未來新增的資料表也自動繼承這些權限 ──
alter default privileges in schema public
  grant all privileges on tables to service_role;
alter default privileges in schema public
  grant all privileges on sequences to service_role;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
