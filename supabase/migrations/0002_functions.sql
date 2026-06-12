-- StarDuty 星際學院 — RPC 交易函式 (v0.5)
-- 對應 StarDuty-plan.md §6.4
-- 所有積分異動皆在單一交易內完成，避免「先讀後寫」併發問題。

-- ── 完成任務 ───────────────────────────────────────────
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
begin
  select * into v_task from tasks where id = p_task_id and status = 'active';
  if not found then raise exception 'task_not_found'; end if;

  if v_task.assigned_to is not null and v_task.assigned_to <> p_child_id then
    raise exception 'not_assigned';
  end if;

  v_reward := v_task.coins_reward;
  v_status := case when v_task.require_approval then 'pending' else 'approved' end;

  -- 鎖定學員列，避免並發
  select coins into v_balance from children where id = p_child_id for update;
  if not found then raise exception 'child_not_found'; end if;

  -- 寫完成紀錄（唯一約束擋同日重複）
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
end;
$$;

-- ── 兌換獎勵 ───────────────────────────────────────────
create or replace function redeem_reward(p_reward_id uuid, p_child_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reward        rewards%rowtype;
  v_balance       integer;
  v_redemption_id uuid;
begin
  select * into v_reward from rewards where id = p_reward_id and is_active = true;
  if not found then raise exception 'reward_not_found'; end if;

  select coins into v_balance from children where id = p_child_id for update;
  if not found then raise exception 'child_not_found'; end if;
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
end;
$$;

-- ── 審核：核可 ─────────────────────────────────────────
create or replace function approve_completion(p_completion_id uuid, p_approver uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp    task_completions%rowtype;
  v_balance integer;
begin
  select * into v_comp from task_completions where id = p_completion_id for update;
  if not found then raise exception 'completion_not_found'; end if;
  if v_comp.status <> 'pending' then raise exception 'not_pending'; end if;

  select coins into v_balance from children where id = v_comp.child_id for update;
  v_balance := v_balance + v_comp.coins_earned;

  update children set coins = v_balance where id = v_comp.child_id;
  update task_completions
    set status = 'approved', approved_by = p_approver
    where id = p_completion_id;

  insert into coin_transactions(child_id, family_id, delta, balance_after, reason, ref_id)
  values (v_comp.child_id, v_comp.family_id, v_comp.coins_earned, v_balance, 'approval', v_comp.id);

  return jsonb_build_object('status', 'approved', 'balance', v_balance);
end;
$$;

-- ── 審核：駁回 ─────────────────────────────────────────
create or replace function reject_completion(p_completion_id uuid, p_approver uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comp task_completions%rowtype;
begin
  select * into v_comp from task_completions where id = p_completion_id for update;
  if not found then raise exception 'completion_not_found'; end if;
  if v_comp.status <> 'pending' then raise exception 'not_pending'; end if;

  update task_completions
    set status = 'rejected', approved_by = p_approver
    where id = p_completion_id;

  return jsonb_build_object('status', 'rejected');
end;
$$;

-- ── 指揮官手動調整星塵 ─────────────────────────────────
create or replace function adjust_coins(p_child_id uuid, p_delta integer, p_reason text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_balance integer;
begin
  select coins into v_balance from children where id = p_child_id for update;
  if not found then raise exception 'child_not_found'; end if;

  v_balance := v_balance + p_delta;
  if v_balance < 0 then raise exception 'insufficient_coins'; end if;

  update children set coins = v_balance where id = p_child_id;
  insert into coin_transactions(child_id, family_id, delta, balance_after, reason)
  select p_child_id, family_id, p_delta, v_balance, coalesce(p_reason, 'manual_adjust')
  from children where id = p_child_id;

  return jsonb_build_object('balance', v_balance);
end;
$$;
