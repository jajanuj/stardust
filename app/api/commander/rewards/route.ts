import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function GET(req: NextRequest) {
  const commander = await verifyCommander(req);
  if (!commander) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("rewards")
    .select("*")
    .eq("family_id", commander.familyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ rewards: data ?? [], familyId: commander.familyId });
}
