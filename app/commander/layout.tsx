"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const NAV = [
  { href: "/commander", label: "首頁", icon: "🛰️", exact: true },
  { href: "/commander/cadets", label: "學員", icon: "🧑‍🚀" },
  { href: "/commander/tasks", label: "任務", icon: "📋" },
  { href: "/commander/approvals", label: "待審核", icon: "✅" },
  { href: "/commander/rewards", label: "獎勵", icon: "🎁" },
  { href: "/commander/fulfill", label: "待兌現", icon: "🎯" },
  { href: "/commander/messages", label: "留言", icon: "💬" },
  { href: "/commander/stats", label: "統計", icon: "📊" },
];

export default function CommanderLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const res = await fetch("/api/commander/notifications", {
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      if (!res.ok) return;
      const body = await res.json();
      if (!cancelled) setUnread(body.unread ?? 0);
    })();
    return () => { cancelled = true; };
  }, [pathname]);

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-space-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-black text-stardust-glow">StarDuty</span>
          <div className="flex items-center gap-2">
            <Link
              href="/commander/notifications"
              aria-label="通知"
              className="relative rounded-lg border border-white/10 px-2.5 py-1.5 text-base hover:bg-space-700"
            >
              🔔
              {unread > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-nebula-pink px-1 text-[10px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              )}
            </Link>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                router.push("/");
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-6">{children}</main>

      {/* Bottom nav */}
      <nav className="sticky bottom-0 border-t border-white/10 bg-space-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-3xl justify-around px-2 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs transition ${
                isActive(item.href, item.exact)
                  ? "bg-nebula-purple/20 text-nebula-purple"
                  : "text-slate-500 hover:text-slate-300"
              }`}
            >
              <span className="text-xl">{item.icon}</span>
              {item.label}
            </Link>
          ))}
        </div>
      </nav>
    </div>
  );
}
