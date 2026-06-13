import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function GET(req: NextRequest) {
  const commander = await verifyCommander(req);
  if (!commander) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("task_completions")
    .select("id, coins_earned, completed_at, tasks(title, icon), children(name, avatar)")
    .eq("family_id", commander.familyId)
    .eq("status", "pending")
    .order("completed_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ items: data ?? [] });
}
