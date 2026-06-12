import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { childId, delta, reason, adjusterId } = await req.json();
  if (!childId || delta === undefined || !adjusterId) {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("adjust_coins", {
    p_child_id: childId,
    p_delta: delta,
    p_reason: reason ?? "manual_adjust",
    p_adjuster_id: adjusterId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: data });
}
