"use client";

// 完成任務「星塵飛入」動畫（計畫 §5.2）
// 純 DOM + Web Animations API，不需額外套件：
// 從任務按鈕噴出數顆星塵，沿弧線飛向星塵餘額徽章，抵達後徽章跳動並浮出 +N。

const MAX_PARTICLES = 8;
const FLIGHT_MS = 700;
const STAGGER_MS = 60;

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * 播放星塵飛入動畫，回傳的 Promise 在最後一顆星塵抵達後 resolve。
 * 使用者偏好減少動態效果時直接 resolve（不播放）。
 */
export function flyStardust(from: Element, to: Element, reward: number): Promise<void> {
  if (prefersReducedMotion() || typeof document.body.animate !== "function") {
    return Promise.resolve();
  }

  const src = from.getBoundingClientRect();
  const dst = to.getBoundingClientRect();
  const sx = src.left + src.width / 2;
  const sy = src.top + src.height / 2;
  const dx = dst.left + dst.width / 2 - sx;
  const dy = dst.top + dst.height / 2 - sy;
  const count = Math.max(3, Math.min(MAX_PARTICLES, reward));

  const layer = document.createElement("div");
  layer.dataset.testid = "stardust-fly";
  layer.setAttribute("aria-hidden", "true");
  layer.style.cssText = "position:fixed;inset:0;pointer-events:none;z-index:60;";
  document.body.appendChild(layer);

  const flights = Array.from({ length: count }, (_, i) => {
    const star = document.createElement("span");
    star.dataset.testid = "stardust-particle";
    star.textContent = "⭐";
    star.style.cssText =
      `position:absolute;left:${sx}px;top:${sy}px;font-size:18px;line-height:1;` +
      "transform:translate(-50%,-50%);filter:drop-shadow(0 0 6px rgba(255,213,74,.8));";
    layer.appendChild(star);

    // 先往隨機方向散開，再以弧線飛向徽章
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.6;
    const spread = 28 + Math.random() * 22;
    const bx = Math.cos(angle) * spread;
    const by = Math.sin(angle) * spread;
    const mx = bx + (dx - bx) * 0.5 + (Math.random() - 0.5) * 60;
    const my = by + (dy - by) * 0.5 - 60;

    const anim = star.animate(
      [
        { transform: "translate(-50%,-50%) scale(.4)", opacity: 0 },
        { transform: `translate(calc(-50% + ${bx}px),calc(-50% + ${by}px)) scale(1.2)`, opacity: 1, offset: 0.25 },
        { transform: `translate(calc(-50% + ${mx}px),calc(-50% + ${my}px)) scale(1)`, opacity: 1, offset: 0.6 },
        { transform: `translate(calc(-50% + ${dx}px),calc(-50% + ${dy}px)) scale(.5)`, opacity: 0.2 },
      ],
      { duration: FLIGHT_MS, delay: i * STAGGER_MS, easing: "cubic-bezier(.4,0,.2,1)", fill: "forwards" }
    );
    return anim.finished.catch(() => undefined);
  });

  return Promise.all(flights).then(() => {
    layer.remove();
    to.animate(
      [{ transform: "scale(1)" }, { transform: "scale(1.25)" }, { transform: "scale(1)" }],
      { duration: 350, easing: "ease-out" }
    );
    showPlus(to, reward);
  });
}

// 徽章上方浮出 +N 後淡出
function showPlus(to: Element, reward: number) {
  const r = to.getBoundingClientRect();
  const plus = document.createElement("span");
  plus.dataset.testid = "stardust-plus";
  plus.textContent = `+${reward}`;
  plus.setAttribute("aria-hidden", "true");
  plus.style.cssText =
    `position:fixed;left:${r.left + r.width / 2}px;top:${r.top}px;z-index:60;pointer-events:none;` +
    "transform:translate(-50%,-100%);font-weight:700;color:#ffd54a;text-shadow:0 0 10px rgba(255,213,74,.7);";
  document.body.appendChild(plus);
  plus
    .animate(
      [
        { transform: "translate(-50%,-100%)", opacity: 1 },
        { transform: "translate(-50%,-220%)", opacity: 0 },
      ],
      { duration: 900, easing: "ease-out", fill: "forwards" }
    )
    .finished.catch(() => undefined)
    .then(() => plus.remove());
}
