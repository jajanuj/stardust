import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.title !== undefined) updates.title = body.title;
  if (body.description !== undefined) updates.description = body.description;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.coinsReward !== undefined) updates.coins_reward = body.coinsReward;
  if (body.assignedTo !== undefined) updates.assigned_to = body.assignedTo;
  if (body.requireApproval !== undefined) updates.require_approval = body.requireApproval;
  if (body.status !== undefined) updates.status = body.status;
  if (body.recurDays !== undefined) updates.recur_days = body.recurDays;
  if (body.resetHour !== undefined) updates.reset_hour = body.resetHour;
  if (body.isShared !== undefined) {
    updates.is_shared = !!body.isShared && !body.assignedTo;
    if (updates.is_shared) updates.require_approval = false; // 搶單一律即時入帳
  }

  const { data, error } = await admin
    .from("tasks")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ task: data });
}

export async function DELETE(_req: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const { error } = await admin.from("tasks").delete().eq("id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
