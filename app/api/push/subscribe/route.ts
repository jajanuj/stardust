import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { ownerType, ownerId, endpoint, p256dh, auth } = await req.json();
  if (!ownerType || !ownerId || !endpoint || !p256dh || !auth) {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  // upsert by endpoint
  const { error } = await admin.from("push_subscriptions").upsert(
    { owner_type: ownerType, owner_id: ownerId, endpoint, p256dh, auth },
    { onConflict: "endpoint" }
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const admin = createAdminClient();
  const { endpoint } = await req.json();
  if (!endpoint) return NextResponse.json({ error: "缺少 endpoint" }, { status: 400 });
  await admin.from("push_subscriptions").delete().eq("endpoint", endpoint);
  return NextResponse.json({ ok: true });
}
