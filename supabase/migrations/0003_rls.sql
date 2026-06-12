-- StarDuty 星際學院 — Row Level Security (v0.5)
-- 對應 StarDuty-plan.md §3.17
-- 指揮官：Supabase Auth（auth.uid()）。學員：自簽 JWT，child_id 放在 user_metadata。
-- 積分相關寫入皆走 §6.4 security definer 函式，故下方多數表只需 SELECT policy。

-- ── 輔助函式 ───────────────────────────────────────────
create or replace function is_family_member(p_family_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from family_members
    where family_id = p_family_id and user_id = auth.uid()
  );
$$;

create or replace function current_cadet_child_id()
returns uuid
language sql stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'child_id', '')::uuid;
$$;

create or replace function current_cadet_family_id()
returns uuid
language sql stable
as $$
  select nullif(auth.jwt() -> 'user_metadata' ->> 'family_id', '')::uuid;
$$;

-- ── 啟用 RLS ───────────────────────────────────────────
alter table families            enable row level security;
alter table family_members      enable row level security;
alter table children            enable row level security;
alter table tasks               enable row level security;
alter table task_completions    enable row level security;
alter table rewards             enable row level security;
alter table redemptions         enable row level security;
alter table wishlists           enable row level security;
alter table coin_transactions   enable row level security;
alter table notifications       enable row level security;
alter table pets                enable row level security;
alter table child_achievements  enable row level security;
alter table commander_messages  enable row level security;

-- ── families ───────────────────────────────────────────
create policy commander_rw_families on families
  for all using (is_family_member(id)) with check (is_family_member(id));
create policy cadet_read_family on families
  for select using (id = current_cadet_family_id());

-- ── family_members ─────────────────────────────────────
create policy commander_rw_members on family_members
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));

-- ── children ───────────────────────────────────────────
create policy commander_rw_children on children
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy cadet_read_self on children
  for select using (id = current_cadet_child_id());

-- ── tasks ──────────────────────────────────────────────
create policy commander_rw_tasks on tasks
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy cadet_read_tasks on tasks
  for select using (
    family_id = current_cadet_family_id()
    and (assigned_to is null or assigned_to = current_cadet_child_id())
  );

-- ── task_completions（寫入經 RPC）──────────────────────
create policy commander_read_completions on task_completions
  for select using (is_family_member(family_id));
create policy cadet_read_completions on task_completions
  for select using (child_id = current_cadet_child_id());

-- ── rewards ────────────────────────────────────────────
create policy commander_rw_rewards on rewards
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy cadet_read_rewards on rewards
  for select using (family_id = current_cadet_family_id());

-- ── redemptions（寫入經 RPC）───────────────────────────
create policy commander_rw_redemptions on redemptions
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy cadet_read_redemptions on redemptions
  for select using (child_id = current_cadet_child_id());

-- ── wishlists（學員可自行增刪）─────────────────────────
create policy commander_read_wishlists on wishlists
  for select using (
    exists (select 1 from children c
            where c.id = wishlists.child_id and is_family_member(c.family_id))
  );
create policy cadet_rw_wishlists on wishlists
  for all using (child_id = current_cadet_child_id())
  with check (child_id = current_cadet_child_id());

-- ── coin_transactions（寫入經 RPC）─────────────────────
create policy commander_read_tx on coin_transactions
  for select using (is_family_member(family_id));
create policy cadet_read_tx on coin_transactions
  for select using (child_id = current_cadet_child_id());

-- ── notifications ──────────────────────────────────────
create policy commander_read_notifs on notifications
  for select using (recipient_type = 'commander' and recipient_id = auth.uid());
create policy cadet_read_notifs on notifications
  for select using (recipient_type = 'cadet' and recipient_id = current_cadet_child_id());

-- ── pets ───────────────────────────────────────────────
create policy commander_rw_pets on pets
  for all using (
    exists (select 1 from children c
            where c.id = pets.child_id and is_family_member(c.family_id))
  );
create policy cadet_read_pet on pets
  for select using (child_id = current_cadet_child_id());

-- ── child_achievements ─────────────────────────────────
create policy cadet_read_ach on child_achievements
  for select using (child_id = current_cadet_child_id());
create policy commander_read_ach on child_achievements
  for select using (
    exists (select 1 from children c
            where c.id = child_achievements.child_id and is_family_member(c.family_id))
  );

-- ── commander_messages ─────────────────────────────────
create policy commander_rw_messages on commander_messages
  for all using (is_family_member(family_id)) with check (is_family_member(family_id));
create policy cadet_read_messages on commander_messages
  for select using (
    family_id = current_cadet_family_id()
    and (child_id is null or child_id = current_cadet_child_id())
  );
