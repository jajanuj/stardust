import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export async function GET(req: NextRequest) {
  const claims = await verifyCadet(req);
  if (!claims) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [childRes, wishRes] = await Promise.all([
    admin.from("children").select("coins").eq("id", claims.childId).single(),
    admin.from("wishlists")
      .select("id, rewards(id,title,description,coin_cost,is_timed,timer_minutes)")
      .eq("child_id", claims.childId)
      .order("created_at", { ascending: false }),
  ]);

  return NextResponse.json({
    childId: claims.childId,
    coins: childRes.data?.coins ?? 0,
    wishes: wishRes.data ?? [],
  });
}
