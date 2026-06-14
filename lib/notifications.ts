import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

// 站內通知建立輔助。通知失敗只記 log，絕不影響主流程（完成/兌換/審核）。
// 慣例（與 daily-reset 一致）：
//   指揮官通知 → recipient_type='commander', recipient_id=null（家庭層級，全家指揮官共見）
//   學員通知   → recipient_type='cadet', recipient_id=child_id

type Admin = ReturnType<typeof createAdminClient>;

interface NotifInput {
  type: string;
  title: string;
  body?: string | null;
  refId?: string | null;
}

export async function notifyCommander(admin: Admin, familyId: string, n: NotifInput) {
  const { error } = await admin.from("notifications").insert({
    family_id: familyId,
    recipient_type: "commander",
    recipient_id: null,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    ref_id: n.refId ?? null,
  });
  if (error) console.error("[notifyCommander] insert failed:", error.message);
}

export async function notifyCadet(admin: Admin, familyId: string, childId: string, n: NotifInput) {
  const { error } = await admin.from("notifications").insert({
    family_id: familyId,
    recipient_type: "cadet",
    recipient_id: childId,
    type: n.type,
    title: n.title,
    body: n.body ?? null,
    ref_id: n.refId ?? null,
  });
  if (error) console.error("[notifyCadet] insert failed:", error.message);
}
