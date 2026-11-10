"use client";
import { useRef, type ReactNode } from "react";

/** Wraps children in a pointer-tracked 3D tilt with a moving glare, like holding a foil card. */
export function TiltCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const move = (e: React.PointerEvent) => {
    const el = ref.current;
    if (!el || window.matchMedia("(prefers-reduced-motion: reduce)").matches || document.documentElement.classList.contains("calm")) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 16}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 20}deg`);
    el.style.setProperty("--gx", `${x * 100}%`);
    el.style.setProperty("--gy", `${y * 100}%`);
    el.style.setProperty("--go", "1");
  };
  const leave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg"); el.style.setProperty("--go", "0");
  };
  return (
    <div className={className} style={{ perspective: "1100px" }} onPointerMove={move} onPointerLeave={leave}>
      <div ref={ref} className="relative transition-transform duration-200 ease-out will-change-transform" style={{ transform: "rotateX(var(--rx,0deg)) rotateY(var(--ry,0deg))", transformStyle: "preserve-3d" }}>
        {children}
        <div aria-hidden className="pointer-events-none absolute inset-0 rounded-[12px] transition-opacity duration-300" style={{ opacity: "var(--go,0)", background: "radial-gradient(circle at var(--gx,50%) var(--gy,50%), rgba(255,255,255,.28), rgba(143,227,242,.10) 35%, transparent 60%)", mixBlendMode: "screen" }} />
      </div>
    </div>
  );
}
