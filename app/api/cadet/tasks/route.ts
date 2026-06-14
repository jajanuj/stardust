import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childId, familyId } = claims;
  const admin = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: child }, { data: siblings }, { data: tasks, error }] = await Promise.all([
    admin.from("children").select("coins").eq("id", childId).single(),
    admin.from("children").select("id,name").eq("family_id", familyId),
    admin
      .from("tasks")
      .select(`id, title, description, icon, coins_reward, task_type, recur_days, reset_hour, require_approval, is_shared, status,
        task_completions!left(id, status, completion_date, child_id)`)
      .eq("family_id", familyId)
      .eq("status", "active")
      .or(`assigned_to.eq.${childId},assigned_to.is.null`)
      .order("created_at"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const nameOf = new Map((siblings ?? []).map((s) => [s.id, s.name]));

  // 搶單任務：保留當日任何人的完成紀錄（附搶到者名字）；一般任務：只留自己的。
  const filtered = (tasks ?? []).map((t) => {
    const comps = Array.isArray(t.task_completions) ? t.task_completions : [];
    if (t.is_shared) {
      const todays = comps
        .filter((c: { completion_date: string }) => c.completion_date === today)
        .map((c: { child_id: string }) => ({ ...c, claimer_name: nameOf.get(c.child_id) ?? "某人" }));
      return { ...t, task_completions: todays };
    }
    return {
      ...t,
      task_completions: comps.filter((c: { child_id: string }) => c.child_id === childId),
    };
  });

  return NextResponse.json({ tasks: filtered, today, coins: child?.coins ?? 0 });
}
