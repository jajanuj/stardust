import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childId, familyId } = claims;
  const admin = createAdminClient();

  const today = new Date().toISOString().slice(0, 10);

  const [{ data: child }, { data: tasks, error }] = await Promise.all([
    admin.from("children").select("coins").eq("id", childId).single(),
    admin
      .from("tasks")
      .select(`id, title, description, icon, coins_reward, task_type, recur_days, reset_hour, require_approval, status,
        task_completions!left(id, status, completion_date, child_id)`)
      .eq("family_id", familyId)
      .eq("status", "active")
      .or(`assigned_to.eq.${childId},assigned_to.is.null`)
      .order("created_at"),
  ]);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 只留此學員的 completions
  const filtered = (tasks ?? []).map((t) => ({
    ...t,
    task_completions: (Array.isArray(t.task_completions) ? t.task_completions : [])
      .filter((c: { child_id: string }) => c.child_id === childId),
  }));

  return NextResponse.json({ tasks: filtered, today, coins: child?.coins ?? 0 });
}
