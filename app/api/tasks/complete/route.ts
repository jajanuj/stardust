import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";
import { mapRpcError } from "@/lib/errors";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const authHeader = req.headers.get("authorization") ?? "(none)";
  const hasToken = authHeader.startsWith("Bearer ") && authHeader.length > 10;
  const cadet = await verifyCadet(req);
  if (!cadet) {
    const reason = !hasToken ? "no_token" : "invalid_token";
    console.error("[complete] 401 reason:", reason, "header prefix:", authHeader.substring(0, 20));
    return NextResponse.json({ error: "unauthorized", reason }, { status: 401 });
  }

  let taskId = "";
  try {
    const body = await req.json();
    taskId = String(body.taskId ?? "");
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!taskId) {
    return NextResponse.json({ error: "missing_task_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("complete_task", {
    p_task_id: taskId,
    p_child_id: cadet.childId, // 取自驗證後的 token，非 body
  });

  if (error) {
    const e = mapRpcError(error.message);
    return NextResponse.json({ error: error.message, message: e.message }, { status: e.status });
  }
  return NextResponse.json(data);
}
