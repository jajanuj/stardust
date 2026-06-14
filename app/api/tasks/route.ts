import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json();
  const { familyId, assignedTo, title, description, icon, coinsReward, taskType, recurDays, resetHour, requireApproval, isShared, createdBy } = body;

  if (!familyId || !title || !taskType || !createdBy) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  // 搶單任務只對「所有學員」有意義，且一律即時入帳（不需審核）
  const shared = !!isShared && !assignedTo;

  const { data, error } = await admin.from("tasks").insert({
    family_id: familyId,
    assigned_to: assignedTo ?? null,
    title,
    description: description ?? null,
    icon: icon ?? null,
    coins_reward: coinsReward ?? 5,
    task_type: taskType,
    recur_days: recurDays ?? null,
    reset_hour: resetHour ?? 6,
    require_approval: shared ? false : (requireApproval ?? false),
    is_shared: shared,
    created_by: createdBy,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}
