import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function POST(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { rewardId } = await req.json();
  if (!rewardId) return NextResponse.json({ error: "缺少 rewardId" }, { status: 400 });

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("wishlists")
    .select("id")
    .eq("child_id", claims.childId)
    .eq("reward_id", rewardId)
    .maybeSingle();

  if (existing) {
    await admin.from("wishlists").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  } else {
    await admin.from("wishlists").insert({ child_id: claims.childId, reward_id: rewardId });
    return NextResponse.json({ action: "added" });
  }
}
