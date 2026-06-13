import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const fid = cmd.familyId;

  const [{ data: family }, { count: cadetCount }, { count: pendingApprovals }, { count: pendingFulfill }] =
    await Promise.all([
      admin.from("families").select("name").eq("id", fid).single(),
      admin.from("children").select("*", { count: "exact", head: true }).eq("family_id", fid).eq("is_active", true),
      admin.from("task_completions").select("*", { count: "exact", head: true }).eq("family_id", fid).eq("status", "pending"),
      admin.from("redemptions").select("*", { count: "exact", head: true }).eq("family_id", fid).eq("status", "fulfilled"),
    ]);

  if (!family) return NextResponse.json({ error: "Family not found" }, { status: 404 });

  return NextResponse.json({
    familyName: family.name ?? "我的家庭",
    cadetCount: cadetCount ?? 0,
    pendingApprovals: pendingApprovals ?? 0,
    pendingFulfill: pendingFulfill ?? 0,
  });
}
