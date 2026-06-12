"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function TimerContent() {
  const searchParams = useSearchParams();
  const redemptionId = searchParams.get("id");
  const minutes = Number(searchParams.get("m") ?? 30);
  const title = searchParams.get("title") ?? "計時中";

  const totalSeconds = minutes * 60;
  const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
  const [started, setStarted] = useState(false);
  const [ended, setEnded] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = useCallback(async () => {
    if (!redemptionId) return;
    await fetch("/api/rewards/timer/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ redemptionId }),
    });
    setStarted(true);
  }, [redemptionId]);

  useEffect(() => {
    if (!started || ended) return;
    intervalRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(intervalRef.current!);
          setEnded(true);
          if (redemptionId) {
            fetch("/api/rewards/timer/end", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ redemptionId }),
            });
          }
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [started, ended, redemptionId]);

  const pct = ((totalSeconds - secondsLeft) / totalSeconds) * 100;
  const mins = Math.floor(secondsLeft / 60);
  const secs = secondsLeft % 60;

  const radius = 100;
  const circumference = 2 * Math.PI * radius;
  const dash = circumference * (1 - pct / 100);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-8 px-6 text-center">
      <div>
        <p className="text-sm text-slate-400">計時型獎勵</p>
        <h1 className="text-2xl font-bold">{title}</h1>
      </div>

      {/* 圓形進度條 */}
      <div className="relative">
        <svg width="240" height="240" className="-rotate-90">
          <circle cx="120" cy="120" r={radius} fill="none" stroke="#1a2150" strokeWidth="16" />
          <circle
            cx="120" cy="120" r={radius} fill="none"
            stroke={ended ? "#ffd54a" : "#7c5cff"}
            strokeWidth="16"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dash}
            className="transition-all duration-1000"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {ended ? (
            <span className="text-5xl">🎉</span>
          ) : (
            <>
              <span className="font-mono text-4xl font-black">
                {String(mins).padStart(2, "0")}:{String(secs).padStart(2, "0")}
              </span>
              <span className="text-xs text-slate-400">剩餘</span>
            </>
          )}
        </div>
      </div>

      {!started && !ended && (
        <button onClick={startTimer} className="btn-primary px-8 py-4 text-lg">
          開始計時 ▶
        </button>
      )}

      {started && !ended && (
        <div className="card text-sm text-slate-400">
          <p>計時中，請保持畫面開啟</p>
          <p className="mt-1 text-xs">若切換到背景，計時仍持續但通知可能延遲</p>
        </div>
      )}

      {ended && (
        <div className="card text-center">
          <p className="text-xl font-bold text-stardust-glow">時間到！🎊</p>
          <p className="mt-2 text-sm text-slate-400">記得告訴指揮官計時結束了</p>
        </div>
      )}
    </div>
  );
}

export default function TimerPage() {
  return (
    <Suspense fallback={<div className="py-20 text-center text-slate-500">載入中…</div>}>
      <TimerContent />
    </Suspense>
  );
}
