import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data } = await admin
    .from("child_achievements")
    .select("achievements(code)")
    .eq("child_id", claims.childId);

  const codes: string[] = (data ?? []).map((r: { achievements: { code: string } | { code: string }[] | null }) => {
    const ach = r.achievements;
    if (!ach) return "";
    if (Array.isArray(ach)) return ach[0]?.code ?? "";
    return (ach as { code: string }).code;
  }).filter(Boolean);

  return NextResponse.json({ unlockedCodes: codes });
}
