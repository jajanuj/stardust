"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { getCadetToken, getCadetInfo } from "@/lib/cadetSession";

interface HomeInfo {
  name: string;
  avatar: string;
  coins: number;
  todayDone: number;
  todayTotal: number;
}

export default function CadetHome() {
  const router = useRouter();
  const [info, setInfo] = useState<HomeInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getCadetToken();
      if (!token) { router.replace("/login/cadet"); return; }

      // 先用 localStorage 快速顯示基本資訊
      const cached = getCadetInfo();
      if (cached) {
        setInfo({ name: cached.name, avatar: cached.avatar, coins: cached.coins, todayDone: 0, todayTotal: 0 });
      }

      const res = await fetch("/api/cadet/home", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoading(false); return; }

      const data = await res.json();
      setInfo(data);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading && !info) return <div className="py-20 text-center text-slate-500">載入中…</div>;
  if (!info) return null;

  const pct = info.todayTotal > 0 ? Math.round((info.todayDone / info.todayTotal) * 100) : 100;

  return (
    <div>
      <div className="mb-6 flex items-center gap-4">
        <span className="text-5xl">{info.avatar}</span>
        <div>
          <p className="text-slate-400 text-sm">歡迎回來，</p>
          <p className="text-2xl font-bold">{info.name} 學員！</p>
        </div>
      </div>

      <div className="card mb-4 flex items-center gap-4"
        style={{ background: "linear-gradient(135deg, rgba(124,92,255,0.2), rgba(74,217,255,0.1))" }}>
        <span className="text-4xl">⭐</span>
        <div>
          <p className="text-xs text-slate-400">我的星塵</p>
          <p className="text-4xl font-black text-stardust-glow">{info.coins}</p>
        </div>
        <Link href="/cadet/shop" className="ml-auto rounded-xl bg-nebula-purple px-4 py-2 text-sm font-semibold">
          去商城
        </Link>
      </div>

      <div className="card mb-4">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">今日任務進度</span>
          <span className="text-slate-400">{info.todayDone} / {info.todayTotal}</span>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-space-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-nebula-purple to-nebula-cyan transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pct === 100 && info.todayTotal > 0 && (
          <p className="mt-2 text-center text-xs text-stardust">🎉 今日任務全部完成！太棒了！</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Link href="/cadet/tasks" className="card flex flex-col items-center gap-2 py-5 text-center hover:border-nebula-purple/40 transition">
          <span className="text-3xl">📋</span>
          <span className="text-sm font-semibold">查看任務</span>
        </Link>
        <Link href="/cadet/shop" className="card flex flex-col items-center gap-2 py-5 text-center hover:border-stardust/40 transition">
          <span className="text-3xl">🛒</span>
          <span className="text-sm font-semibold">星塵商城</span>
        </Link>
        <Link href="/cadet/wishlist" className="card flex flex-col items-center gap-2 py-5 text-center hover:border-nebula-cyan/40 transition">
          <span className="text-3xl">💫</span>
          <span className="text-sm font-semibold">心願清單</span>
        </Link>
        <Link href="/cadet/history" className="card flex flex-col items-center gap-2 py-5 text-center hover:border-white/20 transition">
          <span className="text-3xl">📖</span>
          <span className="text-sm font-semibold">我的歷程</span>
        </Link>
      </div>
    </div>
  );
}
