-- 確保 RPC 函式可被 service_role 呼叫
-- 在 Supabase SQL Editor 執行此段

grant execute on function complete_task(uuid, uuid) to service_role;
grant execute on function redeem_reward(uuid, uuid) to service_role;
grant execute on function approve_completion(uuid, uuid) to service_role;
grant execute on function reject_completion(uuid, uuid) to service_role;
grant execute on function adjust_coins(uuid, integer, text) to service_role;

-- 確認 cadet_login_attempts 有 service_role 權限
grant all on table cadet_login_attempts to service_role;
grant all on table cadet_login_attempts to authenticated;
