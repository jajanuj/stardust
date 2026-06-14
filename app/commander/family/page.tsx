"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Commander {
  userId: string;
  email: string;
  role: string;
  isMe: boolean;
}

export default function FamilyPage() {
  const router = useRouter();
  const [familyName, setFamilyName] = useState("");
  const [commanders, setCommanders] = useState<Commander[]>([]);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function token(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token ?? null;
  }

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    const t = await token();
    if (!t) { router.replace("/login/commander"); return; }
    const res = await fetch("/api/commander/family", { headers: { Authorization: `Bearer ${t}` } });
    if (!res.ok) { setLoading(false); return; }
    const body = await res.json();
    setFamilyName(body.familyName ?? "");
    setCommanders(body.commanders ?? []);
    setInviteCode(body.inviteCode ?? null);
    setExpiresAt(body.inviteExpiresAt ?? null);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function generate() {
    setBusy(true);
    const t = await token();
    if (!t) return;
    const res = await fetch("/api/commander/family", { method: "POST", headers: { Authorization: `Bearer ${t}` } });
    setBusy(false);
    if (!res.ok) return;
    const body = await res.json();
    setInviteCode(body.inviteCode);
    setExpiresAt(body.inviteExpiresAt);
  }

  async function revoke() {
    setBusy(true);
    const t = await token();
    if (!t) return;
    await fetch("/api/commander/family", { method: "DELETE", headers: { Authorization: `Bearer ${t}` } });
    setBusy(false);
    setInviteCode(null);
    setExpiresAt(null);
  }

  async function copyCode() {
    if (!inviteCode) return;
    try { await navigator.clipboard.writeText(inviteCode); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch {}
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  const expLabel = expiresAt
    ? new Date(expiresAt).toLocaleDateString("zh-TW", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
    : "";

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">家庭與指揮官 👨‍👩‍👧</h1>
        <p className="text-sm text-slate-400">{familyName}</p>
      </div>

      {/* 指揮官清單 */}
      <section className="mb-6">
        <p className="mb-2 text-sm font-semibold text-slate-400">指揮官（{commanders.length}）</p>
        <div className="grid gap-2">
          {commanders.map((c) => (
            <div key={c.userId} className="card flex items-center gap-3">
              <span className="text-2xl">🛰️</span>
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-semibold">{c.email}</p>
                <p className="text-xs text-slate-500">{c.role === "viewer" ? "檢視者" : "指揮官"}</p>
              </div>
              {c.isMe && <span className="rounded bg-nebula-purple/30 px-2 py-0.5 text-xs text-nebula-purple">你</span>}
            </div>
          ))}
        </div>
      </section>

      {/* 邀請另一位家長 */}
      <section>
        <p className="mb-2 text-sm font-semibold text-slate-400">邀請另一位家長</p>
        <div className="card">
          {inviteCode ? (
            <>
              <p className="text-xs text-slate-400">把這組邀請碼給另一位家長，請他到註冊頁勾選「加入現有家庭」並輸入：</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="flex-1 rounded-xl bg-space-900 px-4 py-3 text-center font-mono text-2xl font-black tracking-[0.2em] text-stardust-glow">
                  {inviteCode}
                </span>
                <button onClick={copyCode} className="rounded-xl border border-white/10 px-3 py-3 text-sm hover:bg-space-700">
                  {copied ? "✓" : "複製"}
                </button>
              </div>
              <p className="mt-2 text-xs text-slate-500">有效至 {expLabel}</p>
              <button onClick={revoke} disabled={busy}
                className="mt-4 w-full rounded-xl border border-nebula-pink/40 py-2.5 text-sm text-nebula-pink hover:bg-nebula-pink/10">
                停用邀請碼
              </button>
            </>
          ) : (
            <>
              <p className="text-xs text-slate-400">產生一組邀請碼（7 天有效），讓配偶或另一位家長加入同一個家庭、共同管理。</p>
              <button onClick={generate} disabled={busy} className="btn-primary mt-3 w-full">
                {busy ? "產生中…" : "＋ 產生邀請碼"}
              </button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
