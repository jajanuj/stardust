"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

interface Message {
  id: string;
  body: string;
  created_at: string;
  expires_at: string | null;
  child_id: string | null;
  children: { name: string; avatar: string } | null;
}

interface Child { id: string; name: string; avatar: string; }

export default function MessagesPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([]);
  const [cadets, setCadets] = useState<Child[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [body, setBody] = useState("");
  const [targetChild, setTargetChild] = useState("");
  const [sending, setSending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(""); // hours

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    setUserId(user.id);
    const { data: fm } = await supabase.from("family_members").select("family_id").eq("user_id", user.id).single();
    if (!fm) { setLoading(false); return; }
    setFamilyId(fm.family_id);
    const [{ data: msgs }, { data: kids }] = await Promise.all([
      supabase.from("commander_messages")
        .select("id,body,created_at,expires_at,child_id,children(name,avatar)")
        .eq("family_id", fm.family_id)
        .order("created_at", { ascending: false }),
      supabase.from("children").select("id,name,avatar").eq("family_id", fm.family_id).eq("is_active", true),
    ]);
    setMessages((msgs as unknown as Message[]) ?? []);
    setCadets(kids ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim() || !familyId || !userId) return;
    setSending(true);
    const expiresAt = expiresIn
      ? new Date(Date.now() + Number(expiresIn) * 3600_000).toISOString()
      : null;
    await fetch("/api/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, authorId: userId, childId: targetChild || null, body: body.trim(), expiresAt }),
    });
    setBody(""); setSending(false); load();
  }

  async function remove(id: string) {
    await fetch(`/api/messages?id=${id}`, { method: "DELETE" });
    load();
  }

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">指揮官留言 💬</h1>
        <p className="text-sm text-slate-400">留言會顯示在學員首頁</p>
      </div>

      {/* 發送表單 */}
      <form onSubmit={send} className="card mb-6 flex flex-col gap-3">
        <textarea
          value={body} onChange={(e) => setBody(e.target.value)}
          placeholder="輸入給學員的留言…"
          className="input resize-none" rows={3} maxLength={300} required
        />
        <div className="flex gap-2">
          <select value={targetChild} onChange={(e) => setTargetChild(e.target.value)} className="input flex-1 text-sm">
            <option value="">所有學員</option>
            {cadets.map((c) => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
          </select>
          <select value={expiresIn} onChange={(e) => setExpiresIn(e.target.value)} className="input flex-1 text-sm">
            <option value="">永不過期</option>
            <option value="24">24 小時</option>
            <option value="72">3 天</option>
            <option value="168">一週</option>
          </select>
        </div>
        <button type="submit" disabled={sending || !body.trim()} className="btn-primary">
          {sending ? "發送中…" : "發送留言 💬"}
        </button>
      </form>

      {messages.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          <p className="text-4xl">💬</p>
          <p className="mt-3">還沒有留言</p>
        </div>
      )}

      <div className="grid gap-3">
        {messages.map((m) => {
          const isExpired = m.expires_at && new Date(m.expires_at) < new Date();
          return (
            <div key={m.id} className={`card flex gap-3 ${isExpired ? "opacity-40" : ""}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                  {m.children ? <span>{m.children.avatar} {m.children.name}</span> : <span>所有學員</span>}
                  {isExpired && <span className="text-red-400">已過期</span>}
                  {m.expires_at && !isExpired && (
                    <span>到期: {new Date(m.expires_at).toLocaleDateString("zh-TW")}</span>
                  )}
                </div>
                <p className="text-sm">{m.body}</p>
              </div>
              <button onClick={() => remove(m.id)} className="text-slate-600 hover:text-nebula-pink text-xs">刪除</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
