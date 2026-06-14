import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCadet } from "@/lib/notifications";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { completionId, approverId } = await req.json();
  if (!completionId || !approverId) {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("approve_completion", {
    p_completion_id: completionId,
    p_approver: approverId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 核可 → 通知學員入帳
  const { data: comp } = await admin
    .from("task_completions")
    .select("child_id, family_id, coins_earned, tasks(title)")
    .eq("id", completionId)
    .single();
  if (comp) {
    const taskTitle = (comp.tasks as { title?: string } | null)?.title ?? "任務";
    await notifyCadet(admin, comp.family_id, comp.child_id, {
      type: "approved",
      title: "任務已核可 🎉",
      body: `「${taskTitle}」+${comp.coins_earned} 星塵已入帳`,
      refId: completionId,
    });
  }

  return NextResponse.json({ result: data });
}
