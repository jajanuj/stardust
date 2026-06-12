"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Achievement {
  id: string;
  code: string;
  title: string;
  description: string | null;
  icon: string;
  unlocked_at: string | null;
}

const DEFAULT_ACHIEVEMENTS: Omit<Achievement, "unlocked_at">[] = [
  { id: "first_task", code: "first_task", title: "初出茅廬", description: "完成第一個任務", icon: "🚀" },
  { id: "10_tasks", code: "10_tasks", title: "任務達人", description: "累計完成 10 個任務", icon: "🏆" },
  { id: "50_tasks", code: "50_tasks", title: "任務大師", description: "累計完成 50 個任務", icon: "🌟" },
  { id: "100_coins", code: "100_coins", title: "星塵收藏家", description: "累計獲得 100 顆星塵", icon: "💰" },
  { id: "first_redeem", code: "first_redeem", title: "初次兌換", description: "第一次兌換獎勵", icon: "🎁" },
  { id: "7day_streak", code: "7day_streak", title: "連續七天", description: "連續 7 天完成任務", icon: "🔥" },
  { id: "pet_evolved", code: "pet_evolved", title: "寵物進化", description: "讓寵物進化一次", icon: "🐣" },
  { id: "wishlist_reached", code: "wishlist_reached", title: "心願成真", description: "心願清單中的獎勵達標", icon: "💫" },
];

export default function AchievementsPage() {
  const router = useRouter();
  const [unlockedIds, setUnlockedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login/cadet"); return; }
      const meta = user.user_metadata;
      const cid = meta?.child_id ?? user.id;
      const { data } = await supabase
        .from("child_achievements")
        .select("achievements(code)")
        .eq("child_id", cid);
      const codes = new Set((data ?? []).map((r: { achievements: { code: string }[] | { code: string } | null }) => {
        const ach = r.achievements;
        if (!ach) return "";
        if (Array.isArray(ach)) return ach[0]?.code ?? "";
        return (ach as { code: string }).code;
      }));
      setUnlockedIds(codes);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  const unlocked = DEFAULT_ACHIEVEMENTS.filter((a) => unlockedIds.has(a.code));
  const locked = DEFAULT_ACHIEVEMENTS.filter((a) => !unlockedIds.has(a.code));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">我的成就 🏅</h1>
        <p className="text-sm text-slate-400">{unlocked.length} / {DEFAULT_ACHIEVEMENTS.length} 已解鎖</p>
      </div>

      {unlocked.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-sm font-semibold text-stardust">已解鎖 ✨</p>
          <div className="grid grid-cols-2 gap-3">
            {unlocked.map((a) => (
              <div key={a.id} className="card flex flex-col items-center gap-2 py-5 text-center border-stardust/30">
                <span className="text-4xl">{a.icon}</span>
                <span className="font-semibold text-sm">{a.title}</span>
                <span className="text-xs text-slate-400">{a.description}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <p className="mb-3 text-sm font-semibold text-slate-500">尚未解鎖</p>
        <div className="grid grid-cols-2 gap-3">
          {locked.map((a) => (
            <div key={a.id} className="card flex flex-col items-center gap-2 py-5 text-center opacity-40">
              <span className="text-4xl grayscale">{a.icon}</span>
              <span className="font-semibold text-sm">{a.title}</span>
              <span className="text-xs text-slate-500">{a.description}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
