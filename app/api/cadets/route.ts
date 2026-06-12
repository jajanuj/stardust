import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import bcrypt from "bcryptjs";

const CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

async function genUniqueKidCode(admin: ReturnType<typeof createAdminClient>) {
  for (let i = 0; i < 10; i++) {
    let code = "KID-";
    for (let j = 0; j < 6; j++) code += CHARS[Math.floor(Math.random() * CHARS.length)];
    const { data } = await admin.from("children").select("id").eq("kid_code", code).maybeSingle();
    if (!data) return code;
  }
  throw new Error("Cannot generate unique KID code");
}

export async function POST(req: Request) {
  const admin = createAdminClient();
  const { familyId, name, avatar, pin } = await req.json();
  if (!familyId || !name) return NextResponse.json({ error: "缺少必填欄位" }, { status: 400 });

  const kidCode = await genUniqueKidCode(admin);
  const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

  const { data, error } = await admin
    .from("children")
    .insert({ family_id: familyId, name, avatar: avatar ?? "🧑‍🚀", kid_code: kidCode, pin_hash: pinHash })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ child: { ...data, kid_code: kidCode } });
}
