-- StarDuty 星際學院 — 家庭邀請碼（多指揮官）(v0.8)
-- 在 Supabase SQL Editor 執行此檔。
-- 目的：讓第二位家長用邀請碼加入既有家庭，成為共同指揮官（寫入 family_members）。

alter table families
  add column if not exists invite_code       text,
  add column if not exists invite_expires_at timestamptz;

-- 以邀請碼查家庭
create index if not exists idx_families_invite_code
  on families (invite_code)
  where invite_code is not null;
