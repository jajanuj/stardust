import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { signCadetJwt } from "@/lib/auth/cadetJwt";

export const runtime = "nodejs"; // bcrypt 需 Node runtime

const MAX_FAILS = 5;
const WINDOW_MS = 15 * 60_000; // 15 分鐘

export async function POST(req: Request) {
  let kidCode = "";
  let pin = "";
  try {
    const body = await req.json();
    kidCode = String(body.kidCode ?? "").trim().toUpperCase();
    pin = String(body.pin ?? "");
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
  if (!kidCode) {
    return NextResponse.json({ error: "missing_kid_code" }, { status: 400 });
  }

  const admin = createAdminClient();

  // 1) 登入鎖定：近 15 分鐘失敗 >= 5 次 → 拒絕
  const since = new Date(Date.now() - WINDOW_MS).toISOString();
  const { count } = await admin
    .from("cadet_login_attempts")
    .select("*", { count: "exact", head: true })
    .eq("kid_code", kidCode)
    .eq("success", false)
    .gte("attempted_at", since);

  if ((count ?? 0) >= MAX_FAILS) {
    return NextResponse.json(
      { error: "too_many_attempts", message: "嘗試太多次，請稍後再試" },
      { status: 429 }
    );
  }

  // 2) 查學員並比對 PIN
  const { data: child } = await admin
    .from("children")
    .select("id, family_id, name, avatar, coins, pin_hash, is_active")
    .eq("kid_code", kidCode)
    .eq("is_active", true)
    .maybeSingle();

  const ok =
    !!child && (!child.pin_hash || (await bcrypt.compare(pin, child.pin_hash)));

  await admin
    .from("cadet_login_attempts")
    .insert({ kid_code: kidCode, success: ok });

  if (!ok || !child) {
    return NextResponse.json(
      { error: "invalid_credentials", message: "代碼或 PIN 錯誤" },
      { status: 401 }
    );
  }

  // 3) 簽發自簽 JWT
  const accessToken = await signCadetJwt({
    childId: child.id,
    familyId: child.family_id,
  });

  return NextResponse.json({
    access_token: accessToken,
    child: {
      id: child.id,
      name: child.name,
      avatar: child.avatar,
      coins: child.coins,
    },
  });
}
