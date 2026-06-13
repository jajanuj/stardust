import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("pets")
    .select("*")
    .eq("child_id", claims.childId)
    .maybeSingle();

  return NextResponse.json({ pet: data ?? null });
}
