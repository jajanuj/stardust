import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

// 指揮官通知（家庭層級：recipient_type='commander'，依 family_id 篩選）

export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const [list, unreadCount] = await Promise.all([
    admin
      .from("notifications")
      .select("id,type,title,body,is_read,created_at")
      .eq("family_id", cmd.familyId)
      .eq("recipient_type", "commander")
      .order("created_at", { ascending: false })
      .limit(50),
    admin
      .from("notifications")
      .select("*", { count: "exact", head: true })
      .eq("family_id", cmd.familyId)
      .eq("recipient_type", "commander")
      .eq("is_read", false),
  ]);

  if (list.error) return NextResponse.json({ error: list.error.message }, { status: 500 });
  return NextResponse.json({ notifications: list.data ?? [], unread: unreadCount.count ?? 0 });
}

// 標記已讀：body.id 指定一筆；否則全部標記已讀
export async function PATCH(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const admin = createAdminClient();
  let q = admin
    .from("notifications")
    .update({ is_read: true })
    .eq("family_id", cmd.familyId)
    .eq("recipient_type", "commander");
  q = body.id ? q.eq("id", body.id) : q.eq("is_read", false);

  const { error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
