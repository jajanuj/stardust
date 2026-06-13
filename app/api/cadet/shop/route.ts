import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childId, familyId } = claims;
  const admin = createAdminClient();

  const [childRes, rewardsRes] = await Promise.all([
    admin.from("children").select("coins").eq("id", childId).single(),
    admin.from("rewards").select("*").eq("family_id", familyId).eq("is_active", true).order("coin_cost"),
  ]);

  return NextResponse.json({
    childId,
    coins: childRes.data?.coins ?? 0,
    rewards: rewardsRes.data ?? [],
  });
}
