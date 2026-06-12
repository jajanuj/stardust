"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Child { id: string; name: string; avatar: string; coins: number; }
interface TxRow { child_id: string; delta: number; reason: string; created_at: string; }

type Period = "week" | "month";

interface ChildStat {
  child: Child;
  earned: number;
  spent: number;
  taskCount: number;
  redeemCount: number;
}

export default function StatsPage() {
  const router = useRouter();
  const [period, setPeriod] = useState<Period>("week");
  const [cadets, setCadets] = useState<Child[]>([]);
  const [transactions, setTransactions] = useState<TxRow[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }

    const { data: fm } = await supabase.from("family_members").select("family_id").eq("user_id", user.id).single();
    if (!fm) { setLoading(false); return; }

    const since = period === "week"
      ? new Date(Date.now() - 7 * 86400_000).toISOString()
      : new Date(Date.now() - 30 * 86400_000).toISOString();

    const [{ data: cadetData }, { data: txData }] = await Promise.all([
      supabase.from("children").select("id,name,avatar,coins").eq("family_id", fm.family_id).eq("is_active", true),
      supabase.from("coin_transactions")
        .select("child_id,delta,reason,created_at")
        .eq("family_id", fm.family_id)
        .gte("created_at", since)
        .order("created_at", { ascending: true }),
    ]);

    setCadets(cadetData ?? []);
    setTransactions(txData ?? []);
    setLoading(false);
  }, [router, period]);

  useEffect(() => { load(); }, [load]);

  // Build per-cadet stats
  const stats: ChildStat[] = cadets.map((child) => {
    const txs = transactions.filter((t) => t.child_id === child.id);
    return {
      child,
      earned: txs.filter((t) => t.delta > 0).reduce((s, t) => s + t.delta, 0),
      spent: Math.abs(txs.filter((t) => t.delta < 0).reduce((s, t) => s + t.delta, 0)),
      taskCount: txs.filter((t) => t.reason === "task_complete" || t.reason === "approval").length,
      redeemCount: txs.filter((t) => t.reason === "redeem").length,
    };
  }).sort((a, b) => b.earned - a.earned);

  const totalEarned = stats.reduce((s, c) => s + c.earned, 0);
  const totalSpent = stats.reduce((s, c) => s + c.spent, 0);
  const totalTasks = stats.reduce((s, c) => s + c.taskCount, 0);
  const totalRedeems = stats.reduce((s, c) => s + c.redeemCount, 0);

  // Build daily series for sparkline
  const dayCount = period === "week" ? 7 : 30;
  const days: string[] = [];
  for (let i = dayCount - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400_000);
    days.push(d.toISOString().slice(0, 10));
  }
  const dailyEarned = days.map((day) =>
    transactions.filter((t) => t.created_at.slice(0, 10) === day && t.delta > 0)
      .reduce((s, t) => s + t.delta, 0)
  );
  const maxDaily = Math.max(...dailyEarned, 1);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">統計報表 📊</h1>
        <p className="text-sm text-slate-400">家庭星塵活動概覽</p>
      </div>

      {/* Period tabs */}
      <div className="mb-6 flex gap-2">
        {([["week", "近 7 天"], ["month", "近 30 天"]] as [Period, string][]).map(([p, label]) => (
          <button key={p} onClick={() => setPeriod(p)}
            className={`rounded-xl px-4 py-2 text-sm transition ${period === p ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
            {label}
          </button>
        ))}
      </div>

      {/* Summary cards */}
      <div className="mb-6 grid grid-cols-2 gap-3">
        <StatCard label="總獲得星塵" value={totalEarned} icon="⭐" color="text-stardust" />
        <StatCard label="總消費星塵" value={totalSpent} icon="🛒" color="text-nebula-pink" />
        <StatCard label="完成任務次數" value={totalTasks} icon="✅" color="text-green-400" />
        <StatCard label="兌換次數" value={totalRedeems} icon="🎁" color="text-nebula-cyan" />
      </div>

      {/* Sparkline chart */}
      <div className="card mb-6">
        <p className="mb-3 text-sm font-semibold text-slate-300">每日獲得星塵趨勢</p>
        <div className="flex items-end gap-0.5 h-20">
          {dailyEarned.map((val, i) => (
            <div key={i} className="group relative flex-1 flex flex-col items-center justify-end h-full">
              <div
                className="w-full rounded-t bg-nebula-purple/60 hover:bg-nebula-purple transition-all"
                style={{ height: `${Math.round((val / maxDaily) * 100)}%`, minHeight: val > 0 ? "4px" : "0" }}
              />
              {/* Tooltip on hover — shown only on desktop */}
              {val > 0 && (
                <span className="pointer-events-none absolute -top-7 hidden group-hover:block text-xs bg-space-700 px-1.5 py-0.5 rounded text-stardust whitespace-nowrap z-10">
                  {val}⭐
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="mt-1 flex justify-between text-xs text-slate-500">
          <span>{days[0]?.slice(5)}</span>
          {period === "month" && <span>{days[Math.floor(dayCount / 2)]?.slice(5)}</span>}
          <span>{days[days.length - 1]?.slice(5)}</span>
        </div>
      </div>

      {/* Per-cadet breakdown */}
      <div className="mb-3 text-sm font-semibold text-slate-300">學員排行</div>
      {stats.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          <p className="text-3xl">📊</p>
          <p className="mt-2 text-sm">這段期間還沒有活動</p>
        </div>
      )}
      <div className="grid gap-3">
        {stats.map((s, i) => {
          const earnedPct = totalEarned > 0 ? Math.round((s.earned / totalEarned) * 100) : 0;
          return (
            <div key={s.child.id} className="card">
              <div className="flex items-center gap-3 mb-3">
                <span className="text-2xl">{i === 0 && s.earned > 0 ? "🥇" : i === 1 && s.earned > 0 ? "🥈" : i === 2 && s.earned > 0 ? "🥉" : "  "}</span>
                <span className="text-xl">{s.child.avatar}</span>
                <span className="font-semibold flex-1">{s.child.name}</span>
                <span className="text-sm font-black text-stardust">{s.earned} ⭐</span>
              </div>
              {/* Progress bar (share of total earned) */}
              <div className="h-1.5 w-full rounded-full bg-space-700 mb-3">
                <div className="h-full rounded-full bg-nebula-purple transition-all" style={{ width: `${earnedPct}%` }} />
              </div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs text-slate-400">
                <div>
                  <p className="font-bold text-green-400 text-sm">+{s.earned}</p>
                  <p>獲得</p>
                </div>
                <div>
                  <p className="font-bold text-nebula-pink text-sm">-{s.spent}</p>
                  <p>消費</p>
                </div>
                <div>
                  <p className="font-bold text-slate-300 text-sm">{s.taskCount}</p>
                  <p>任務次數</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }: { label: string; value: number; icon: string; color: string }) {
  return (
    <div className="card text-center">
      <p className="text-2xl">{icon}</p>
      <p className={`text-2xl font-black mt-1 ${color}`}>{value}</p>
      <p className="text-xs text-slate-400 mt-0.5">{label}</p>
    </div>
  );
}
