"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Redemption {
  id: string;
  coins_spent: number;
  status: string;
  redeemed_at: string;
  rewards: { title: string } | null;
  children: { name: string; avatar: string } | null;
}

export default function FulfillPage() {
  const router = useRouter();
  const [items, setItems] = useState<Redemption[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    setUserId(user.id);
    const { data: fm } = await supabase.from("family_members").select("family_id").eq("user_id", user.id).single();
    if (!fm) { setLoading(false); return; }
    const { data } = await supabase
      .from("redemptions")
      .select("id,coins_spent,status,redeemed_at,rewards(title),children(name,avatar)")
      .eq("family_id", fm.family_id)
      .eq("status", "fulfilled")
      .order("redeemed_at", { ascending: false });
    setItems((data as unknown as Redemption[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function markUsed(id: string) {
    if (acting) return;
    setActing(id);
    await fetch("/api/rewards/fulfill", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId: id, fulfillerId: userId }),
    });
    setActing(null);
    load();
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">待兌現清單 🎯</h1>
        <p className="text-sm text-slate-400">{items.length} 項待兌現</p>
      </div>
      {items.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">🎯</p>
          <p className="mt-3">目前沒有待兌現的獎勵</p>
        </div>
      )}
      <div className="grid gap-3">
        {items.map((item) => {
          const time = new Date(item.redeemed_at).toLocaleString("zh-TW", {
            month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          return (
            <div key={item.id} className="card flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-semibold">{item.rewards?.title ?? "（獎勵）"}</p>
                <p className="text-xs text-slate-400">{item.children?.avatar} {item.children?.name} · {time}</p>
                <p className="text-xs text-stardust">⭐ {item.coins_spent} 星塵</p>
              </div>
              <button
                onClick={() => markUsed(item.id)}
                disabled={acting === item.id}
                className="btn-primary px-4 py-2 text-sm disabled:opacity-50"
              >
                {acting === item.id ? "…" : "已兌現 ✓"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
