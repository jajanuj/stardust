-- StarDuty 星際學院 — 資料表結構 (v0.5)
-- 對應 StarDuty-plan.md §3

-- ── 3.1 families（家庭）────────────────────────────────
create table if not exists families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  timezone    text default 'Asia/Taipei',
  owner_id    uuid references auth.users(id),
  created_at  timestamptz default now()
);

-- ── 3.2 family_members（家庭成員 / 多指揮官）────────────
create table if not exists family_members (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade,
  user_id     uuid references auth.users(id),
  role        text not null default 'commander', -- commander / viewer
  created_at  timestamptz default now(),
  unique(family_id, user_id)
);

-- ── 3.3 children（學員）─────────────────────────────────
create table if not exists children (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade,
  name        text not null,
  avatar      text,
  birth_year  integer,
  kid_code    text unique not null,
  pin_hash    text,
  coins       integer default 0 check (coins >= 0),
  pet_id      uuid,
  is_active   boolean default true,
  created_at  timestamptz default now()
);

-- ── 3.4 tasks（任務）────────────────────────────────────
create table if not exists tasks (
  id               uuid primary key default gen_random_uuid(),
  family_id        uuid references families(id) on delete cascade,
  assigned_to      uuid references children(id),
  title            text not null,
  description      text,
  icon             text,
  coins_reward     integer not null default 5 check (coins_reward >= 0),
  task_type        text not null default 'once', -- once / daily / weekly
  recur_days       int[],
  reset_hour       integer default 6,
  require_approval boolean default false,
  status           text default 'active',        -- active / archived
  created_by       uuid references auth.users(id),
  created_at       timestamptz default now()
);

-- ── 3.5 task_completions（完成紀錄）─────────────────────
create table if not exists task_completions (
  id              uuid primary key default gen_random_uuid(),
  task_id         uuid references tasks(id) on delete cascade,
  child_id        uuid references children(id) on delete cascade,
  family_id       uuid references families(id),
  completion_date date not null default current_date,
  completed_at    timestamptz default now(),
  coins_earned    integer not null,
  approved_by     uuid references auth.users(id),
  status          text default 'approved',        -- pending / approved / rejected
  unique(task_id, child_id, completion_date)
);

-- ── 3.6 rewards（獎勵商品）──────────────────────────────
create table if not exists rewards (
  id            uuid primary key default gen_random_uuid(),
  family_id     uuid references families(id) on delete cascade,
  title         text not null,
  description   text,
  image_url     text,
  coin_cost     integer not null check (coin_cost >= 0),
  category      text,
  stock         integer default -1,
  is_timed      boolean default false,
  timer_minutes integer,
  is_active     boolean default true,
  created_at    timestamptz default now()
);

-- ── 3.7 redemptions（兌換紀錄）──────────────────────────
create table if not exists redemptions (
  id               uuid primary key default gen_random_uuid(),
  reward_id        uuid references rewards(id),
  child_id         uuid references children(id) on delete cascade,
  family_id        uuid references families(id),
  coins_spent      integer not null,
  status           text default 'fulfilled',      -- fulfilled / used / expired / refunded
  timer_started_at timestamptz,
  timer_ended_at   timestamptz,
  fulfilled_by     uuid references auth.users(id),
  fulfilled_at     timestamptz,
  redeemed_at      timestamptz default now()
);

-- ── 3.8 wishlists（心願清單）────────────────────────────
create table if not exists wishlists (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid references children(id) on delete cascade,
  reward_id  uuid references rewards(id) on delete cascade,
  created_at timestamptz default now(),
  unique(child_id, reward_id)
);

-- ── 3.9 coin_transactions（星塵流水帳）─────────────────
create table if not exists coin_transactions (
  id            uuid primary key default gen_random_uuid(),
  child_id      uuid references children(id) on delete cascade,
  family_id     uuid references families(id),
  delta         integer not null,
  balance_after integer not null,
  reason        text,
  ref_id        uuid,
  created_at    timestamptz default now()
);

-- ── 3.10 cadet_login_attempts（學員登入防護）───────────
create table if not exists cadet_login_attempts (
  id           uuid primary key default gen_random_uuid(),
  kid_code     text not null,
  ip_hash      text,
  success      boolean not null,
  attempted_at timestamptz default now()
);
create index if not exists idx_login_attempts on cadet_login_attempts (kid_code, attempted_at desc);

-- ── 3.11 notifications（通知）───────────────────────────
create table if not exists notifications (
  id             uuid primary key default gen_random_uuid(),
  family_id      uuid references families(id) on delete cascade,
  recipient_type text not null, -- commander / cadet
  recipient_id   uuid,
  type           text not null,
  title          text not null,
  body           text,
  ref_id         uuid,
  is_read        boolean default false,
  created_at     timestamptz default now()
);
create index if not exists idx_notifications on notifications (recipient_id, is_read, created_at desc);

-- ── 3.12 push_subscriptions（推播訂閱）─────────────────
create table if not exists push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  owner_type text not null, -- commander / cadet
  owner_id   uuid not null,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz default now()
);

-- ── 3.13 pets / pet_stages（寵物系統）──────────────────
create table if not exists pets (
  id         uuid primary key default gen_random_uuid(),
  child_id   uuid references children(id) on delete cascade,
  species    text not null default 'star_slime',
  name       text,
  exp        integer default 0,
  stage      integer default 0,
  created_at timestamptz default now()
);

create table if not exists pet_stages (
  id      uuid primary key default gen_random_uuid(),
  species text not null,
  stage   integer not null,
  min_exp integer not null,
  label   text not null,
  asset   text not null,
  unique(species, stage)
);

-- ── 3.14 achievements / child_achievements（成就）──────
create table if not exists achievements (
  id          uuid primary key default gen_random_uuid(),
  code        text unique not null,
  title       text not null,
  description text,
  icon        text not null,
  rule        jsonb not null
);

create table if not exists child_achievements (
  id             uuid primary key default gen_random_uuid(),
  child_id       uuid references children(id) on delete cascade,
  achievement_id uuid references achievements(id),
  unlocked_at    timestamptz default now(),
  unique(child_id, achievement_id)
);

-- ── 3.15 commander_messages（指揮官留言）──────────────
create table if not exists commander_messages (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid references families(id) on delete cascade,
  child_id   uuid references children(id),
  author_id  uuid references auth.users(id),
  body       text not null,
  expires_at timestamptz,
  created_at timestamptz default now()
);

-- ── 3.16 task_templates（任務模板庫）───────────────────
create table if not exists task_templates (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid references families(id),
  title        text not null,
  icon         text,
  coins_reward integer not null default 5,
  task_type    text not null default 'once',
  created_at   timestamptz default now()
);

-- children.pet_id 外鍵（pets 建立後才補上）
do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'children_pet_id_fkey'
  ) then
    alter table children
      add constraint children_pet_id_fkey
      foreign key (pet_id) references pets(id) on delete set null;
  end if;
end $$;
