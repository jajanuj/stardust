import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const admin = createAdminClient();
import bcrypt from "bcryptjs";

function generateKidCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "KID-";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function POST(req: Request) {
  const { userId, familyName, cadetName, cadetAvatar, cadetPin } = await req.json();

  if (!userId || !familyName || !cadetName) {
    return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });
  }

  // 1. 建立家庭
  const { data: family, error: familyErr } = await admin
    .from("families")
    .insert({ name: familyName, owner_id: userId })
    .select()
    .single();

  if (familyErr || !family) {
    return NextResponse.json({ error: "建立家庭失敗" }, { status: 500 });
  }

  // 2. 建立家庭成員（指揮官）
  await admin.from("family_members").insert({
    family_id: family.id,
    user_id: userId,
    role: "commander",
  });

  // 3. 產生唯一 KID 代碼
  let kidCode = generateKidCode();
  let attempts = 0;
  while (attempts < 10) {
    const { data: existing } = await admin
      .from("children")
      .select("id")
      .eq("kid_code", kidCode)
      .maybeSingle();
    if (!existing) break;
    kidCode = generateKidCode();
    attempts++;
  }

  // 4. 雜湊 PIN（若有設定）
  const pinHash = cadetPin ? await bcrypt.hash(cadetPin, 10) : null;

  // 5. 建立學員
  const { data: child, error: childErr } = await admin
    .from("children")
    .insert({
      family_id: family.id,
      name: cadetName,
      avatar: cadetAvatar ?? "🧑‍🚀",
      kid_code: kidCode,
      pin_hash: pinHash,
    })
    .select()
    .single();

  if (childErr || !child) {
    return NextResponse.json({ error: "建立學員失敗" }, { status: 500 });
  }

  return NextResponse.json({
    family: { id: family.id, name: family.name },
    child: { id: child.id, name: child.name, avatar: child.avatar, kid_code: kidCode },
  });
}
