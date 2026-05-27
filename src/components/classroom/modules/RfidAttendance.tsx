import { useState } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import { CreditCard, RotateCcw } from "lucide-react";

// Software replacement for RFID reader: virtual card tap.
export function RfidAttendance() {
  const { students, checkIn, checkOutAll, log } = useClassroom();
  const [manual, setManual] = useState("");
  const [lastScan, setLastScan] = useState<{ ok: boolean; msg: string } | null>(null);

  function tap(rfid: string) {
    const s = students.find((x) => x.rfid.toLowerCase() === rfid.toLowerCase().trim());
    if (!s) {
      log("RFID", `Rejected unknown tag ${rfid}`, "error");
      setLastScan({ ok: false, msg: `Unknown tag: ${rfid}` });
      return;
    }
    checkIn(s.id, "rfid");
    setLastScan({ ok: true, msg: `${s.name} (${rfid}) — recorded` });
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><CreditCard className="w-6 h-6 text-primary" /> RFID Attendance</h1>
        <p className="text-sm text-muted-foreground">Hardware replacement: virtual RFID card tap simulating contactless detection (Betty module).</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="RFID reader" subtitle="Tap a virtual card" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {students.map((s) => (
              <button key={s.id} onClick={() => tap(s.rfid)}
                disabled={s.present}
                className="group relative p-4 rounded-lg border border-border bg-gradient-to-br from-secondary to-secondary/40 hover:from-primary/20 hover:to-accent/10 transition-all disabled:opacity-50 text-left">
                <div className="text-xs font-mono text-primary">{s.rfid}</div>
                <div className="text-sm font-medium mt-2">{s.name}</div>
                <div className="text-[10px] text-muted-foreground">{s.id}</div>
                {s.present && <div className="absolute top-2 right-2 text-[10px] text-[color:var(--success)]">✓ in</div>}
              </button>
            ))}
          </div>

          <div className="mt-4 flex gap-2">
            <input value={manual} onChange={(e) => setManual(e.target.value)}
              placeholder="Manual tag entry e.g. RF-1102"
              className="flex-1 px-3 py-2 rounded-md bg-input border border-border text-sm outline-none focus:border-primary" />
            <button onClick={() => { tap(manual); setManual(""); }}
              className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm">Tap</button>
          </div>
          {lastScan && (
            <div className={`mt-3 text-sm px-3 py-2 rounded-md border ${lastScan.ok ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]" : "border-destructive/40 bg-destructive/10 text-destructive-foreground"}`}>
              {lastScan.msg}
            </div>
          )}
        </Panel>

        <Panel title="Session controls">
          <button onClick={checkOutAll}
            className="w-full px-3 py-2 rounded-md bg-secondary border border-border text-sm inline-flex items-center justify-center gap-2 hover:bg-muted">
            <RotateCcw className="w-3.5 h-3.5" /> End session / check out all
          </button>
          <div className="mt-4 space-y-1 text-xs">
            <div className="text-muted-foreground uppercase tracking-wider mb-2">Validation rules</div>
            <Rule label="Duplicate scan within session" status="blocked" />
            <Rule label="Unknown tag" status="rejected" />
            <Rule label="Class active check" status="enforced" />
            <Rule label="Low latency response" status="≈1s" />
          </div>
        </Panel>
      </div>
    </div>
  );
}

function Rule({ label, status }: { label: string; status: string }) {
  return (
    <div className="flex justify-between border-b border-border/40 pb-1">
      <span>{label}</span><span className="text-primary">{status}</span>
    </div>
  );
}
