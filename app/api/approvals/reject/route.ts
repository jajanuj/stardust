import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { completionId, approverId } = await req.json();
  if (!completionId || !approverId) {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  const { data, error } = await admin.rpc("reject_completion", {
    p_completion_id: completionId,
    p_approver_id: approverId,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ result: data });
}
