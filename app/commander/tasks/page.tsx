"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

const TASK_ICONS = ["📚", "🧹", "🍽️", "🛁", "🐕", "🌱", "💪", "🎵", "🏃", "🧘", "🍱", "🛏️", "♻️", "🖊️"];
const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

interface Child { id: string; name: string; avatar: string; }
interface Task {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  coins_reward: number;
  task_type: string;
  recur_days: number[] | null;
  reset_hour: number;
  require_approval: boolean;
  status: string;
  assigned_to: string | null;
}

type Modal = { type: "add" } | { type: "edit"; task: Task } | null;

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [cadets, setCadets] = useState<Child[]>([]);
  const [familyId, setFamilyId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<Modal>(null);
  const [filter, setFilter] = useState<"active" | "archived">("active");

  const load = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.replace("/login/commander"); return; }
    setUserId(user.id);

    const { data: fm } = await supabase.from("family_members").select("family_id").eq("user_id", user.id).single();
    if (!fm) { setLoading(false); return; }
    setFamilyId(fm.family_id);

    const [{ data: taskData }, { data: cadetData }] = await Promise.all([
      supabase.from("tasks").select("*").eq("family_id", fm.family_id).order("created_at", { ascending: false }),
      supabase.from("children").select("id,name,avatar").eq("family_id", fm.family_id).eq("is_active", true),
    ]);

    setTasks(taskData ?? []);
    setCadets(cadetData ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function archive(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "archived" }),
    });
    load();
  }

  async function restore(taskId: string) {
    await fetch(`/api/tasks/${taskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "active" }),
    });
    load();
  }

  const filtered = tasks.filter((t) => t.status === filter);

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">任務管理 📋</h1>
          <p className="text-sm text-slate-400">{tasks.filter((t) => t.status === "active").length} 個進行中任務</p>
        </div>
        <button onClick={() => setModal({ type: "add" })} className="btn-primary px-4 py-2 text-sm">
          + 新增任務
        </button>
      </div>

      {/* Filter tabs */}
      <div className="mb-4 flex gap-2">
        {(["active", "archived"] as const).map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`rounded-xl px-4 py-2 text-sm transition ${filter === f ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
            {f === "active" ? "進行中" : "已封存"} ({tasks.filter((t) => t.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="card py-12 text-center text-slate-400">
          <p className="text-4xl">📋</p>
          <p className="mt-3">{filter === "active" ? "還沒有任務" : "沒有封存的任務"}</p>
          {filter === "active" && (
            <button onClick={() => setModal({ type: "add" })} className="mt-4 text-sm text-nebula-cyan underline">
              新增第一個任務
            </button>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((t) => {
          const cadet = cadets.find((c) => c.id === t.assigned_to);
          return (
            <div key={t.id} className="card flex items-start gap-3">
              <span className="mt-0.5 text-2xl">{t.icon ?? "📋"}</span>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{t.title}</span>
                  <TypeBadge type={t.task_type} recurDays={t.recur_days} />
                  {t.require_approval && <span className="rounded bg-amber-900/40 px-1.5 py-0.5 text-xs text-amber-400">需審核</span>}
                </div>
                {t.description && <p className="mt-1 text-xs text-slate-400 line-clamp-1">{t.description}</p>}
                <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500">
                  <span>⭐ {t.coins_reward} 星塵</span>
                  <span>{cadet ? `${cadet.avatar} ${cadet.name}` : "所有學員"}</span>
                </div>
              </div>
              <div className="flex flex-col gap-1">
                {t.status === "active" && (
                  <button onClick={() => setModal({ type: "edit", task: t })}
                    className="rounded-lg bg-space-700 px-3 py-1.5 text-xs hover:bg-space-600">編輯</button>
                )}
                {t.status === "active" ? (
                  <button onClick={() => archive(t.id)}
                    className="rounded-lg border border-white/10 px-3 py-1.5 text-xs text-slate-400 hover:text-white">封存</button>
                ) : (
                  <button onClick={() => restore(t.id)}
                    className="rounded-lg border border-green-500/30 px-3 py-1.5 text-xs text-green-400 hover:text-green-300">恢復</button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {modal?.type === "add" && familyId && userId && (
        <TaskFormModal
          cadets={cadets}
          familyId={familyId}
          userId={userId}
          onClose={() => setModal(null)}
          onDone={load}
        />
      )}
      {modal?.type === "edit" && (
        <TaskFormModal
          cadets={cadets}
          task={modal.task}
          onClose={() => setModal(null)}
          onDone={load}
        />
      )}
    </div>
  );
}

function TypeBadge({ type, recurDays }: { type: string; recurDays: number[] | null }) {
  if (type === "once") return <span className="rounded bg-space-700 px-1.5 py-0.5 text-xs text-slate-400">一次性</span>;
  if (type === "daily") return <span className="rounded bg-blue-900/40 px-1.5 py-0.5 text-xs text-blue-400">每日</span>;
  if (type === "weekly") {
    const days = (recurDays ?? []).map((d) => WEEKDAYS[d]).join("、");
    return <span className="rounded bg-purple-900/40 px-1.5 py-0.5 text-xs text-purple-400">每週 {days}</span>;
  }
  return null;
}

interface TaskFormProps {
  cadets: Child[];
  task?: Task;
  familyId?: string;
  userId?: string;
  onClose: () => void;
  onDone: () => void;
}

function TaskFormModal({ cadets, task, familyId, userId, onClose, onDone }: TaskFormProps) {
  const isEdit = !!task;
  const [title, setTitle] = useState(task?.title ?? "");
  const [description, setDescription] = useState(task?.description ?? "");
  const [icon, setIcon] = useState(task?.icon ?? "📋");
  const [coinsReward, setCoinsReward] = useState(task?.coins_reward ?? 5);
  const [taskType, setTaskType] = useState<"once" | "daily" | "weekly">(
    (task?.task_type as "once" | "daily" | "weekly") ?? "once"
  );
  const [recurDays, setRecurDays] = useState<number[]>(task?.recur_days ?? []);
  const [resetHour, setResetHour] = useState(task?.reset_hour ?? 6);
  const [assignedTo, setAssignedTo] = useState<string>(task?.assigned_to ?? "");
  const [requireApproval, setRequireApproval] = useState(task?.require_approval ?? false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function toggleDay(d: number) {
    setRecurDays((prev) => prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError("請輸入任務名稱"); return; }
    if (taskType === "weekly" && recurDays.length === 0) { setError("請選擇至少一天"); return; }
    setLoading(true);

    if (isEdit) {
      const res = await fetch(`/api/tasks/${task!.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(), description: description.trim() || null, icon,
          coinsReward, requireApproval, assignedTo: assignedTo || null,
          recurDays: taskType === "weekly" ? recurDays : null,
          resetHour: taskType === "daily" ? resetHour : 6,
        }),
      });
      setLoading(false);
      if (!res.ok) { setError("更新失敗"); return; }
    } else {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyId, createdBy: userId, title: title.trim(),
          description: description.trim() || null, icon, coinsReward, taskType,
          recurDays: taskType === "weekly" ? recurDays : null,
          resetHour: taskType === "daily" ? resetHour : 6,
          assignedTo: assignedTo || null, requireApproval,
        }),
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
        <h2 className="mb-4 text-lg font-bold">{isEdit ? "編輯任務" : "新增任務"}</h2>
        <form onSubmit={submit} className="flex flex-col gap-4">
          {/* 圖示 */}
          <div className="flex flex-col gap-1 text-sm">
            任務圖示
            <div className="flex flex-wrap gap-2 pt-1">
              {TASK_ICONS.map((ic) => (
                <button key={ic} type="button" onClick={() => setIcon(ic)}
                  className={`rounded-xl p-2 text-xl ${icon === ic ? "bg-nebula-purple/60 ring-2 ring-nebula-purple" : "bg-space-700"}`}>
                  {ic}
                </button>
              ))}
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm">
            任務名稱 *
            <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" maxLength={50} required />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            說明（選填）
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              className="input resize-none" rows={2} maxLength={200} />
          </label>

          <label className="flex flex-col gap-1 text-sm">
            星塵獎勵
            <div className="flex items-center gap-3">
              <input type="range" min={1} max={100} value={coinsReward}
                onChange={(e) => setCoinsReward(Number(e.target.value))} className="flex-1" />
              <span className="w-12 text-center font-bold text-stardust">{coinsReward}</span>
            </div>
          </label>

          {/* 任務類型 */}
          {!isEdit && (
            <div className="flex flex-col gap-1 text-sm">
              任務類型
              <div className="flex gap-2">
                {(["once", "daily", "weekly"] as const).map((t) => (
                  <button key={t} type="button" onClick={() => setTaskType(t)}
                    className={`flex-1 rounded-xl py-2 text-xs transition ${taskType === t ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
                    {t === "once" ? "一次性" : t === "daily" ? "每日" : "每週"}
                  </button>
                ))}
              </div>
            </div>
          )}

          {taskType === "weekly" && (
            <div className="flex flex-col gap-1 text-sm">
              出現日期
              <div className="flex gap-1">
                {WEEKDAYS.map((wd, i) => (
                  <button key={i} type="button" onClick={() => toggleDay(i)}
                    className={`flex-1 rounded-lg py-2 text-xs ${recurDays.includes(i) ? "bg-nebula-purple text-white" : "bg-space-700 text-slate-400"}`}>
                    {wd}
                  </button>
                ))}
              </div>
            </div>
          )}

          {taskType === "daily" && (
            <label className="flex flex-col gap-1 text-sm">
              重置時間（每日）
              <select value={resetHour} onChange={(e) => setResetHour(Number(e.target.value))} className="input">
                {[0,1,2,3,4,5,6,7,8,9,10,11,12].map((h) => (
                  <option key={h} value={h}>{String(h).padStart(2, "0")}:00</option>
                ))}
              </select>
            </label>
          )}

          {/* 指派 */}
          <label className="flex flex-col gap-1 text-sm">
            指派給
            <select value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)} className="input">
              <option value="">所有學員</option>
              {cadets.map((c) => <option key={c.id} value={c.id}>{c.avatar} {c.name}</option>)}
            </select>
          </label>

          {/* 需審核 */}
          <label className="flex cursor-pointer items-center gap-3 text-sm">
            <div className={`relative h-6 w-11 rounded-full transition ${requireApproval ? "bg-nebula-purple" : "bg-space-700"}`}
              onClick={() => setRequireApproval(!requireApproval)}>
              <div className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${requireApproval ? "left-5" : "left-0.5"}`} />
            </div>
            <span>需指揮官審核才入帳</span>
          </label>

          {error && <p className="text-sm text-nebula-pink">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 rounded-xl border border-white/10 py-3 text-sm">取消</button>
            <button type="submit" disabled={loading} className="btn-primary flex-1">
              {loading ? "儲存中…" : isEdit ? "儲存" : "建立任務"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
