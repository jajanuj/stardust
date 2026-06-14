"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCadetToken } from "@/lib/cadetSession";

interface Notif {
  id: string;
  type: string;
  title: string;
  body: string | null;
  is_read: boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, string> = {
  approved: "🎉",
  rejected: "↩️",
  timer_done: "⏰",
  wish_reached: "✨",
  message: "💬",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "剛剛";
  if (m < 60) return `${m} 分鐘前`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} 小時前`;
  const d = Math.floor(h / 24);
  return `${d} 天前`;
}

export default function CadetNotificationsPage() {
  const router = useRouter();
  const [items, setItems] = useState<Notif[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const token = getCadetToken();
    if (!token) { router.replace("/login/cadet"); return; }

    const res = await fetch("/api/cadet/notifications", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const body = await res.json();
    setItems(body.notifications ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function markAllRead() {
    if (items.every((n) => n.is_read)) return;
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    const token = getCadetToken();
    if (!token) return;
    await fetch("/api/cadet/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({}),
    });
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  const unread = items.filter((n) => !n.is_read).length;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">通知 🔔</h1>
          <p className="text-sm text-slate-400">{unread > 0 ? `${unread} 則未讀` : "全部已讀"}</p>
        </div>
        {unread > 0 && (
          <button onClick={markAllRead} className="rounded-xl border border-white/10 bg-space-700 px-3 py-2 text-sm hover:bg-space-600">
            全部已讀
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">🔔</p>
          <p className="mt-3">目前沒有通知</p>
        </div>
      ) : (
        <div className="grid gap-2">
          {items.map((n) => (
            <div key={n.id}
              className={`card flex items-start gap-3 ${n.is_read ? "opacity-60" : "border-stardust/40"}`}>
              <span className="mt-0.5 text-2xl">{TYPE_ICON[n.type] ?? "🔔"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!n.is_read && <span className="h-2 w-2 shrink-0 rounded-full bg-stardust" />}
                  <span className="font-semibold">{n.title}</span>
                </div>
                {n.body && <p className="mt-1 text-sm text-slate-400">{n.body}</p>}
                <p className="mt-1 text-xs text-slate-500">{relTime(n.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
