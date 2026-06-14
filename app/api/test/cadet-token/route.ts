import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";
import { signCadetJwt } from "@/lib/auth/cadetJwt";

export const runtime = "nodejs";

// 僅開發環境：給 E2E 簽一張學員 JWT（取本家庭第一位 active 學員，或指定 childId）
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { childId } = await req.json().catch(() => ({}));
  const admin = createAdminClient();

  let query = admin
    .from("children")
    .select("id,name,avatar,coins")
    .eq("family_id", cmd.familyId)
    .eq("is_active", true);
  query = childId ? query.eq("id", childId) : query.order("created_at").limit(1);

  const { data: child, error } = await query.single();
  if (error || !child) {
    return NextResponse.json({ error: "找不到學員" }, { status: 404 });
  }

  const token = await signCadetJwt({ childId: child.id, familyId: cmd.familyId });
  return NextResponse.json({ token, child });
}
