import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const body = await req.json();
  const { familyId, title, description, coinCost, category, stock, isTimed, timerMinutes } = body;

  if (!familyId || !title || coinCost === undefined) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  const { data, error } = await admin.from("rewards").insert({
    family_id: familyId,
    title,
    description: description ?? null,
    coin_cost: coinCost,
    category: category ?? null,
    stock: stock ?? -1,
    is_timed: isTimed ?? false,
    timer_minutes: isTimed ? (timerMinutes ?? 30) : null,
    is_active: true,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reward: data });
}
