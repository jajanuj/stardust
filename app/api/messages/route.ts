import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { familyId, authorId, childId, body, expiresAt } = await req.json();
  if (!familyId || !authorId || !body) return NextResponse.json({ error: "缺少參數" }, { status: 400 });

  const { data, error } = await admin.from("commander_messages").insert({
    family_id: familyId,
    author_id: authorId,
    child_id: childId ?? null,
    body,
    expires_at: expiresAt ?? null,
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ message: data });
}

export async function DELETE(req: Request) {
  const admin = createAdminClient();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "缺少 id" }, { status: 400 });
  await admin.from("commander_messages").delete().eq("id", id);
  return NextResponse.json({ ok: true });
}
