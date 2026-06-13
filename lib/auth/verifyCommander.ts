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
  if (!token) return null;

  const admin = createAdminClient();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;

  const { data: fm } = await admin
    .from("family_members")
    .select("family_id")
    .eq("user_id", user.id)
    .single();

  if (!fm?.family_id) return null;
  return { userId: user.id, familyId: fm.family_id };
}
