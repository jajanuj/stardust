import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCadet } from "@/lib/auth/verifyCadet";
import { mapRpcError } from "@/lib/errors";
import { notifyCommander } from "@/lib/notifications";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const cadet = await verifyCadet(req);
  if (!cadet) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  let rewardId = "";
  try {
    const body = await req.json();
    rewardId = String(body.rewardId ?? "");
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!rewardId) {
    return NextResponse.json({ error: "missing_reward_id" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("redeem_reward", {
    p_reward_id: rewardId,
    p_child_id: cadet.childId,
  });

  if (error) {
    const e = mapRpcError(error.message);
    return NextResponse.json({ error: error.message, message: e.message }, { status: e.status });
  }

  // 兌換成功 → 通知指揮官待兌現
  const [{ data: child }, { data: reward }] = await Promise.all([
    admin.from("children").select("name").eq("id", cadet.childId).single(),
    admin.from("rewards").select("title").eq("id", rewardId).single(),
  ]);
  await notifyCommander(admin, cadet.familyId, {
    type: "redemption",
    title: "學員兌換獎勵",
    body: `${child?.name ?? "學員"} 兌換了「${reward?.title ?? "獎勵"}」，待兌現`,
    refId: data?.redemption_id ?? null,
  });

  return NextResponse.json(data);
}
