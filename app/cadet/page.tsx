"use client";

import { useEffect, useState } from "react";

interface Cadet {
  id: string;
  name: string;
  avatar?: string;
  coins: number;
}

export default function CadetHome() {
  const [cadet, setCadet] = useState<Cadet | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("cadet");
    if (raw) setCadet(JSON.parse(raw));
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-8">
      <header className="card flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-4xl">{cadet?.avatar ?? "🧑‍🚀"}</span>
          <div>
            <p className="text-sm text-slate-400">學員</p>
            <p className="text-lg font-bold">{cadet?.name ?? "—"}</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-400">星塵</p>
          <p className="text-2xl font-black text-stardust-glow">
            {cadet?.coins ?? 0} ✨
          </p>
        </div>
      </header>

      <section className="mt-6">
        <h2 className="mb-2 text-lg font-semibold">今日任務</h2>
        <p className="card text-sm text-slate-400">
          （Phase 1 任務列表開發中）
        </p>
      </section>
    </main>
  );
}
