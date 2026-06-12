"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface WishItem {
  id: string;
  rewards: {
    id: string;
    title: string;
    description: string | null;
    coin_cost: number;
    is_timed: boolean;
    timer_minutes: number | null;
  } | null;
}

export default function WishlistPage() {
  const router = useRouter();
  const [wishes, setWishes] = useState<WishItem[]>([]);
  const [coins, setCoins] = useState(0);
  const [childId, setChildId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/cadet"); return; }
    const meta = user.user_metadata;
    const cid = meta?.child_id ?? user.id;
    setChildId(cid);
    const { data: child } = await supabase.from("children").select("coins").eq("id", cid).single();
    setCoins(child?.coins ?? 0);
    const { data } = await supabase
      .from("wishlists")
      .select("id,rewards(id,title,description,coin_cost,is_timed,timer_minutes)")
      .eq("child_id", cid)
      .order("created_at", { ascending: false });
    setWishes((data as unknown as WishItem[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function removeWish(rewardId: string) {
    if (!childId || removing) return;
    setRemoving(rewardId);
    await fetch("/api/wishlist/toggle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId, rewardId }),
    });
    setRemoving(null);
    load();
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">心願清單 💫</h1>
        <div className="flex items-center gap-1 rounded-xl bg-space-800 px-3 py-1.5">
          <span className="text-stardust">⭐</span>
          <span className="font-bold text-stardust">{coins}</span>
        </div>
      </div>

      {wishes.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">💫</p>
          <p className="mt-3">心願清單是空的</p>
          <Link href="/cadet/shop" className="mt-4 block text-sm text-nebula-cyan underline">去商城看看</Link>
        </div>
      )}

      <div className="grid gap-3">
        {wishes.map((w) => {
          const r = w.rewards;
          if (!r) return null;
          const diff = r.coin_cost - coins;
          const canAfford = diff <= 0;
          const pct = Math.min(100, Math.round((coins / r.coin_cost) * 100));
          return (
            <div key={w.id} className="card flex flex-col gap-3">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{r.title}</p>
                  {r.description && <p className="text-xs text-slate-400 line-clamp-1">{r.description}</p>}
                  <p className="mt-1 text-sm font-bold text-stardust">⭐ {r.coin_cost}</p>
                </div>
                <button
                  onClick={() => removeWish(r.id)}
                  disabled={removing === r.id}
                  className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  移除
                </button>
              </div>

              {/* 進度條 */}
              <div>
                <div className="mb-1 flex justify-between text-xs text-slate-500">
                  <span>{canAfford ? "🎉 可以兌換了！" : `還差 ${diff} 星塵`}</span>
                  <span>{pct}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-space-700">
                  <div
                    className={`h-full rounded-full transition-all ${canAfford ? "bg-stardust" : "bg-nebula-purple"}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>

              {canAfford && (
                <Link href="/cadet/shop" className="rounded-xl bg-stardust py-2 text-center text-sm font-bold text-space-900">
                  立即前往兌換 →
                </Link>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
