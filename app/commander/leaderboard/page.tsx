"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Child { id: string; name: string; avatar: string; coins: number; }

export default function LeaderboardPage() {
  const router = useRouter();
  const [cadets, setCadets] = useState<Child[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login/commander"); return; }
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace("/login/commander"); return; }

      const res = await fetch("/api/commander/leaderboard", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const body = await res.json();
      setCadets(body.cadets ?? []);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  const MEDALS = ["🥇", "🥈", "🥉"];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">星塵排行榜 🏆</h1>
        <p className="text-sm text-slate-400">家庭星塵累積排名</p>
      </div>

      {cadets.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">🏆</p>
          <p className="mt-3">還沒有學員</p>
        </div>
      )}

      <div className="grid gap-3">
        {cadets.map((c, i) => (
          <div key={c.id} className={`card flex items-center gap-4 ${i === 0 ? "border-stardust/40" : ""}`}
            style={i === 0 ? { background: "linear-gradient(135deg, rgba(255,213,74,0.1), transparent)" } : undefined}>
            <span className="text-3xl w-10 text-center">{MEDALS[i] ?? `${i + 1}`}</span>
            <span className="text-3xl">{c.avatar}</span>
            <span className="flex-1 font-semibold">{c.name}</span>
            <div className="text-right">
              <p className="font-black text-xl text-stardust">{c.coins}</p>
              <p className="text-xs text-slate-500">星塵</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
