import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: tasks, error: taskErr }, { data: cadets }] = await Promise.all([
    admin.from("tasks").select("*").eq("family_id", cmd.familyId).order("created_at", { ascending: false }),
    admin.from("children").select("id,name,avatar").eq("family_id", cmd.familyId).eq("is_active", true),
  ]);

  if (taskErr) return NextResponse.json({ error: taskErr.message }, { status: 500 });
  return NextResponse.json({ tasks: tasks ?? [], cadets: cadets ?? [], familyId: cmd.familyId, userId: cmd.userId });
}
