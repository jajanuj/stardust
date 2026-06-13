import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childId } = claims;
  const admin = createAdminClient();

  const { data: child } = await admin
    .from("children")
    .select("name, avatar, coins")
    .eq("id", childId)
    .single();

  if (!child) return NextResponse.json({ error: "child_not_found" }, { status: 404 });

  const today = new Date().toLocaleDateString("sv-SE");
  const todayDay = new Date().getDay();

  const { data: tasks } = await admin
    .from("tasks")
    .select("id, task_type, recur_days, task_completions!left(completion_date, status, child_id)")
    .eq("family_id", claims.familyId)
    .eq("status", "active")
    .or(`assigned_to.eq.${childId},assigned_to.is.null`);

  let todayTotal = 0;
  let todayDone = 0;
  for (const t of tasks ?? []) {
    const completions = (Array.isArray(t.task_completions) ? t.task_completions : [])
      .filter((c: { child_id: string }) => c.child_id === childId);

    const visible = t.task_type === "weekly"
      ? (t.recur_days ?? []).includes(todayDay)
      : true;
    if (!visible) continue;

    if (t.task_type === "once") {
      const anyDone = completions.some((c: { status: string }) => c.status !== "rejected");
      if (anyDone) continue;
    }
    todayTotal++;
    const done = completions.some((c: { completion_date: string }) => c.completion_date === today);
    if (done) todayDone++;
  }

  return NextResponse.json({
    name: child.name,
    avatar: child.avatar,
    coins: child.coins,
    todayDone,
    todayTotal,
  });
}
