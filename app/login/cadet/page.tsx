"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveCadetSession } from "@/lib/cadetSession";

// 只留後 6 碼：去掉 KID- 前綴、去掉非英數、轉大寫
function normalizeKidSuffix(v: string): string {
  return v.toUpperCase().replace(/^KID-?/, "").replace(/[^A-Z0-9]/g, "").slice(0, 6);
}

export default function CadetLogin() {
  const router = useRouter();
  const [suffix, setSuffix] = useState("");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/kids/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kidCode: `KID-${suffix}`, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "登入失敗");
        return;
      }
      // 直接存 localStorage，不走 Supabase session（避免 autoRefreshToken 清除）
      saveCadetSession(data.access_token, data.child);
      router.push("/cadet");
    } catch {
      setError("網路連線失敗，請再試一次");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <span className="text-5xl">🧑‍🚀</span>
        <h1 className="mt-3 text-2xl font-bold">學員登入</h1>
        <p className="mt-1 text-sm text-slate-400">輸入指揮官給你的 KID 代碼</p>
      </div>

      <form onSubmit={handleLogin} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          KID 代碼
          <div className="flex items-center rounded-lg border border-white/10 bg-space-700 px-4 py-3 focus-within:border-stardust/50">
            <span className="select-none font-mono font-bold tracking-widest text-stardust">KID-</span>
            <input
              value={suffix}
              onChange={(e) => setSuffix(normalizeKidSuffix(e.target.value))}
              placeholder="XXXXXX"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck={false}
              aria-label="KID 代碼後六碼"
              className="ml-1 w-full flex-1 bg-transparent tracking-widest outline-none placeholder:text-slate-500"
              required
            />
          </div>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          PIN（如果有設定）
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            type="password"
            inputMode="numeric"
            placeholder="••••"
            className="rounded-lg border border-white/10 bg-space-700 px-4 py-3 tracking-widest"
          />
        </label>

        {error && <p className="text-sm text-nebula-pink">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "登入中…" : "出發 🚀"}
        </button>
      </form>
    </main>
  );
}
