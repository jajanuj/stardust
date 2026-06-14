import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

// 僅開發環境：給 E2E 測試種一筆指揮官通知（標題前綴方便清理）
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { title, body, recipient, childId } = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  const isCadet = recipient === "cadet";
  const { data, error } = await admin
    .from("notifications")
    .insert({
      family_id: cmd.familyId,
      recipient_type: isCadet ? "cadet" : "commander",
      recipient_id: isCadet ? (childId ?? null) : null,
      type: "test",
      title: title ?? "E2E 測試通知",
      body: body ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ notification: data });
}

// 清理：刪除本家庭所有 type='test' 通知（E2E afterEach 用）
export async function DELETE(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { error } = await admin
    .from("notifications")
    .delete()
    .eq("family_id", cmd.familyId)
    .eq("type", "test");
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
