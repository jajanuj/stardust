import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 天

function genCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // 去掉易混淆字元
  let c = "";
  for (let i = 0; i < 8; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return c;
}

// GET：家庭資訊 + 指揮官清單 + 目前有效邀請碼
export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [{ data: family }, { data: members }] = await Promise.all([
    admin.from("families").select("name,invite_code,invite_expires_at").eq("id", cmd.familyId).single(),
    admin.from("family_members").select("user_id,role").eq("family_id", cmd.familyId),
  ]);

  const commanders = [];
  for (const m of members ?? []) {
    const { data } = await admin.auth.admin.getUserById(m.user_id);
    commanders.push({
      userId: m.user_id,
      email: data?.user?.email ?? "(未知)",
      role: m.role,
      isMe: m.user_id === cmd.userId,
    });
  }

  const active = !!family?.invite_code && !!family?.invite_expires_at &&
    new Date(family.invite_expires_at) > new Date();

  return NextResponse.json({
    familyName: family?.name ?? "",
    inviteCode: active ? family!.invite_code : null,
    inviteExpiresAt: active ? family!.invite_expires_at : null,
    commanders,
  });
}

// POST：產生 / 重新產生邀請碼（7 天有效）
export async function POST(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const code = genCode();
  const expiresAt = new Date(Date.now() + INVITE_TTL_MS).toISOString();
  const { error } = await admin.from("families")
    .update({ invite_code: code, invite_expires_at: expiresAt })
    .eq("id", cmd.familyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ inviteCode: code, inviteExpiresAt: expiresAt });
}

// DELETE：停用邀請碼
export async function DELETE(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin.from("families")
    .update({ invite_code: null, invite_expires_at: null })
    .eq("id", cmd.familyId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
