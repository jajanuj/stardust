"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function CommanderHome() {
  const router = useRouter();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) {
        router.replace("/login/commander");
        return;
      }
      setEmail(data.user.email ?? null);
    });
  }, [router]);

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">指揮中心 🛰️</h1>
          <p className="text-sm text-slate-400">{email}</p>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/");
          }}
          className="rounded-lg border border-white/10 px-3 py-2 text-sm"
        >
          登出
        </button>
      </header>

      <section className="mt-6 grid gap-4">
        <p className="card text-sm text-slate-400">
          （Phase 1 學員管理、任務管理開發中）
        </p>
      </section>
    </main>
  );
}
