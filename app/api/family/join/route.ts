import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// 第二位家長用邀請碼加入既有家庭，成為共同指揮官。
// userId 來自剛註冊的帳號；邀請碼本身是存取閘門（有效且未過期才能加入）。
export async function POST(req: Request) {
  const { userId, code } = await req.json().catch(() => ({}));
  if (!userId || !code) {
    return NextResponse.json({ error: "缺少參數" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: family } = await admin
    .from("families")
    .select("id,name,invite_code,invite_expires_at")
    .eq("invite_code", String(code).toUpperCase().trim())
    .maybeSingle();

  if (!family) {
    return NextResponse.json({ error: "邀請碼無效" }, { status: 400 });
  }
  if (!family.invite_expires_at || new Date(family.invite_expires_at) < new Date()) {
    return NextResponse.json({ error: "邀請碼已過期，請向對方索取新的邀請碼" }, { status: 400 });
  }

  // 加入為指揮官（idempotent：重複加入不報錯）
  const { error } = await admin
    .from("family_members")
    .upsert({ family_id: family.id, user_id: userId, role: "commander" }, { onConflict: "family_id,user_id" });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, family: { id: family.id, name: family.name } });
}
