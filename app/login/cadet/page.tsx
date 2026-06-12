"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { setCadetSession } from "@/lib/supabase/client";

export default function CadetLogin() {
  const router = useRouter();
  const [kidCode, setKidCode] = useState("");
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
        body: JSON.stringify({ kidCode, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.message ?? "登入失敗");
        return;
      }
      await setCadetSession(data.access_token);
      // 暫存學員基本資料供首頁顯示
      sessionStorage.setItem("cadet", JSON.stringify(data.child));
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
          <input
            value={kidCode}
            onChange={(e) => setKidCode(e.target.value)}
            placeholder="KID-XXXXXX"
            autoCapitalize="characters"
            className="rounded-lg border border-white/10 bg-space-700 px-4 py-3 tracking-widest"
            required
          />
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
