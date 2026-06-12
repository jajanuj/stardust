"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface TxItem {
  id: string;
  delta: number;
  balance_after: number;
  reason: string;
  created_at: string;
}

export default function HistoryPage() {
  const router = useRouter();
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/cadet"); return; }
    const meta = user.user_metadata;
    const cid = meta?.child_id ?? user.id;
    const { data } = await supabase
      .from("coin_transactions")
      .select("id,delta,balance_after,reason,created_at")
      .eq("child_id", cid)
      .order("created_at", { ascending: false })
      .limit(100);
    setTxs(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function reasonLabel(reason: string) {
    const map: Record<string, string> = {
      task_complete: "完成任務",
      redeem: "兌換獎勵",
      refund: "退款",
      manual_adjust: "指揮官調整",
      approval: "審核通過",
    };
    return map[reason] ?? reason;
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">我的歷程 📖</h1>
        <p className="text-sm text-slate-400">星塵異動紀錄</p>
      </div>
      {txs.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">📖</p>
          <p className="mt-3">還沒有任何紀錄</p>
        </div>
      )}
      <div className="grid gap-2">
        {txs.map((tx) => {
          const time = new Date(tx.created_at).toLocaleString("zh-TW", {
            month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          return (
            <div key={tx.id} className="card flex items-center gap-3">
              <span className="text-2xl">{tx.delta > 0 ? "⭐" : "🛒"}</span>
              <div className="flex-1">
                <p className="text-sm font-semibold">{reasonLabel(tx.reason)}</p>
                <p className="text-xs text-slate-500">{time} · 餘額 {tx.balance_after}</p>
              </div>
              <span className={`font-bold ${tx.delta > 0 ? "text-green-400" : "text-nebula-pink"}`}>
                {tx.delta > 0 ? "+" : ""}{tx.delta}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
