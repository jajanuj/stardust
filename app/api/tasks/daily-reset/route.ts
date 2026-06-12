import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  // 簡單的 cron secret 保護
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();

  // 取得昨日日期（台灣時間，UTC+8）
  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const yesterdayStr = yesterday.toLocaleDateString("sv-SE");

  // 統計昨日各學員完成狀況（供未來統計用）
  const { data: stats } = await admin
    .from("task_completions")
    .select("child_id, family_id, status")
    .eq("completion_date", yesterdayStr)
    .eq("status", "approved");

  // 計算各學員昨日完成數（為 streak 統計預留）
  const childStats: Record<string, number> = {};
  for (const s of stats ?? []) {
    childStats[s.child_id] = (childStats[s.child_id] ?? 0) + 1;
  }

  // 建立今日提醒通知（針對有待完成任務的家庭）
  const { data: families } = await admin.from("families").select("id");
  const notifications = [];
  for (const fam of families ?? []) {
    const { count } = await admin
      .from("task_completions")
      .select("*", { count: "exact", head: true })
      .eq("family_id", fam.id)
      .eq("completion_date", yesterdayStr)
      .eq("status", "pending");

    if ((count ?? 0) > 0) {
      notifications.push({
        family_id: fam.id,
        recipient_type: "commander",
        type: "approval_needed",
        title: "有任務等待審核",
        body: `昨日有 ${count} 項任務等待核可`,
      });
    }
  }

  if (notifications.length > 0) {
    await admin.from("notifications").insert(notifications);
  }

  return NextResponse.json({
    ok: true,
    date: yesterdayStr,
    completions: stats?.length ?? 0,
    notificationsCreated: notifications.length,
  });
}
