import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notifyCadet } from "@/lib/notifications";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { completionId, approverId } = await req.json();
  if (!completionId || !approverId) {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  // 先取完成紀錄資訊（駁回後可能無法 join 任務標題）
  const { data: comp } = await admin
    .from("task_completions")
    .select("child_id, family_id, tasks(title)")
    .eq("id", completionId)
    .single();

  const { data, error } = await admin.rpc("reject_completion", {
    p_completion_id: completionId,
    p_approver: approverId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 駁回 → 通知學員
  if (comp) {
    const taskTitle = (comp.tasks as { title?: string } | null)?.title ?? "任務";
    await notifyCadet(admin, comp.family_id, comp.child_id, {
      type: "rejected",
      title: "任務被退回",
      body: `「${taskTitle}」未通過審核，沒有入帳`,
      refId: completionId,
    });
  }

  return NextResponse.json({ result: data });
}
