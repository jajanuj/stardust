"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface PendingItem {
  id: string;
  coins_earned: number;
  completed_at: string;
  tasks: { title: string; icon: string | null } | null;
  children: { name: string; avatar: string } | null;
}

export default function ApprovalsPage() {
  const router = useRouter();
  const [items, setItems] = useState<PendingItem[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    // getUser() triggers token refresh; getSession() then returns the fresh token
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login/commander"); return; }
    setUserId(session.user.id);

    const res = await fetch("/api/commander/approvals", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const body = await res.json();
    setItems((body.items as PendingItem[]) ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function approve(id: string) {
    if (!userId || acting) return;
    setActing(id);
    await fetch("/api/approvals/approve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId: id, approverId: userId }),
    });
    setActing(null);
    load();
  }

  async function reject(id: string) {
    if (!userId || acting) return;
    setActing(id);
    await fetch("/api/approvals/reject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completionId: id, approverId: userId }),
    });
    setActing(null);
    load();
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">待審核 ✅</h1>
        <p className="text-sm text-slate-400">{items.length} 項待確認</p>
      </div>

      {items.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">✅</p>
          <p className="mt-3">目前沒有待審核的任務</p>
        </div>
      )}

      <div className="grid gap-3">
        {items.map((item) => {
          const task = item.tasks;
          const child = item.children;
          const time = new Date(item.completed_at).toLocaleString("zh-TW", {
            month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit",
          });
          return (
            <div key={item.id} className="card flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-3xl">{task?.icon ?? "📋"}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold">{task?.title ?? "（任務）"}</p>
                  <p className="text-xs text-slate-400">
                    {child?.avatar} {child?.name} · {time}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-stardust">+{item.coins_earned}</p>
                  <p className="text-xs text-slate-500">星塵</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => reject(item.id)}
                  disabled={acting === item.id}
                  className="flex-1 rounded-xl border border-nebula-pink/40 py-2 text-sm text-nebula-pink hover:bg-nebula-pink/10 disabled:opacity-50"
                >
                  駁回
                </button>
                <button
                  onClick={() => approve(item.id)}
                  disabled={acting === item.id}
                  className="btn-primary flex-1 py-2 text-sm"
                >
                  {acting === item.id ? "處理中…" : "核可 ✓"}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
