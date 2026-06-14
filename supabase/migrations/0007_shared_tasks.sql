-- StarDuty 星際學院 — 搶單制共用任務 (v0.7)
-- 在 Supabase SQL Editor 執行此檔。
-- 目的：支援「一份共用、先搶先贏、只發一次」的任務（如倒垃圾）。
--   tasks.is_shared = true 的任務，同一天只有第一個完成的學員入帳，其餘人看到「已被○○完成」。

-- ── 欄位（皆可空/預設 false，對既有資料零影響）──
alter table tasks
  add column if not exists is_shared boolean default false;

alter table task_completions
  add column if not exists is_shared boolean default false;

-- ── 部分唯一索引：搶單任務同一天只能有一筆完成（跨學員互斥）──
-- 只作用於 is_shared=true 的列；一般任務（每人各做一份）不受影響。
create unique index if not exists ux_task_completions_shared_claim
  on task_completions (task_id, completion_date)
  where is_shared;

-- ── 重寫 complete_task：加入搶單分支（即時入帳，靠上面索引保證互斥）──
create or replace function complete_task(p_task_id uuid, p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_task    tasks%rowtype;
  v_reward  integer;
  v_status  text;
  v_balance integer;
  v_new_id  uuid;
begin
  select * into v_task from tasks where id = p_task_id and status = 'active';
  if not found then raise exception 'task_not_found'; end if;

  if v_task.assigned_to is not null and v_task.assigned_to <> p_child_id then
    raise exception 'not_assigned';
  end if;

  v_reward := v_task.coins_reward;

  -- 鎖定學員列，避免並發
  select coins into v_balance from children where id = p_child_id for update;
  if not found then raise exception 'child_not_found'; end if;

  -- ── 搶單任務：一律即時入帳；唯一索引保證一天只有一人搶到 ──
  if v_task.is_shared then
    insert into task_completions(task_id, child_id, family_id, coins_earned, status, is_shared)
    values (p_task_id, p_child_id, v_task.family_id, v_reward, 'approved', true)
    on conflict do nothing
    returning id into v_new_id;

    if v_new_id is null then
      raise exception 'already_claimed';  -- 已被別人（或自己）搶走
    end if;

    v_balance := v_balance + v_reward;
    update children set coins = v_balance where id = p_child_id;
    insert into coin_transactions(child_id, family_id, delta, balance_after, reason, ref_id)
    values (p_child_id, v_task.family_id, v_reward, v_balance, 'task_complete', p_task_id);

    return jsonb_build_object('status', 'approved', 'balance', v_balance, 'shared', true);
  end if;

  -- ── 一般任務（每人各做一份）──
  v_status := case when v_task.require_approval then 'pending' else 'approved' end;

  insert into task_completions(task_id, child_id, family_id, coins_earned, status)
  values (p_task_id, p_child_id, v_task.family_id, v_reward, v_status);

  if v_status = 'approved' then
    v_balance := v_balance + v_reward;
    update children set coins = v_balance where id = p_child_id;
    insert into coin_transactions(child_id, family_id, delta, balance_after, reason, ref_id)
    values (p_child_id, v_task.family_id, v_reward, v_balance, 'task_complete', p_task_id);
  end if;

  return jsonb_build_object('status', v_status, 'balance', v_balance);
exception
  when unique_violation then raise exception 'already_completed_today';
end;
$$;
