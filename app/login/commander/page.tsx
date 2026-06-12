"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function CommanderLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email 或密碼錯誤");
      return;
    }
    router.push("/commander");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6">
      <div className="text-center">
        <span className="text-5xl">🛰️</span>
        <h1 className="mt-3 text-2xl font-bold">指揮官登入</h1>
        <p className="mt-1 text-sm text-slate-400">管理任務、獎勵與學員</p>
      </div>

      <form onSubmit={handleLogin} className="card flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="rounded-lg border border-white/10 bg-space-700 px-4 py-3"
            required
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          密碼
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            className="rounded-lg border border-white/10 bg-space-700 px-4 py-3"
            required
          />
        </label>

        {error && <p className="text-sm text-nebula-pink">{error}</p>}

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? "登入中…" : "進入指揮中心"}
        </button>
      </form>
    </main>
  );
}
