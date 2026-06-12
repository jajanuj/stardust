"use client";

import { createClient } from "@supabase/supabase-js";

// 瀏覽器端 Supabase client（anon key + RLS）。
// 指揮官用 Supabase Auth session；學員用自簽 JWT（見 setCadetSession）。
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);

// 學員登入後，把自簽 JWT 設為當前 session，後續查詢即帶此 token。
// refresh_token 以同值佔位（學員流程靠 7 天效期，不做 Supabase refresh）。
export async function setCadetSession(accessToken: string) {
  await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: accessToken,
  });
}
