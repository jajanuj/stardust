import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { childId, rewardId } = await req.json();
  if (!childId || !rewardId) return NextResponse.json({ error: "缺少參數" }, { status: 400 });

  const { data: existing } = await admin
    .from("wishlists")
    .select("id")
    .eq("child_id", childId)
    .eq("reward_id", rewardId)
    .maybeSingle();

  if (existing) {
    await admin.from("wishlists").delete().eq("id", existing.id);
    return NextResponse.json({ action: "removed" });
  } else {
    await admin.from("wishlists").insert({ child_id: childId, reward_id: rewardId });
    return NextResponse.json({ action: "added" });
  }
}
