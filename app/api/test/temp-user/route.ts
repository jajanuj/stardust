import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

// 僅開發環境：給 E2E 建立 / 刪除一個拋棄式 auth 帳號（測試第二位家長加入家庭）。
export async function POST() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const admin = createAdminClient();
  const email = `e2e_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.com`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: `Pw_${Math.random().toString(36).slice(2)}`,
    email_confirm: true,
  });
  if (error || !data.user) {
    return NextResponse.json({ error: error?.message ?? "create failed" }, { status: 500 });
  }
  return NextResponse.json({ userId: data.user.id, email });
}

export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const { userId } = await req.json().catch(() => ({}));
  if (!userId) return NextResponse.json({ error: "缺少 userId" }, { status: 400 });

  const admin = createAdminClient();
  // 先移除家庭成員關係，再刪帳號
  await admin.from("family_members").delete().eq("user_id", userId);
  const { error } = await admin.auth.admin.deleteUser(userId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
