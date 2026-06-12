import { NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const token = authHeader.replace("Bearer ", "").trim();
  if (!token) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  const admin = createAdminClient();

  // Verify the token by fetching user
  const { data: { user }, error: authErr } = await admin.auth.getUser(token);
  if (authErr || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

  // Get family
  const { data: fm } = await admin.from("family_members").select("family_id").eq("user_id", user.id).single();
  if (!fm) return new Response(JSON.stringify({ error: "No family" }), { status: 404 });

  const familyId = fm.family_id;

  const [
    { data: children },
    { data: tasks },
    { data: completions },
    { data: rewards },
    { data: redemptions },
    { data: transactions },
  ] = await Promise.all([
    admin.from("children").select("id,name,avatar,coins,kid_code,is_active,created_at").eq("family_id", familyId),
    admin.from("tasks").select("id,title,icon,coins_reward,task_type,recur_days,status,require_approval,created_at").eq("family_id", familyId),
    admin.from("task_completions").select("id,task_id,child_id,status,coins_earned,completion_date,created_at").eq("family_id", familyId).order("created_at", { ascending: false }).limit(1000),
    admin.from("rewards").select("id,title,coin_cost,category,is_active,stock,created_at").eq("family_id", familyId),
    admin.from("redemptions").select("id,child_id,reward_id,status,redeemed_at").eq("family_id", familyId).order("redeemed_at", { ascending: false }).limit(500),
    admin.from("coin_transactions").select("id,child_id,delta,balance_after,reason,created_at").eq("family_id", familyId).order("created_at", { ascending: false }).limit(2000),
  ]);

  const format = req.nextUrl.searchParams.get("format") ?? "json";
  const dateStr = new Date().toISOString().slice(0, 10);

  if (format === "csv") {
    const rows = transactions ?? [];
    const childMap = Object.fromEntries((children ?? []).map((c) => [c.id, c.name]));
    const header = "date,child,delta,balance_after,reason";
    const lines = rows.map((r) => [
      r.created_at?.slice(0, 10),
      `"${childMap[r.child_id] ?? r.child_id}"`,
      r.delta,
      r.balance_after,
      r.reason,
    ].join(","));
    return new Response([header, ...lines].join("\n"), {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="starduty-export-${dateStr}.csv"`,
      },
    });
  }

  const exportData = {
    exported_at: new Date().toISOString(),
    family_id: familyId,
    children: children ?? [],
    tasks: tasks ?? [],
    task_completions: completions ?? [],
    rewards: rewards ?? [],
    redemptions: redemptions ?? [],
    coin_transactions: transactions ?? [],
  };

  return new Response(JSON.stringify(exportData, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="starduty-export-${dateStr}.json"`,
    },
  });
}
