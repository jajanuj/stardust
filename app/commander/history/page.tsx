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
  children: { name: string; avatar: string } | null;
}

export default function HistoryPage() {
  const router = useRouter();
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "task_complete" | "redeem" | "manual_adjust">("all");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login/commander"); return; }

    const res = await fetch("/api/commander/history", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const body = await res.json();
    setTxs((body.transactions as TxItem[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function reasonLabel(r: string) {
    const map: Record<string, string> = {
      task_complete: "完成任務", redeem: "兌換獎勵", refund: "退款",
      manual_adjust: "手動調整", approval: "審核通過",
    };
    return map[r] ?? r;
  }

  const filtered = filter === "all" ? txs : txs.filter((t) => t.reason === filter);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">歷史紀錄 📊</h1>
        <p className="text-sm text-slate-400">全家星塵異動流水帳</p>
      </div>

      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {([["all", "全部"], ["task_complete", "任務"], ["redeem", "兌換"], ["manual_adjust", "調整"]] as const).map(([key, label]) => (
          <button key={key} onClick={() => setFilter(key)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs transition ${filter === key ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">📊</p>
          <p className="mt-3">沒有紀錄</p>
        </div>
      )}

      <div className="grid gap-2">
        {filtered.map((tx) => {
          const time = new Date(tx.created_at).toLocaleString("zh-TW", {
            month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          return (
            <div key={tx.id} className="card flex items-center gap-3">
              <span className="text-xl">{tx.delta > 0 ? "⭐" : "🛒"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-semibold">{reasonLabel(tx.reason)}</span>
                  {tx.children && <span className="text-xs text-slate-400">{tx.children.avatar} {tx.children.name}</span>}
                </div>
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
