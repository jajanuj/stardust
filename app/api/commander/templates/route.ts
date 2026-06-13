import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyCommander } from "@/lib/auth/verifyCommander";

// 常用任務（自訂模板）— 依家庭儲存於 task_templates 表

export async function GET(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("task_templates")
    .select("id,icon,title,description,coins_reward,task_type,recur_days,created_at")
    .eq("family_id", cmd.familyId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const templates = (data ?? []).map((t) => ({
    id: t.id,
    icon: t.icon ?? "📋",
    title: t.title,
    description: t.description ?? "",
    coinsReward: t.coins_reward ?? 5,
    taskType: t.task_type ?? "once",
    recurDays: t.recur_days ?? undefined,
  }));
  return NextResponse.json({ templates });
}

export async function POST(req: NextRequest) {
  const cmd = await verifyCommander(req);
  if (!cmd) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { icon, title, description, coinsReward, taskType, recurDays } = await req.json();
  if (!title || !String(title).trim()) {
    return NextResponse.json({ error: "缺少任務名稱" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("task_templates")
    .insert({
      family_id: cmd.familyId,
      icon: icon ?? "📋",
      title: String(title).trim(),
      description: description ? String(description).trim() : null,
      coins_reward: coinsReward ?? 5,
      task_type: taskType ?? "once",
      recur_days: taskType === "weekly" ? (recurDays ?? null) : null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ template: data });
}
