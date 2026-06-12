import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col items-center justify-center gap-8 px-6">
      <div className="text-center">
        <h1 className="text-4xl font-black tracking-wide">
          <span className="text-stardust-glow">StarDuty</span>
        </h1>
        <p className="mt-2 text-lg text-slate-300">星際學院</p>
        <p className="mt-1 text-sm text-slate-400">完成任務 · 賺取星塵 · 兌換獎勵</p>
      </div>

      <div className="grid w-full gap-4">
        <Link
          href="/login/commander"
          className="card flex items-center gap-4 transition hover:border-nebula-cyan/50"
        >
          <span className="text-3xl">🛰️</span>
          <span>
            <span className="block text-lg font-semibold">指揮官登入</span>
            <span className="block text-sm text-slate-400">家長 · Email 登入</span>
          </span>
        </Link>

        <Link
          href="/login/cadet"
          className="card flex items-center gap-4 transition hover:border-stardust/50"
        >
          <span className="text-3xl">🧑‍🚀</span>
          <span>
            <span className="block text-lg font-semibold">學員登入</span>
            <span className="block text-sm text-slate-400">小孩 · KID 代碼登入</span>
          </span>
        </Link>
      </div>

      <Link
        href="/signup"
        className="text-xs text-nebula-cyan underline underline-offset-2"
      >
        還沒有帳號？立即建立家庭 →
      </Link>

      <p className="text-xs text-slate-500">v0.1 · 開發預覽</p>
    </main>
  );
}
