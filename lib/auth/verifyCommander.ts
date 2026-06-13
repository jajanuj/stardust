import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export interface VerifiedCommander {
  userId: string;
  familyId: string;
}

// 驗證 Authorization: Bearer <supabase session jwt>，回傳 userId + familyId。
export async function verifyCommander(req: Request): Promise<VerifiedCommander | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    console.warn("[verifyCommander] no Bearer token");
    return null;
  }

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) {
    console.warn("[verifyCommander] getUser failed:", error?.message ?? "no user", "token prefix:", token.substring(0, 20));
    return null;
  }

  const { data: fm, error: fmErr } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .single();

  if (!fm?.family_id) {
    console.warn("[verifyCommander] no family_members row for user:", user.id, fmErr?.message);
    return null;
  }
  return { userId: user.id, familyId: fm.family_id };
}
