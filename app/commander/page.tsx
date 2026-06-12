"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

interface Summary {
  familyName: string;
  cadetCount: number;
  pendingApprovals: number;
  pendingFulfill: number;
}

export default function CommanderHome() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace("/login/commander"); return; }

      const { data: fm } = await supabase
        .from("family_members")
        .select("family_id, families(name)")
        .eq("user_id", user.id)
        .single();

      if (!fm) {
        // 尚未建立家庭，導向 onboarding
        router.replace("/signup");
        return;
      }

      const fid = fm.family_id;
      const familyName = (fm.families as unknown as { name: string })?.name ?? "我的家庭";

      const [{ count: cadetCount }, { count: pendingApprovals }, { count: pendingFulfill }] = await Promise.all([
        supabase.from("children").select("*", { count: "exact", head: true }).eq("family_id", fid).eq("is_active", true),
        supabase.from("task_completions").select("*", { count: "exact", head: true }).eq("family_id", fid).eq("status", "pending"),
        supabase.from("redemptions").select("*", { count: "exact", head: true }).eq("family_id", fid).eq("status", "fulfilled"),
      ]);

      setSummary({ familyName, cadetCount: cadetCount ?? 0, pendingApprovals: pendingApprovals ?? 0, pendingFulfill: pendingFulfill ?? 0 });
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;
  if (!summary) return null;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">指揮中心 🛰️</h1>
        <p className="text-sm text-slate-400">{summary.familyName}</p>
      </div>

      {/* 快速狀態 */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="學員" value={summary.cadetCount} icon="🧑‍🚀" href="/commander/cadets" />
        <StatCard label="待審核" value={summary.pendingApprovals} icon="✅" href="/commander/approvals" alert={summary.pendingApprovals > 0} />
        <StatCard label="待兌現" value={summary.pendingFulfill} icon="🎯" href="/commander/fulfill" alert={summary.pendingFulfill > 0} />
      </div>

      {/* 快捷連結 */}
      <div className="grid gap-3">
        <Link href="/commander/tasks" className="card flex items-center gap-4 hover:border-nebula-purple/40 transition">
          <span className="text-3xl">📋</span>
          <div>
            <p className="font-semibold">任務管理</p>
            <p className="text-xs text-slate-400">建立與管理學員任務</p>
          </div>
          <span className="ml-auto text-slate-600">›</span>
        </Link>
        <Link href="/commander/rewards" className="card flex items-center gap-4 hover:border-nebula-purple/40 transition">
          <span className="text-3xl">🎁</span>
          <div>
            <p className="font-semibold">獎勵設定</p>
            <p className="text-xs text-slate-400">建立可兌換的獎勵商品</p>
          </div>
          <span className="ml-auto text-slate-600">›</span>
        </Link>
        <Link href="/commander/cadets" className="card flex items-center gap-4 hover:border-nebula-purple/40 transition">
          <span className="text-3xl">🧑‍🚀</span>
          <div>
            <p className="font-semibold">學員管理</p>
            <p className="text-xs text-slate-400">管理學員帳號與 PIN</p>
          </div>
          <span className="ml-auto text-slate-600">›</span>
        </Link>
        <Link href="/commander/stats" className="card flex items-center gap-4 hover:border-nebula-purple/40 transition">
          <span className="text-3xl">📊</span>
          <div>
            <p className="font-semibold">統計報表</p>
            <p className="text-xs text-slate-400">近 7/30 天星塵活動趨勢</p>
          </div>
          <span className="ml-auto text-slate-600">›</span>
        </Link>
        <ExportCard />
      </div>
    </div>
  );
}

function ExportCard() {
  const [exporting, setExporting] = useState(false);

  async function doExport(format: "json" | "csv") {
    setExporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token ?? "";
      const res = await fetch(`/api/export?format=${format}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) { alert("匯出失敗，請稍後再試"); return; }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `starduty-export-${new Date().toISOString().slice(0, 10)}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4 mb-3">
        <span className="text-3xl">💾</span>
        <div>
          <p className="font-semibold">資料匯出</p>
          <p className="text-xs text-slate-400">備份家庭所有紀錄</p>
        </div>
      </div>
      <div className="flex gap-2">
        <button onClick={() => doExport("json")} disabled={exporting}
          className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-slate-300 hover:bg-space-700 transition">
          {exporting ? "匯出中…" : "JSON 完整備份"}
        </button>
        <button onClick={() => doExport("csv")} disabled={exporting}
          className="flex-1 rounded-xl border border-white/10 py-2 text-xs text-slate-300 hover:bg-space-700 transition">
          CSV 流水帳
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, href, alert }: { label: string; value: number; icon: string; href: string; alert?: boolean }) {
  return (
    <Link href={href} className={`card flex flex-col items-center gap-1 py-4 text-center transition hover:border-nebula-purple/40 ${alert ? "border-nebula-pink/40" : ""}`}>
      <span className="text-2xl">{icon}</span>
      <span className={`text-2xl font-black ${alert ? "text-nebula-pink" : "text-white"}`}>{value}</span>
      <span className="text-xs text-slate-400">{label}</span>
    </Link>
  );
}
