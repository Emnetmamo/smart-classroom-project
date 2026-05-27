import { useClassroom } from "@/lib/classroom-store";
import { Panel, Stat } from "../ui";
import { Eye, AlertTriangle } from "lucide-react";

export function AttentionMonitor() {
  const { students, setAttention, log } = useClassroom();
  const present = students.filter((s) => s.present);
  const avg = present.length ? Math.round(present.reduce((a, s) => a + (s.attention ?? 0), 0) / present.length) : 0;
  const lows = present.filter((s) => (s.attention ?? 0) < 50);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Eye className="w-6 h-6 text-primary" /> Student Attention Monitor</h1>
        <p className="text-sm text-muted-foreground">Hardware replacement: simulated CV pipeline outputs (Amanuel module). Depends on attendance for identity.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Monitored" value={present.length} hint="present students" />
        <Stat label="Avg attention" value={`${avg}%`} tone={avg < 50 ? "bad" : avg < 70 ? "warn" : "good"} />
        <Stat label="At-risk" value={lows.length} tone={lows.length ? "warn" : "good"} hint="below 50%" />
        <Stat label="Alerts sent" value={lows.length} hint="to instructor" />
      </div>

      <Panel title="Per-student attention" subtitle="Auto-updates from CV pipeline. Drag sliders to simulate.">
        {present.length === 0 && <p className="text-sm text-muted-foreground">No students checked in. Mark attendance to monitor.</p>}
        <div className="space-y-3">
          {present.map((s) => {
            const a = s.attention ?? 0;
            const tone = a < 50 ? "var(--destructive)" : a < 70 ? "var(--warning)" : "var(--success)";
            return (
              <div key={s.id} className="grid grid-cols-12 items-center gap-3">
                <div className="col-span-3 text-sm">{s.name}</div>
                <div className="col-span-7">
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div className="h-full transition-all" style={{ width: `${a}%`, background: tone }} />
                  </div>
                </div>
                <div className="col-span-1 text-sm font-mono text-right">{Math.round(a)}%</div>
                <div className="col-span-1">
                  <input type="range" min={0} max={100} value={a} onChange={(e) => setAttention(s.id, Number(e.target.value))}
                    className="w-full accent-[color:var(--primary)]" />
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      {lows.length > 0 && (
        <Panel title="Teacher alerts" className="border-[color:var(--warning)]/40">
          <div className="space-y-2">
            {lows.map((s) => (
              <div key={s.id} className="flex items-center gap-2 text-sm text-[color:var(--warning)]">
                <AlertTriangle className="w-4 h-4" /> Low attention: {s.name} ({Math.round(s.attention ?? 0)}%)
                <button onClick={() => log("Attention", `Instructor notified about ${s.name}`, "warn")}
                  className="ml-auto text-xs px-2 py-1 rounded border border-border hover:bg-secondary">Notify</button>
              </div>
            ))}
          </div>
        </Panel>
      )}
    </div>
  );
}
