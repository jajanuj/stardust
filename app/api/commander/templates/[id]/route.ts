import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  // 限定 family_id，避免刪到別家庭的模板
  const { error } = await admin
    .from("task_templates")
    .delete()
    .eq("id", params.id)
    .eq("family_id", cmd.familyId);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
