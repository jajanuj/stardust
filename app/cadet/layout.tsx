"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { clearCadetSession, getCadetToken } from "@/lib/cadetSession";

const NAV = [
  { href: "/cadet", label: "首頁", icon: "🏠", exact: true },
  { href: "/cadet/tasks", label: "任務", icon: "📋" },
  { href: "/cadet/shop", label: "商城", icon: "🛒" },
  { href: "/cadet/pet", label: "寵物", icon: "🐾" },
  { href: "/cadet/history", label: "歷程", icon: "📖" },
];

export default function CadetLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const token = getCadetToken();
      if (!token) return;
      const res = await fetch("/api/cadet/notifications", {
        headers: { Authorization: `Bearer ${token}` },
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
      <header className="sticky top-0 z-10 border-b border-white/10 bg-space-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 py-3">
          <span className="font-black text-stardust-glow">StarDuty</span>
          <div className="flex items-center gap-2">
            <Link
              href="/cadet/notifications"
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
              onClick={() => {
                clearCadetSession();
                router.push("/");
              }}
              className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              登出
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">{children}</main>

      <nav className="sticky bottom-0 border-t border-white/10 bg-space-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-md justify-around px-2 py-2">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 rounded-xl px-3 py-2 text-xs transition ${
                isActive(item.href, item.exact)
                  ? "bg-stardust/20 text-stardust"
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
