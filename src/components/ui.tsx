"use client";

import Link from "next/link";
import { useEffect, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cx } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger";

export function Button({
  variant = "primary",
  className,
  loading,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={props.disabled || loading}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-bold tracking-wide transition active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "gold-fill text-ink shadow-[0_8px_24px_-12px_rgba(201,169,98,0.7)]",
        variant === "secondary" && "border border-gold/60 text-gold-light hover:bg-gold/10",
        variant === "ghost" && "text-muted hover:text-cream",
        variant === "danger" && "border border-rose/50 text-rose hover:bg-rose/10",
        className,
      )}
    >
      {loading && <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />}
      {children}
    </button>
  );
}

export function LinkButton({ href, variant = "primary", className, children }: { href: string; variant?: Variant; className?: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-[14px] font-bold tracking-wide transition active:scale-[0.98]",
        variant === "primary" && "gold-fill text-ink",
        variant === "secondary" && "border border-gold/60 text-gold-light hover:bg-gold/10",
        variant === "ghost" && "text-muted hover:text-cream",
        className,
      )}
    >
      {children}
    </Link>
  );
}

export function Card({ className, children, onClick }: { className?: string; children: ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick} className={cx("rounded-2xl border border-line bg-charcoal p-5", onClick && "cursor-pointer transition hover:border-gold/40", className)}>
      {children}
    </div>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return <p className={cx("text-[11px] font-bold uppercase tracking-[0.18em] text-gold", className)}>{children}</p>;
}

export function PageHeader({ eyebrow, title, action, subtitle }: { eyebrow?: string; title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <header className="mb-6 flex items-end justify-between gap-4 pt-2">
      <div className="min-w-0">
        {eyebrow && <Eyebrow className="mb-1">{eyebrow}</Eyebrow>}
        <h1 className="text-[28px] leading-tight text-cream sm:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1 text-muted">{subtitle}</p>}
      </div>
      {action}
    </header>
  );
}

export function Progress({ value, tone = "gold", className }: { value: number; tone?: "gold" | "green"; className?: string }) {
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-raised", className)} role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={100}>
      <div className={cx("h-full rounded-full transition-all duration-700", tone === "gold" ? "gold-fill" : "bg-green-bright")} style={{ width: `${Math.max(2, Math.min(100, value))}%` }} />
    </div>
  );
}

export function ScoreRing({ score, size = 96, stroke = 8 }: { score: number; size?: number; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="shrink-0" role="img" aria-label={`Clarity Score ${score}`}>
      <defs>
        <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#E8D5A3" />
          <stop offset="100%" stopColor="#A8873F" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--color-raised)" strokeWidth={stroke} fill="none" />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        stroke="url(#ring)"
        strokeWidth={stroke}
        fill="none"
        strokeLinecap="round"
        strokeDasharray={c}
        strokeDashoffset={c - (c * score) / 100}
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset 900ms ease" }}
      />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="currentColor" className="text-cream" fontFamily="Georgia, serif" fontSize={size * 0.32}>
        {score}
      </text>
    </svg>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[12px] font-bold uppercase tracking-[0.12em] text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1.5 block text-[12px] text-faint">{hint}</span>}
    </label>
  );
}

export const inputCls =
  "w-full rounded-xl border border-line bg-ink px-4 py-3 text-[15px] text-cream placeholder:text-faint outline-none transition focus:border-gold focus:ring-2 focus:ring-gold/20";

export function Chip({ active, children, onClick }: { active?: boolean; children: ReactNode; onClick?: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cx(
        "min-h-9 shrink-0 rounded-full border px-4 text-[13px] transition",
        active ? "border-gold bg-gold/15 text-gold-light" : "border-line text-muted hover:border-gold/40 hover:text-cream",
      )}
    >
      {children}
    </button>
  );
}

export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button aria-label="Close" className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="rise relative max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl border border-line bg-charcoal p-6 pb-[calc(env(safe-area-inset-bottom)+24px)] sm:rounded-3xl">
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-line sm:hidden" />
        <div className="mb-5 flex items-center justify-between">
          <h2 className="text-[22px]">{title}</h2>
          <button onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:text-cream" aria-label="Close">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <p className="font-display text-[20px] text-cream">{title}</p>
      <p className="mx-auto mt-2 max-w-sm text-muted">{body}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Toast({ message, onDone }: { message: string | null; onDone: () => void }) {
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(onDone, 2600);
    return () => clearTimeout(t);
  }, [message, onDone]);
  if (!message) return null;
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4" role="status">
      <div className="rise rounded-full border border-gold/40 bg-charcoal px-5 py-3 text-[13px] text-gold-light shadow-xl">{message}</div>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cx("skeleton rounded-2xl", className)} />;
}

export function Sparkline({ points, height = 80 }: { points: number[]; height?: number }) {
  if (points.length < 2) {
    return <div className="flex items-center justify-center text-[12px] text-faint" style={{ height }}>Your trend appears after a few days of use.</div>;
  }
  const w = 300;
  const max = 100;
  const step = w / (points.length - 1);
  const coords = points.map((p, i) => [i * step, height - (p / max) * (height - 8) - 4] as const);
  const d = coords.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = `${d} L${w},${height} L0,${height} Z`;
  const [lx, ly] = coords[coords.length - 1];
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none" role="img" aria-label="Clarity Index trend">
      <defs>
        <linearGradient id="spark" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#C9A962" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#C9A962" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#spark)" />
      <path d={d} fill="none" stroke="#C9A962" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      <circle cx={lx} cy={ly} r="4" fill="#E8D5A3" />
    </svg>
  );
}
