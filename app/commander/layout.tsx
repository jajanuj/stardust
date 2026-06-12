"use client";

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

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Top bar */}
      <header className="sticky top-0 z-10 border-b border-white/10 bg-space-900/90 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3">
          <span className="font-black text-stardust-glow">StarDuty</span>
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
