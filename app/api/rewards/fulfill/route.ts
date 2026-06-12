import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { redemptionId, fulfillerId } = await req.json();
  if (!redemptionId) return NextResponse.json({ error: "缺少參數" }, { status: 400 });

  const { data, error } = await admin
    .from("redemptions")
    .update({ status: "used", fulfilled_by: fulfillerId, fulfilled_at: new Date().toISOString() })
    .eq("id", redemptionId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ redemption: data });
}
