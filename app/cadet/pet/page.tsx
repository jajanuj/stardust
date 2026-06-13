"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getCadetToken } from "@/lib/cadetSession";

interface Pet {
  id: string;
  species: string;
  name: string | null;
  exp: number;
  stage: number;
}

const STAGE_INFO = [
  { label: "星塵蛋", icon: "🥚", minExp: 0, maxExp: 50 },
  { label: "幼體", icon: "🐣", minExp: 50, maxExp: 150 },
  { label: "成體", icon: "🌟", minExp: 150, maxExp: 400 },
  { label: "進化體", icon: "✨", minExp: 400, maxExp: 1000 },
  { label: "最終形態", icon: "🌌", minExp: 1000, maxExp: Infinity },
];

export default function PetPage() {
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const token = getCadetToken();
      if (!token) { router.replace("/login/cadet"); return; }

      const res = await fetch("/api/cadet/pet", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { setLoading(false); return; }
      const body = await res.json();
      setPet(body.pet ?? null);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  if (!pet) {
    return (
      <div className="flex min-h-[60dvh] flex-col items-center justify-center gap-4 text-center">
        <p className="text-6xl">🥚</p>
        <h1 className="text-xl font-bold">還沒有寵物</h1>
        <p className="text-sm text-slate-400">完成任務獲得星塵後，寵物會自動誕生！</p>
      </div>
    );
  }

  const stage = STAGE_INFO[Math.min(pet.stage, STAGE_INFO.length - 1)];
  const next = STAGE_INFO[Math.min(pet.stage + 1, STAGE_INFO.length - 1)];
  const expInStage = pet.exp - stage.minExp;
  const expNeeded = next.minExp - stage.minExp;
  const pct = stage.maxExp === Infinity ? 100 : Math.min(100, Math.round((expInStage / expNeeded) * 100));

  return (
    <div className="flex flex-col items-center gap-6 text-center">
      <div>
        <h1 className="text-2xl font-bold">我的寵物 🐾</h1>
        <p className="text-sm text-slate-400">{pet.name ?? "星塵寵物"}</p>
      </div>

      <div
        className="relative flex h-48 w-48 items-center justify-center rounded-full"
        style={{ background: "radial-gradient(circle, rgba(124,92,255,0.3), transparent 70%)" }}
      >
        <span className="animate-bounce text-8xl">{stage.icon}</span>
      </div>

      <div className="w-full max-w-xs">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold">{stage.label}</span>
          <span className="text-slate-400">EXP {pet.exp}</span>
        </div>
        <div className="h-4 overflow-hidden rounded-full bg-space-700">
          <div
            className="h-full rounded-full bg-gradient-to-r from-nebula-purple to-nebula-cyan transition-all"
            style={{ width: `${pct}%` }}
          />
        </div>
        {pet.stage < STAGE_INFO.length - 1 && (
          <p className="mt-2 text-xs text-slate-500">
            距離「{next.label}」還需 {Math.max(0, next.minExp - pet.exp)} EXP
          </p>
        )}
        {pet.stage >= STAGE_INFO.length - 1 && (
          <p className="mt-2 text-xs text-stardust">已達最終形態！✨</p>
        )}
      </div>

      <div className="w-full max-w-xs">
        <p className="mb-3 text-sm font-semibold text-slate-400">成長路徑</p>
        <div className="flex justify-between">
          {STAGE_INFO.slice(0, 5).map((s, i) => (
            <div key={i} className={`flex flex-col items-center gap-1 ${i <= pet.stage ? "opacity-100" : "opacity-30"}`}>
              <span className="text-2xl">{s.icon}</span>
              <span className="text-xs">{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
