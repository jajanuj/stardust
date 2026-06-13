import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = req.nextUrl.searchParams.get("period") ?? "week";
  const since = period === "week"
    ? new Date(Date.now() - 7 * 86400_000).toISOString()
    : new Date(Date.now() - 30 * 86400_000).toISOString();

  const admin = createAdminClient();
  const [{ data: cadets }, { data: transactions }] = await Promise.all([
    admin.from("children").select("id,name,avatar,coins").eq("family_id", cmd.familyId).eq("is_active", true),
    admin
      .from("coin_transactions")
      .select("child_id,delta,reason,created_at")
      .eq("family_id", cmd.familyId)
      .gte("created_at", since)
      .order("created_at", { ascending: true }),
  ]);

  return NextResponse.json({ cadets: cadets ?? [], transactions: transactions ?? [] });
}
