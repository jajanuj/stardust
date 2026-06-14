import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";

export const runtime = "nodejs";

// 學員通知（recipient_type='cadet'，依驗證後 token 的 child_id 篩選）

export async function GET(req: NextRequest) {
  const cadet = await verifyCadet(req);
  if (!cadet) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [list, unreadCount] = await Promise.all([
    admin
      .from("notifications")
      .select("id,type,title,body,is_read,created_at")
      .eq("recipient_type", "cadet")
      .eq("recipient_id", cadet.childId)
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("recipient_type", "cadet")
      .eq("recipient_id", cadet.childId)
      .eq("is_read", false),
  ]);

  if (list.error) return NextResponse.json({ error: list.error.message }, { status: 500 });
  return NextResponse.json({ notifications: list.data ?? [], unread: unreadCount.count ?? 0 });
}

export async function PATCH(req: NextRequest) {
  const cadet = await verifyCadet(req);
  if (!cadet) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  let q = admin
    .from("notifications")
    .update({ is_read: true })
    .eq("recipient_type", "cadet")
    .eq("recipient_id", cadet.childId);
  q = body.id ? q.eq("id", body.id) : q.eq("is_read", false);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
