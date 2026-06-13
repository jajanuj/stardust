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

