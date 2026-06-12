import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  const admin = createAdminClient();
  const body = await req.json();
  const updates: Record<string, unknown> = {};

  if (body.name !== undefined) updates.name = body.name;
  if (body.avatar !== undefined) updates.avatar = body.avatar;
  if (body.is_active !== undefined) updates.is_active = body.is_active;
  if (body.pin !== undefined) {
    updates.pin_hash = body.pin ? await bcrypt.hash(body.pin, 10) : null;
  }

  const { data, error } = await admin
    .from("children")
    .update(updates)
    .eq("id", params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ child: data });
}
