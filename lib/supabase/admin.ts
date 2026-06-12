import "server-only";

import { createClient } from "@supabase/supabase-js";

// 僅限 server-side。使用 service role key，繞過 RLS，用於敏感寫入與 RPC 呼叫。
// 切勿在任何 client component 匯入此檔。
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  );
}
