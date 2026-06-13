"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const CATEGORIES = ["娛樂", "美食", "體驗", "親子", "其他"];
const REWARD_ICONS = ["🎮", "🍕", "🎪", "🎬", "🍦", "🎠", "🧸", "📚", "🎨", "🚴", "🏊", "🎁"];

interface Reward {
  id: string;
  title: string;
  description: string | null;
  coin_cost: number;
  category: string | null;
  stock: number;
  is_timed: boolean;
  timer_minutes: number | null;
  is_active: boolean;
}

type Modal = { type: "add" } | { type: "edit"; reward: Reward } | null;

export default function RewardsPage() {
  const router = useRouter();
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [filter, setFilter] = useState<"active" | "inactive">("active");

  const load = useCallback(async () => {
    // getUser() triggers token refresh; getSession() then returns the fresh token
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login/commander"); return; }

    const res = await fetch("/api/commander/rewards", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const body = await res.json();
    setFamilyId(body.familyId ?? null);
    setRewards(body.rewards ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function toggleActive(r: Reward) {
    await fetch(`/api/rewards/${r.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !r.is_active }),
    });
    load();
  }

  const filtered = rewards.filter((r) => r.is_active === (filter === "active"));

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">獎勵設定 🎁</h1>
          <p className="text-sm text-slate-400">{rewards.filter((r) => r.is_active).length} 個上架中</p>
        </div>
        <button onClick={() => setModal({ type: "add" })} className="btn-primary px-4 py-2 text-sm">
          + 新增獎勵
        </button>
      </div>

      <div className="mb-4 flex gap-2">
        {(["active", "inactive"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm transition ${filter === f ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
            {f === "active" ? "上架中" : "已下架"} ({rewards.filter((r) => r.is_active === (f === "active")).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          <p className="text-4xl">🎁</p>
          <p className="mt-3">{filter === "active" ? "還沒有上架的獎勵" : "沒有下架的獎勵"}</p>
          {filter === "active" && (
            <button onClick={() => setModal({ type: "add" })} className="mt-4 text-sm text-nebula-cyan underline">新增第一個獎勵</button>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((r) => (
          <div key={r.id} className="card flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{r.title}</span>
                {r.category && <span className="rounded bg-space-700 px-1.5 py-0.5 text-xs text-slate-400">{r.category}</span>}
                {r.is_timed && <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-400">⏱ {r.timer_minutes}分</span>}
              </div>
              {r.description && <p className="mt-1 text-xs text-slate-400 line-clamp-1">{r.description}</p>}
              <div className="mt-1 flex gap-3 text-xs text-slate-500">
                <span className="text-stardust">⭐ {r.coin_cost} 星塵</span>
                <span>庫存: {r.stock === -1 ? "無限" : r.stock}</span>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <button onClick={() => setModal({ type: "edit", reward: r })}
                className="rounded-lg bg-space-700 px-3 py-1.5 text-xs hover:bg-space-600">編輯</button>
              <button onClick={() => toggleActive(r)}
                className={`rounded-lg border px-3 py-1.5 text-xs ${r.is_active ? "border-nebula-pink/40 text-nebula-pink" : "border-green-500/40 text-green-400"}`}>
                {r.is_active ? "下架" : "上架"}
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === "add" && familyId && (
        <RewardFormModal familyId={familyId} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal?.type === "edit" && (
        <RewardFormModal reward={modal.reward} onClose={() => setModal(null)} onDone={load} />
      )}
    </div>
  );
}

function RewardFormModal({ familyId, reward, onClose, onDone }: {
  familyId?: string; reward?: Reward; onClose: () => void; onDone: () => void;
}) {
  const isEdit = !!reward;
  const [title, setTitle] = useState(reward?.title ?? "");
  const [description, setDescription] = useState(reward?.description ?? "");
  const [coinCost, setCoinCost] = useState(reward?.coin_cost ?? 20);
  const [category, setCategory] = useState(reward?.category ?? "");
  const [stock, setStock] = useState<number | "">(reward?.stock === -1 ? "" : (reward?.stock ?? ""));
  const [isTimed, setIsTimed] = useState(reward?.is_timed ?? false);
  const [timerMinutes, setTimerMinutes] = useState(reward?.timer_minutes ?? 30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("請輸入獎勵名稱"); return; }
    setLoading(true);
    const payload = {
      title: title.trim(), description: description.trim() || null,
      coinCost, category: category || null,
      stock: stock === "" ? -1 : Number(stock),
      isTimed, timerMinutes: isTimed ? timerMinutes : null,
    };

    if (isEdit) {
      const res = await fetch(`/api/rewards/${reward!.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
      });
      setLoading(false);
      if (!res.ok) { setError("更新失敗"); return; }
    } else {
      const res = await fetch("/api/rewards", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, familyId }),
      });
      setLoading(false);
      if (!res.ok) { setError("建立失敗"); return; }
    }
    onDone(); onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md overflow-y-auto max-h-[90dvh] rounded-t-3xl bg-space-800 p-6 sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-4 text-lg font-bold">{isEdit ? "編輯獎勵" : "新增獎勵"}</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          <label className="flex flex-col gap-1 text-sm">
            獎勵名稱 *
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" maxLength={50} required />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            說明（選填）
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="input resize-none" rows={2} />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            所需星塵
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={500} value={coinCost} onChange={(e) => setCoinCost(Number(e.target.value))} className="flex-1" />
              <input type="number" min={1} value={coinCost} onChange={(e) => setCoinCost(Number(e.target.value))}
                className="input w-20 text-center" />
            </div>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            分類
            <select value={category} onChange={(e) => setCategory(e.target.value)} className="input">
              <option value="">不分類</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-sm">
            庫存（留空 = 無限）
            <input type="number" min={0} value={stock} onChange={(e) => setStock(e.target.value === "" ? "" : Number(e.target.value))}
              className="input" placeholder="無限" />
          </label>
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <div className={`relative h-6 w-11 rounded-full transition ${isTimed ? "bg-nebula-purple" : "bg-space-700"}`}
              onClick={() => setIsTimed(!isTimed)}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${isTimed ? "left-5" : "left-0.5"}`} />
            </div>
            <span>計時型獎勵</span>
          </label>
          {isTimed && (
            <label className="flex flex-col gap-1 text-sm">
              計時分鐘數
              <input type="number" min={1} max={480} value={timerMinutes}
                onChange={(e) => setTimerMinutes(Number(e.target.value))} className="input" />
            </label>
          )}
          {error && <p className="text-sm text-nebula-pink">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "儲存中…" : isEdit ? "儲存" : "建立獎勵"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// suppress unused import warning
void REWARD_ICONS;
