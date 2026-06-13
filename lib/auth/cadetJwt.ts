import "server-only";

import { SignJWT } from "jose";

const CADET_TTL = "2d"; // 學員 JWT 效期（短效 + 重新登入換發）

export interface CadetClaims {
  childId: string;
  familyId: string;
}

// 用 Supabase JWT Secret 簽出 Supabase 相容 JWT，讓 RLS 能透過 auth.jwt() 辨識學員。
export async function signCadetJwt({ childId, familyId }: CadetClaims): Promise<string> {
  const secret = new TextEncoder().encode(process.env.SUPABASE_JWT_SECRET!);
  return new SignJWT({
    role: "authenticated",
    user_metadata: { kind: "cadet", child_id: childId, family_id: familyId },
  })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setAudience("authenticated")   // Supabase RLS 必須的 aud claim
    .setIssuer("supabase")          // 標準 Supabase JWT issuer
    .setSubject(childId)
    .setIssuedAt()
    .setExpirationTime(CADET_TTL)
    .sign(secret);
}
