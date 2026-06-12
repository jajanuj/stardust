"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const CATEGORIES = ["全部", "娛樂", "美食", "體驗", "親子", "其他"];

interface Reward {
  id: string;
  title: string;
  description: string | null;
  coin_cost: number;
  category: string | null;
  stock: number;
  is_timed: boolean;
  timer_minutes: number | null;
}

interface RedemptionSuccess {
  redemption_id: string;
  balance: number;
}

export default function ShopPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [coins, setCoins] = useState(0);
  const [childId, setChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("全部");
  const [confirming, setConfirming] = useState<Reward | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [success, setSuccess] = useState<RedemptionSuccess | null>(null);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/cadet"); return; }
    const meta = user.user_metadata;
    const cid = meta?.child_id ?? user.id;
    setChildId(cid);
    const { data: child } = await supabase.from("children").select("coins,family_id").eq("id", cid).single();
    if (!child) { setLoading(false); return; }
    setCoins(child.coins);
    const { data } = await supabase.from("rewards").select("*").eq("family_id", child.family_id).eq("is_active", true).order("coin_cost");
    setRewards(data ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function redeem() {
    if (!childId || !confirming || redeeming) return;
    setRedeeming(true);
    setError("");
    const res = await fetch("/api/rewards/redeem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rewardId: confirming.id, childId }),
    });
    setRedeeming(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "兌換失敗");
      return;
    }
    const data = await res.json();
    setCoins(data.balance);
    setSuccess({ redemption_id: data.redemption_id, balance: data.balance });
    setConfirming(null);
    load();
  }

  const filtered = category === "全部" ? rewards : rewards.filter((r) => r.category === category);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">星塵商城 🛒</h1>
        <div className="flex items-center gap-1 rounded-xl bg-space-800 px-3 py-1.5">
          <span className="text-stardust">⭐</span>
          <span className="font-bold text-stardust">{coins}</span>
        </div>
      </div>

      {/* 分類 tabs */}
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((c) => (
          <button key={c} onClick={() => setCategory(c)}
            className={`shrink-0 rounded-xl px-3 py-1.5 text-xs transition ${category === c ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
            {c}
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">🛒</p>
          <p className="mt-3">目前沒有可兌換的獎勵</p>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((r) => {
          const canAfford = coins >= r.coin_cost;
          const outOfStock = r.stock === 0;
          return (
            <div key={r.id} className={`card flex items-center gap-3 transition ${!canAfford || outOfStock ? "opacity-60" : "hover:border-stardust/30"}`}>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{r.title}</span>
                  {r.is_timed && <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-400">⏱ {r.timer_minutes}分</span>}
                  {outOfStock && <span className="rounded bg-red-900/40 px-1.5 py-0.5 text-xs text-red-400">售罄</span>}
                </div>
                {r.description && <p className="text-xs text-slate-400 line-clamp-1">{r.description}</p>}
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <span className={`font-bold ${canAfford ? "text-stardust" : "text-slate-500"}`}>⭐ {r.coin_cost}</span>
                  {r.stock > 0 && <span className="text-xs text-slate-500">剩 {r.stock}</span>}
                </div>
              </div>
              <button
                onClick={() => { setConfirming(r); setError(""); }}
                disabled={!canAfford || outOfStock}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${canAfford && !outOfStock ? "bg-stardust text-space-900 hover:brightness-110 active:scale-95" : "bg-space-700 text-slate-500"}`}
              >
                兌換
              </button>
            </div>
          );
        })}
      </div>

      {/* 確認 Modal */}
      {confirming && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4" onClick={() => { setConfirming(null); setError(""); }}>
          <div className="w-full max-w-sm rounded-2xl bg-space-800 p-6" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-1 text-lg font-bold">確認兌換</h2>
            <p className="mb-4 text-sm text-slate-400">確定要兌換這個獎勵嗎？</p>
            <div className="mb-4 rounded-xl bg-space-900 p-4">
              <p className="font-semibold">{confirming.title}</p>
              <p className="mt-2 text-sm text-slate-400">花費 <span className="text-stardust font-bold">{confirming.coin_cost}</span> 星塵</p>
              <p className="text-sm text-slate-400">兌換後剩餘 <span className="font-bold text-white">{coins - confirming.coin_cost}</span> 星塵</p>
            </div>
            {error && <p className="mb-3 text-sm text-nebula-pink">{error}</p>}
            <div className="flex gap-2">
              <button onClick={() => { setConfirming(null); setError(""); }}
                className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
              <button onClick={redeem} disabled={redeeming}
                className="btn-primary flex-1">{redeeming ? "兌換中…" : "確認兌換"}</button>
            </div>
          </div>
        </div>
      )}

      {/* 兌換成功 Modal */}
      {success && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-space-800 p-6 text-center">
            <p className="text-5xl">🎉</p>
            <h2 className="mt-3 text-xl font-bold">兌換成功！</h2>
            <p className="mt-2 text-sm text-slate-400">告訴指揮官你要兌換獎勵囉！</p>
            <p className="mt-3 text-sm">目前星塵：<span className="font-bold text-stardust">{success.balance}</span></p>
            <button onClick={() => setSuccess(null)} className="btn-primary mt-6 w-full">好的！</button>
          </div>
        </div>
      )}
    </div>
  );
}
