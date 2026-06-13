import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: messages }, { data: cadets }] = await Promise.all([
    admin
      .from("commander_messages")
      .select("id,body,created_at,expires_at,child_id,children(name,avatar)")
      .eq("family_id", cmd.familyId)
      .order("created_at", { ascending: false }),
    admin.from("children").select("id,name,avatar").eq("family_id", cmd.familyId).eq("is_active", true),
  ]);

  return NextResponse.json({
    messages: messages ?? [],
    cadets: cadets ?? [],
    familyId: cmd.familyId,
    userId: cmd.userId,
  });
}
