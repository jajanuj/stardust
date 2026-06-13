"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getCadetToken, getCadetInfo, saveCadetSession } from "@/lib/cadetSession";

const WEEKDAYS = ["日", "一", "二", "三", "四", "五", "六"];

interface Task {
  id: string;
  title: string;
  description: string | null;
  icon: string | null;
  coins_reward: number;
  task_type: string;
  recur_days: number[] | null;
  require_approval: boolean;
  status: string;
  task_completions: { id: string; status: string; completion_date: string }[];
}

interface CompletionResult {
  status: "approved" | "pending";
  balance: number;
}

export default function CadetTasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [childId, setChildId] = useState<string | null>(null);
  const [coins, setCoins] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "info" | "error" } | null>(null);

  const todayStr = new Date().toLocaleDateString("sv-SE"); // YYYY-MM-DD
  const todayDay = new Date().getDay();

  const load = useCallback(async () => {
    const token = getCadetToken();
    if (!token) { router.replace("/login/cadet"); return; }

    const info = getCadetInfo();
    const cid = info?.id ?? "";
    setChildId(cid);
    setCoins(info?.coins ?? 0);

    // 透過 API Route（admin client），帶 JWT 取任務
    const res = await fetch("/api/cadet/tasks", {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) { setLoading(false); return; }

    const body = await res.json();
    setTasks(body.tasks ?? []);
    setLoading(false);
  }, [router]);

  useEffect(() => { load(); }, [load]);

  function showToast(msg: string, type: "success" | "info" | "error") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }

  function isTaskDoneToday(task: Task): boolean {
    const completions = task.task_completions ?? [];
    if (task.task_type === "once") return completions.some((c) => c.status === "approved" || c.status === "pending");
    return completions.some((c) => c.completion_date === todayStr);
  }

  function shouldShowTask(task: Task): boolean {
    if (task.task_type === "weekly") {
      return (task.recur_days ?? []).includes(todayDay);
    }
    if (task.task_type === "once") {
      return !isTaskDoneToday(task);
    }
    return true;
  }

  async function completeTask(taskId: string) {
    if (!childId || completing) return;
    const token = getCadetToken();
    if (!token) { router.replace("/login/cadet"); return; }
    setCompleting(taskId);
    const res = await fetch("/api/tasks/complete", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ taskId }),
    });
    setCompleting(null);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      if (err.error === "already_completed_today" || err.message?.includes("already_completed_today")) {
        showToast("今天已完成過囉！", "info");
      } else {
        showToast(`發生錯誤：${err.message ?? err.error ?? res.status}`, "error");
      }
      return;
    }
    const result: CompletionResult = await res.json();
    if (result.status === "pending") {
      showToast("✅ 已回報！等待指揮官審核中…", "info");
    } else {
      setCoins(result.balance);
      // 同步更新 localStorage 內的 coins
      const info = getCadetInfo();
      if (info) saveCadetSession(getCadetToken()!, { ...info, coins: result.balance });
      showToast(`🌟 +${tasks.find((t) => t.id === taskId)?.coins_reward ?? ""} 星塵！`, "success");
    }
    load();
  }

  const visible = tasks.filter(shouldShowTask);
  const done = visible.filter(isTaskDoneToday);
  const todo = visible.filter((t) => !isTaskDoneToday(t));

  if (loading) return <div className="py-20 text-center text-slate-500">載入中…</div>;

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-2xl px-6 py-3 text-sm font-semibold shadow-xl transition ${
          toast.type === "success" ? "bg-stardust text-space-900" :
          toast.type === "info" ? "bg-nebula-purple text-white" : "bg-nebula-pink text-white"
        }`}>
          {toast.msg}
        </div>
      )}

      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">我的任務 📋</h1>
        <div className="flex items-center gap-1 rounded-xl bg-space-800 px-3 py-1.5">
          <span className="text-stardust">⭐</span>
          <span className="font-bold text-stardust">{coins}</span>
          <span className="text-xs text-slate-400">星塵</span>
        </div>
      </div>

      {visible.length === 0 && (
        <div className="card py-16 text-center text-slate-400">
          <p className="text-4xl">🎉</p>
          <p className="mt-3">今天沒有任務，好棒棒！</p>
        </div>
      )}

      {/* 待完成任務 */}
      {todo.length > 0 && (
        <section className="mb-6">
          <p className="mb-3 text-sm font-semibold text-slate-400">待完成 ({todo.length})</p>
          <div className="grid gap-3">
            {todo.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                done={false}
                completing={completing === task.id}
                onComplete={() => completeTask(task.id)}
              />
            ))}
          </div>
        </section>
      )}

      {/* 已完成任務 */}
      {done.length > 0 && (
        <section>
          <p className="mb-3 text-sm font-semibold text-slate-400">今日已完成 ({done.length})</p>
          <div className="grid gap-3">
            {done.map((task) => {
              const isPending = (task.task_completions ?? []).some((c) =>
                (task.task_type === "once" || c.completion_date === todayStr) && c.status === "pending"
              );
              return (
                <TaskCard key={task.id} task={task} done={true} isPending={isPending} completing={false} />
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskCard({ task, done, isPending, completing, onComplete }: {
  task: Task;
  done: boolean;
  isPending?: boolean;
  completing: boolean;
  onComplete?: () => void;
}) {
  return (
    <div className={`card flex items-center gap-3 transition ${done ? "opacity-60" : "border-white/10 hover:border-nebula-purple/40"}`}>
      <span className="text-3xl">{task.icon ?? "📋"}</span>
      <div className="flex-1 min-w-0">
        <p className={`font-semibold ${done ? "line-through text-slate-500" : ""}`}>{task.title}</p>
        {task.description && <p className="text-xs text-slate-400 line-clamp-1">{task.description}</p>}
        <div className="mt-1 flex items-center gap-2 text-xs text-slate-500">
          <span className="text-stardust">⭐ {task.coins_reward}</span>
          {task.require_approval && !done && <span className="text-amber-400">需審核</span>}
          {isPending && <span className="text-amber-400">等待審核中…</span>}
          {task.task_type === "daily" && <span>每日任務</span>}
          {task.task_type === "weekly" && (
            <span>每週 {(task.recur_days ?? []).map((d) => WEEKDAYS[d]).join("、")}</span>
          )}
        </div>
      </div>
      {!done && (
        <button
          onClick={onComplete}
          disabled={completing}
          className={`flex h-10 w-10 items-center justify-center rounded-full text-xl transition ${
            completing ? "animate-pulse bg-space-700" : "bg-nebula-purple/20 hover:bg-nebula-purple/40 active:scale-90"
          }`}
        >
          {completing ? "⏳" : "✓"}
        </button>
      )}
      {done && !isPending && <span className="text-xl">✅</span>}
      {done && isPending && <span className="text-xl">⏳</span>}
    </div>
  );
}
