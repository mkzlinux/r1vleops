/**
 * Animates a lime "+1" token from the clicked element into the visible bucket icon
 * (any element with [data-bucket-target] that is on screen). Resolves when it lands.
 */
export function flyToBucket(from: HTMLElement | null): Promise<void> {
  if (typeof window === "undefined" || !from) return Promise.resolve();
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const target = [...document.querySelectorAll<HTMLElement>("[data-bucket-target]")].find((el) => {
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 && r.bottom > 0 && r.top < window.innerHeight;
  });
  if (!target || reduce) return Promise.resolve();

  const a = from.getBoundingClientRect();
  const b = target.getBoundingClientRect();
  const token = document.createElement("div");
  token.textContent = "+1";
  token.setAttribute("aria-hidden", "true");
  Object.assign(token.style, {
    position: "fixed", left: `${a.left + a.width / 2 - 18}px`, top: `${a.top + a.height / 2 - 18}px`,
    width: "36px", height: "36px", borderRadius: "50%", background: "#c8f53b", color: "#0e0f11",
    display: "grid", placeItems: "center", font: "800 13px/1 var(--font-display)", zIndex: "1000",
    pointerEvents: "none", boxShadow: "0 10px 30px -8px rgba(200,245,59,.9)",
  });
  document.body.appendChild(token);

  const dx = b.left + b.width / 2 - (a.left + a.width / 2);
  const dy = b.top + b.height / 2 - (a.top + a.height / 2);
  const lift = Math.min(-80, dy / 2 - 120);
  const anim = token.animate(
    [
      { transform: "translate(0, 0) scale(0.6)", opacity: 0.6 },
      { transform: `translate(${dx * 0.45}px, ${lift}px) scale(1.15)`, opacity: 1, offset: 0.45 },
      { transform: `translate(${dx}px, ${dy}px) scale(0.35)`, opacity: 0.9 },
    ],
    { duration: 720, easing: "cubic-bezier(.5,0,.2,1)" },
  );
  return anim.finished.then(() => token.remove(), () => token.remove());
}
