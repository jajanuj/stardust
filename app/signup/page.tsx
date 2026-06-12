"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase/client";

type Step = "account" | "family" | "cadet" | "card";

const AVATARS = ["🧑‍🚀", "👩‍🚀", "🦸", "🦸‍♀️", "🐱", "🐶", "🦊", "🐼", "🐸", "🦄"];

interface KidCard {
  name: string;
  avatar: string;
  kid_code: string;
  family_name: string;
}

export default function SignupPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>("account");

  // step: account
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");

  // step: family
  const [familyName, setFamilyName] = useState("");

  // step: cadet
  const [cadetName, setCadetName] = useState("");
  const [cadetAvatar, setCadetAvatar] = useState("🧑‍🚀");
  const [cadetPin, setCadetPin] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [kidCard, setKidCard] = useState<KidCard | null>(null);

  function saveUserId(id: string) {
    try { sessionStorage.setItem("_sd_signup_uid", id); } catch {}
  }
  function loadUserId(): string | null {
    try { return sessionStorage.getItem("_sd_signup_uid"); } catch { return null; }
  }

  async function handleAccount(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (password !== password2) { setError("兩次密碼不一致"); return; }
    if (password.length < 6) { setError("密碼至少 6 個字元"); return; }
    setLoading(true);
    const { data, error: signUpErr } = await supabase.auth.signUp({ email, password });
    setLoading(false);
    if (signUpErr) { setError(signUpErr.message); return; }
    // 儲存至 sessionStorage，防止 email 確認/頁面重整造成 session 消失
    if (data.user?.id) saveUserId(data.user.id);
    setStep("family");
  }

  async function handleFamily(e: React.FormEvent) {
    e.preventDefault();
    if (!familyName.trim()) { setError("請輸入家庭名稱"); return; }
    setError("");
    setStep("cadet");
  }

  async function handleCadet(e: React.FormEvent) {
    e.preventDefault();
    if (!cadetName.trim()) { setError("請輸入學員名稱"); return; }
    if (cadetPin && !/^\d{4,6}$/.test(cadetPin)) { setError("PIN 需為 4–6 位數字"); return; }
    setError("");
    setLoading(true);

    // 依序嘗試：sessionStorage → Supabase session
    let userId: string | null = loadUserId();
    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user?.id ?? null;
    }
    if (!userId) { setError("登入狀態遺失，請重新整理"); setLoading(false); return; }

    const res = await fetch("/api/onboarding", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userId,
        familyName: familyName.trim(),
        cadetName: cadetName.trim(),
        cadetAvatar,
        cadetPin: cadetPin || null,
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json();
      setError(body.error ?? "建立失敗，請再試一次");
      return;
    }

    const data = await res.json();
    try { sessionStorage.removeItem("_sd_signup_uid"); } catch {}
    setKidCard({
      name: data.child.name,
      avatar: data.child.avatar,
      kid_code: data.child.kid_code,
      family_name: data.family.name,
    });
    setStep("card");
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 px-6 py-10">
      {/* 步驟指示器 */}
      <StepIndicator current={step} />

      {step === "account" && (
        <>
          <div className="text-center">
            <span className="text-5xl">🛰️</span>
            <h1 className="mt-3 text-2xl font-bold">建立指揮官帳號</h1>
            <p className="mt-1 text-sm text-slate-400">以 Email 建立家長帳號</p>
          </div>
          <form onSubmit={handleAccount} className="card flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              Email
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="input"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              密碼（至少 6 字元）
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="input"
                required
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              確認密碼
              <input
                value={password2}
                onChange={(e) => setPassword2(e.target.value)}
                type="password"
                className="input"
                required
              />
            </label>
            {error && <p className="text-sm text-nebula-pink">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "建立中…" : "下一步 →"}
            </button>
            <p className="text-center text-xs text-slate-500">
              已有帳號？{" "}
              <Link href="/login/commander" className="text-nebula-cyan underline">
                前往登入
              </Link>
            </p>
          </form>
        </>
      )}

      {step === "family" && (
        <>
          <div className="text-center">
            <span className="text-5xl">🏠</span>
            <h1 className="mt-3 text-2xl font-bold">為家庭命名</h1>
            <p className="mt-1 text-sm text-slate-400">這將是你的星際基地名稱</p>
          </div>
          <form onSubmit={handleFamily} className="card flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              家庭名稱（例如：陳家星際基地）
              <input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                type="text"
                className="input"
                placeholder="○○家星際基地"
                maxLength={30}
                required
              />
            </label>
            {error && <p className="text-sm text-nebula-pink">{error}</p>}
            <button type="submit" className="btn-primary">下一步 →</button>
          </form>
        </>
      )}

      {step === "cadet" && (
        <>
          <div className="text-center">
            <span className="text-5xl">{cadetAvatar}</span>
            <h1 className="mt-3 text-2xl font-bold">新增第一位學員</h1>
            <p className="mt-1 text-sm text-slate-400">為你的小孩建立學員帳號</p>
          </div>
          <form onSubmit={handleCadet} className="card flex flex-col gap-4">
            <label className="flex flex-col gap-1 text-sm">
              學員名稱
              <input
                value={cadetName}
                onChange={(e) => setCadetName(e.target.value)}
                type="text"
                className="input"
                placeholder="小明 / 寶貝..."
                maxLength={20}
                required
              />
            </label>

            <div className="flex flex-col gap-1 text-sm">
              選擇頭像
              <div className="flex flex-wrap gap-2 pt-1">
                {AVATARS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    onClick={() => setCadetAvatar(a)}
                    className={`rounded-xl p-2 text-2xl transition ${
                      cadetAvatar === a
                        ? "bg-nebula-purple/60 ring-2 ring-nebula-purple"
                        : "bg-space-700 hover:bg-space-600"
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-sm">
              PIN 碼（選填，4–6 位數字）
              <input
                value={cadetPin}
                onChange={(e) => setCadetPin(e.target.value)}
                type="text"
                inputMode="numeric"
                pattern="\d*"
                className="input"
                placeholder="不設定則任何人可登入"
                maxLength={6}
              />
            </label>

            {error && <p className="text-sm text-nebula-pink">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary">
              {loading ? "建立中…" : "建立學員 🚀"}
            </button>
          </form>
        </>
      )}

      {step === "card" && kidCard && (
        <>
          <div className="text-center">
            <span className="text-5xl">🎉</span>
            <h1 className="mt-3 text-2xl font-bold">太棒了！準備完成</h1>
            <p className="mt-1 text-sm text-slate-400">把這張登入卡給學員保管</p>
          </div>

          <KidLoginCard card={kidCard} />

          <div className="flex flex-col gap-3">
            <button
              onClick={() => router.push("/commander")}
              className="btn-primary"
            >
              進入指揮中心 →
            </button>
            <p className="text-center text-xs text-slate-500">
              可在學員管理頁面隨時查看 KID 代碼
            </p>
          </div>
        </>
      )}
    </main>
  );
}

function StepIndicator({ current }: { current: Step }) {
  const steps: { key: Step; label: string }[] = [
    { key: "account", label: "帳號" },
    { key: "family", label: "家庭" },
    { key: "cadet", label: "學員" },
    { key: "card", label: "完成" },
  ];
  const idx = steps.findIndex((s) => s.key === current);
  return (
    <div className="flex items-center justify-center gap-2">
      {steps.map((s, i) => (
        <div key={s.key} className="flex items-center gap-2">
          <div
            className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition ${
              i <= idx
                ? "bg-nebula-purple text-white"
                : "bg-space-700 text-slate-500"
            }`}
          >
            {i < idx ? "✓" : i + 1}
          </div>
          <span
            className={`text-xs ${i <= idx ? "text-slate-200" : "text-slate-600"}`}
          >
            {s.label}
          </span>
          {i < steps.length - 1 && (
            <div
              className={`h-px w-6 ${i < idx ? "bg-nebula-purple" : "bg-space-700"}`}
            />
          )}
        </div>
      ))}
    </div>
  );
}

function KidLoginCard({ card }: { card: KidCard }) {
  return (
    <div
      className="relative overflow-hidden rounded-2xl border-2 border-stardust/40 bg-space-800/90 p-6 shadow-xl"
      style={{
        backgroundImage:
          "radial-gradient(circle at 80% 20%, rgba(255,213,74,0.08), transparent 50%)",
      }}
    >
      <div className="absolute right-4 top-4 text-xs text-slate-600">✂ 截圖保存</div>
      <div className="flex items-center gap-4">
        <span className="text-5xl">{card.avatar}</span>
        <div>
          <p className="text-lg font-bold">{card.name}</p>
          <p className="text-xs text-slate-400">{card.family_name}</p>
        </div>
      </div>

      <div className="mt-5">
        <p className="text-xs text-slate-500">學員登入代碼</p>
        <p className="mt-1 font-mono text-3xl font-black tracking-widest text-stardust-glow">
          {card.kid_code}
        </p>
      </div>

      <div className="mt-4 rounded-xl bg-space-900/60 p-3 text-xs text-slate-400">
        前往 <span className="text-nebula-cyan">StarDuty 星際學院</span> →
        學員登入 → 輸入此代碼即可登入
      </div>
    </div>
  );
}
