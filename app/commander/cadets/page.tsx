"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const AVATARS = ["🧑‍🚀", "👩‍🚀", "🦸", "🦸‍♀️", "🐱", "🐶", "🦊", "🐼", "🐸", "🦄"];

interface Child {
  id: string;
  name: string;
  avatar: string;
  kid_code: string;
  coins: number;
  is_active: boolean;
  pin_hash: string | null;
}

type Modal =
  | { type: "add" }
  | { type: "edit"; child: Child }
  | { type: "pin"; child: Child }
  | { type: "card"; child: Child }
  | { type: "coins"; child: Child }
  | null;

export default function CadetsPage() {
  const router = useRouter();
  const [cadets, setCadets] = useState<Child[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { router.replace("/login/commander"); return; }

    const res = await fetch("/api/commander/cadets", {
      headers: { Authorization: `Bearer ${session.access_token}` },
    });
    if (!res.ok) { setLoading(false); return; }
    const body = await res.json();
    setFamilyId(body.familyId ?? null);
    setCadets(body.cadets ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">學員管理 🧑‍🚀</h1>
          <p className="text-sm text-slate-400">{cadets.length} 位學員</p>
        </div>
        <button
          onClick={() => setModal({ type: "add" })}
          className="btn-primary px-4 py-2 text-sm"
        >
          + 新增學員
        </button>
      </div>

      {cadets.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          <p className="text-4xl">🧑‍🚀</p>
          <p className="mt-3">還沒有學員</p>
          <button onClick={() => setModal({ type: "add" })} className="mt-4 text-sm text-nebula-cyan underline">
            新增第一位學員
          </button>
        </div>
      )}

      <div className="grid gap-4">
        {cadets.map((c) => (
          <div key={c.id} className={`card flex items-center gap-4 ${!c.is_active ? "opacity-50" : ""}`}>
            <span className="text-4xl">{c.avatar}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold">{c.name}</span>
                {!c.is_active && (
                  <span className="rounded bg-slate-700 px-2 py-0.5 text-xs text-slate-400">停用</span>
                )}
              </div>
              <p className="font-mono text-sm text-stardust">{c.kid_code}</p>
              <p className="text-xs text-slate-400">⭐ {c.coins} 星塵 · PIN {c.pin_hash ? "已設定" : "未設定"}</p>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => setModal({ type: "card", child: c })}
                className="rounded-lg bg-space-700 px-3 py-1.5 text-xs hover:bg-space-600"
              >
                登入卡
              </button>
              <button
                onClick={() => setModal({ type: "edit", child: c })}
                className="rounded-lg bg-space-700 px-3 py-1.5 text-xs hover:bg-space-600"
              >
                編輯
              </button>
              <button
                onClick={() => setModal({ type: "pin", child: c })}
                className="rounded-lg bg-space-700 px-3 py-1.5 text-xs hover:bg-space-600"
              >
                PIN
              </button>
              <button
                onClick={() => setModal({ type: "coins", child: c })}
                className="rounded-lg border border-stardust/40 px-3 py-1.5 text-xs text-stardust hover:bg-stardust/10"
              >
                ⭐ 星塵
              </button>
            </div>
          </div>
        ))}
      </div>

      {modal?.type === "add" && familyId && (
        <AddModal familyId={familyId} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal?.type === "edit" && (
        <EditModal child={modal.child} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal?.type === "pin" && (
        <PinModal child={modal.child} onClose={() => setModal(null)} onDone={load} />
      )}
      {modal?.type === "card" && (
        <CardModal child={modal.child} onClose={() => setModal(null)} />
      )}
      {modal?.type === "coins" && (
        <CoinsModal child={modal.child} onClose={() => setModal(null)} onDone={load} />
      )}
    </div>
  );
}

/* ── 新增學員 Modal ── */
function AddModal({ familyId, onClose, onDone }: { familyId: string; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState("");
  const [avatar, setAvatar] = useState("🧑‍🚀");
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [newKid, setNewKid] = useState<{ name: string; avatar: string; kid_code: string } | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("請輸入名稱"); return; }
    if (pin && !/^\d{4,6}$/.test(pin)) { setError("PIN 需為 4–6 位數字"); return; }
    setLoading(true);
    const res = await fetch("/api/cadets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ familyId, name: name.trim(), avatar, pin: pin || null }),
    });
    setLoading(false);
    if (!res.ok) { setError("建立失敗"); return; }
    const data = await res.json();
    setNewKid({ name: data.child.name, avatar: data.child.avatar, kid_code: data.child.kid_code });
    onDone();
  }

  if (newKid) return (
    <ModalWrap onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">學員已建立 🎉</h2>
      <KidCard name={newKid.name} avatar={newKid.avatar} kidCode={newKid.kid_code} />
      <button onClick={onClose} className="btn-primary mt-4 w-full">完成</button>
    </ModalWrap>
  );

  return (
    <ModalWrap onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">新增學員</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          名稱
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={20} required />
        </label>
        <div className="flex flex-col gap-1 text-sm">
          頭像
          <div className="flex flex-wrap gap-2 pt-1">
            {AVATARS.map((a) => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                className={`rounded-xl p-2 text-2xl ${avatar === a ? "bg-nebula-purple/60 ring-2 ring-nebula-purple" : "bg-space-700"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          PIN（選填，4–6 位數字）
          <input value={pin} onChange={(e) => setPin(e.target.value)} className="input" inputMode="numeric" pattern="\d*" maxLength={6} placeholder="不設定則無需 PIN" />
        </label>
        {error && <p className="text-sm text-nebula-pink">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "建立中…" : "建立"}</button>
        </div>
      </form>
    </ModalWrap>
  );
}

/* ── 編輯學員 Modal ── */
function EditModal({ child, onClose, onDone }: { child: Child; onClose: () => void; onDone: () => void }) {
  const [name, setName] = useState(child.name);
  const [avatar, setAvatar] = useState(child.avatar);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const res = await fetch(`/api/cadets/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), avatar }),
    });
    setLoading(false);
    if (!res.ok) { setError("更新失敗"); return; }
    onDone(); onClose();
  }

  async function toggleActive() {
    await fetch(`/api/cadets/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !child.is_active }),
    });
    onDone(); onClose();
  }

  return (
    <ModalWrap onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">編輯學員</h2>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          名稱
          <input value={name} onChange={(e) => setName(e.target.value)} className="input" maxLength={20} required />
        </label>
        <div className="flex flex-col gap-1 text-sm">
          頭像
          <div className="flex flex-wrap gap-2 pt-1">
            {AVATARS.map((a) => (
              <button key={a} type="button" onClick={() => setAvatar(a)}
                className={`rounded-xl p-2 text-2xl ${avatar === a ? "bg-nebula-purple/60 ring-2 ring-nebula-purple" : "bg-space-700"}`}>
                {a}
              </button>
            ))}
          </div>
        </div>
        {error && <p className="text-sm text-nebula-pink">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
          <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "儲存中…" : "儲存"}</button>
        </div>
        <button type="button" onClick={toggleActive}
          className={`w-full rounded-xl py-2 text-sm ${child.is_active ? "border border-nebula-pink/50 text-nebula-pink" : "border border-green-500/50 text-green-400"}`}>
          {child.is_active ? "停用學員" : "啟用學員"}
        </button>
      </form>
    </ModalWrap>
  );
}

/* ── 重設 PIN Modal ── */
function PinModal({ child, onClose, onDone }: { child: Child; onClose: () => void; onDone: () => void }) {
  const [pin, setPin] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (pin && !/^\d{4,6}$/.test(pin)) { setError("PIN 需為 4–6 位數字"); return; }
    setLoading(true);
    const res = await fetch(`/api/cadets/${child.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin: pin || "" }),
    });
    setLoading(false);
    if (!res.ok) { setError("更新失敗"); return; }
    onDone();
    setDone(true);
  }

  return (
    <ModalWrap onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold">重設 PIN — {child.name}</h2>
      <p className="mb-4 text-sm text-slate-400">留空則移除 PIN</p>
      {done ? (
        <>
          <p className="text-center text-green-400">✓ PIN 已更新</p>
          <button onClick={onClose} className="btn-primary mt-4 w-full">關閉</button>
        </>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          <input value={pin} onChange={(e) => setPin(e.target.value)} className="input text-center text-2xl tracking-widest"
            inputMode="numeric" pattern="\d*" maxLength={6} placeholder="新 PIN 碼" />
          {error && <p className="text-sm text-nebula-pink">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">{loading ? "更新中…" : "確認"}</button>
          </div>
        </form>
      )}
    </ModalWrap>
  );
}

/* ── KID 登入卡 Modal ── */
function CardModal({ child, onClose }: { child: Child; onClose: () => void }) {
  return (
    <ModalWrap onClose={onClose}>
      <h2 className="mb-4 text-lg font-bold">學員登入卡</h2>
      <KidCard name={child.name} avatar={child.avatar} kidCode={child.kid_code} />
      <button onClick={onClose} className="btn-primary mt-4 w-full">關閉</button>
    </ModalWrap>
  );
}

/* ── 調整星塵 Modal ── */
function CoinsModal({ child, onClose, onDone }: { child: Child; onClose: () => void; onDone: () => void }) {
  const [delta, setDelta] = useState<number | "">(0);
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState<{ newBalance: number; delta: number } | null>(null);

  const PRESETS = [+5, +10, +20, +50, -5, -10, -20, -50];

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const d = Number(delta);
    if (!d || d === 0) { setError("請輸入非零的調整數值"); return; }
    setLoading(true);
    setError("");
    const res = await fetch("/api/children/adjust-coins", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ childId: child.id, delta: d, reason: reason.trim() || "manual_adjust" }),
    });
    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "調整失敗，請再試");
      return;
    }
    const body = await res.json();
    setDone({ newBalance: body.result?.balance ?? child.coins + d, delta: d });
    onDone();
  }

  if (done) return (
    <ModalWrap onClose={onClose}>
      <div className="flex flex-col items-center gap-4 py-4 text-center">
        <span className="text-5xl">⭐</span>
        <p className="text-lg font-bold">
          {done.delta > 0 ? `+${done.delta}` : done.delta} 星塵
        </p>
        <p className="text-slate-400 text-sm">{child.name} 現有 <span className="font-bold text-stardust">{done.newBalance}</span> 星塵</p>
        <button onClick={onClose} className="btn-primary w-full">完成</button>
      </div>
    </ModalWrap>
  );

  return (
    <ModalWrap onClose={onClose}>
      <h2 className="mb-1 text-lg font-bold">調整星塵 — {child.avatar} {child.name}</h2>
      <p className="mb-4 text-sm text-slate-400">目前餘額：<span className="font-bold text-stardust">{child.coins}</span> 星塵</p>
      <form onSubmit={submit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-2 text-sm">
          快速選擇
          <div className="grid grid-cols-4 gap-2">
            {PRESETS.map((p) => (
              <button key={p} type="button" onClick={() => setDelta(p)}
                className={`rounded-xl py-2 text-xs font-bold transition ${delta === p
                  ? "bg-nebula-purple text-white"
                  : p > 0 ? "bg-green-900/40 text-green-400 hover:bg-green-900/60" : "bg-red-900/40 text-nebula-pink hover:bg-red-900/60"}`}>
                {p > 0 ? `+${p}` : p}
              </button>
            ))}
          </div>
        </div>
        <label className="flex flex-col gap-1 text-sm">
          自訂數值（正數 = 增加，負數 = 扣除）
          <input
            type="number"
            value={delta}
            onChange={(e) => setDelta(e.target.value === "" ? "" : Number(e.target.value))}
            className="input text-center text-xl font-bold"
            placeholder="0"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          原因（選填）
          <input value={reason} onChange={(e) => setReason(e.target.value)}
            className="input" maxLength={50} placeholder="例：額外獎勵、扣除罰款…" />
        </label>
        {error && <p className="text-sm text-nebula-pink">{error}</p>}
        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
          <button type="submit" disabled={loading || !delta || delta === 0} className="btn-primary flex-1">
            {loading ? "調整中…" : "確認調整"}
          </button>
        </div>
      </form>
    </ModalWrap>
  );
}

/* ── 共用元件 ── */
function ModalWrap({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 sm:items-center" onClick={onClose}>
      <div className="w-full max-w-md rounded-t-3xl bg-space-800 p-6 sm:rounded-2xl" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
}

function KidCard({ name, avatar, kidCode }: { name: string; avatar: string; kidCode: string }) {
  return (
    <div className="rounded-2xl border-2 border-stardust/40 bg-space-900 p-5">
      <div className="flex items-center gap-3">
        <span className="text-4xl">{avatar}</span>
        <span className="text-lg font-bold">{name}</span>
      </div>
      <p className="mt-3 text-xs text-slate-500">學員登入代碼</p>
      <p className="font-mono text-3xl font-black tracking-widest text-stardust-glow">{kidCode}</p>
      <p className="mt-3 rounded-lg bg-space-800 p-2 text-xs text-slate-400">
        前往 StarDuty → 學員登入 → 輸入此代碼
      </p>
    </div>
  );
}
