import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.coinCost !== undefined) updates.coin_cost = body.coinCost;
  if (body.category !== undefined) updates.category = body.category;
  if (body.stock !== undefined) updates.stock = body.stock;
  if (body.isTimed !== undefined) updates.is_timed = body.isTimed;
  if (body.timerMinutes !== undefined) updates.timer_minutes = body.timerMinutes;
  if (body.isActive !== undefined) updates.is_active = body.isActive;

  const { data, error } = await admin.from("rewards").update(updates).eq("id", params.id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reward: data });
}
