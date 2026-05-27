import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ title, subtitle, children, className, action }: {
  title?: string; subtitle?: string; children: ReactNode; className?: string; action?: ReactNode;
}) {
  return (
    <section className={cn("bg-card/60 backdrop-blur border border-border rounded-xl p-5", className)}>
      {(title || action) && (
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            {title && <h3 className="font-semibold">{title}</h3>}
            {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function Stat({ label, value, hint, tone = "default" }: {
  label: string; value: ReactNode; hint?: string; tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls = {
    default: "text-foreground",
    good: "text-[color:var(--success)]",
    warn: "text-[color:var(--warning)]",
    bad: "text-[color:var(--destructive)]",
  }[tone];
  return (
    <div className="bg-secondary/40 rounded-lg p-4 border border-border/50">
      <div className="text-xs text-muted-foreground uppercase tracking-wider">{label}</div>
      <div className={cn("text-2xl font-semibold mt-1", toneCls)}>{value}</div>
      {hint && <div className="text-xs text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

export function Pill({ on, label }: { on: boolean; label: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border",
      on ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]"
         : "border-border bg-muted text-muted-foreground")}>
      <span className={cn("w-1.5 h-1.5 rounded-full", on ? "bg-[color:var(--success)]" : "bg-muted-foreground")} />
      {label} {on ? "ON" : "OFF"}
    </span>
  );
}

export function Slider({ value, min, max, step = 1, onChange, label, unit }: {
  value: number; min: number; max: number; step?: number; onChange: (v: number) => void; label: string; unit?: string;
}) {
  return (
    <label className="block">
      <div className="flex justify-between text-xs mb-1.5">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono">{value.toFixed(step < 1 ? 1 : 0)}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-[color:var(--primary)]"
      />
    </label>
  );
}
