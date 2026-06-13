import "server-only";

import { jwtVerify } from "jose";

export interface VerifiedCadet {
  childId: string;
  familyId: string;
}

// 驗證 Authorization: Bearer <cadet jwt>，回傳 child_id / family_id。
// 寫入 API 一律以「驗證後的 token」取得身分，絕不信任 request body 帶的 childId。
export async function verifyCadet(req: Request): Promise<VerifiedCadet | null> {
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) {
    console.warn("[verifyCadet] no token in Authorization header");
    return null;
  }

  const jwtSecret = process.env.SUPABASE_JWT_SECRET;
  if (!jwtSecret) {
    console.error("[verifyCadet] SUPABASE_JWT_SECRET env var not set!");
    return null;
  }

  try {
    const secret = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(token, secret);
    const meta = (payload.user_metadata ?? {}) as Record<string, unknown>;
    if (meta.kind !== "cadet") {
      console.warn("[verifyCadet] not a cadet token, kind:", meta.kind);
      return null;
    }
    const childId = meta.child_id as string | undefined;
    const familyId = meta.family_id as string | undefined;
    if (!childId || !familyId) {
      console.warn("[verifyCadet] missing child_id or family_id in token");
      return null;
    }
    return { childId, familyId };
  } catch (e) {
    console.error("[verifyCadet] JWT verify failed:", (e as Error).message);
    return null;
  }
}
