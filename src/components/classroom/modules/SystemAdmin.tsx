import { useState } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel, Stat } from "../ui";
import { ShieldCheck, Users, HardDrive, FileText, Activity, Save, Settings2 } from "lucide-react";

const RESPONSIBILITIES = [
  { id: "users", label: "Manage Users", icon: Users, desc: "Create, modify, remove accounts. Assign roles." },
  { id: "devices", label: "Configure Devices", icon: Settings2, desc: "Calibrate cameras, RFID readers, sensors." },
  { id: "security", label: "Manage Security", icon: ShieldCheck, desc: "Roles, permissions, authentication policies." },
  { id: "monitor", label: "Monitor System", icon: Activity, desc: "Watch health, performance, alerts." },
  { id: "backup", label: "System Backup", icon: Save, desc: "Daily + weekly backups. Verify integrity." },
  { id: "audit", label: "View Audit Logs", icon: FileText, desc: "Tamper-proof log of every action." },
  { id: "reports", label: "Generate Reports", icon: HardDrive, desc: "Attendance, usage, device health stats." },
] as const;

export function SystemAdmin() {
  const { logs, students, devices, log, setSchedule, schedule } = useClassroom();
  const [course, setCourse] = useState(schedule.course);
  const [instructor, setInstructor] = useState(schedule.instructor);
  const [backupAt, setBackupAt] = useState<string | null>(null);

  function runBackup() {
    setBackupAt(new Date().toLocaleString());
    log("Admin", "Full system backup completed · integrity verified", "success");
  }
  function downloadReport() {
    const rep = {
      generatedAt: new Date().toISOString(),
      course: schedule,
      attendance: students,
      devices,
      recentEvents: logs.slice(0, 50),
    };
    const blob = new Blob([JSON.stringify(rep, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "smart-classroom-report.json"; a.click();
    log("Admin", "Report generated and downloaded", "success");
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ShieldCheck className="w-6 h-6 text-primary" /> System Administration</h1>
        <p className="text-sm text-muted-foreground">7 core responsibilities of the smart classroom administrator.</p>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Users" value={students.length} hint="enrolled" />
        <Stat label="Active devices" value={Object.values(devices).filter(Boolean).length} />
        <Stat label="Audit events" value={logs.length} />
        <Stat label="Last backup" value={backupAt ? "✓" : "—"} hint={backupAt ?? "never run"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Responsibilities">
          <div className="grid sm:grid-cols-2 gap-3">
            {RESPONSIBILITIES.map((r) => {
              const Icon = r.icon;
              return (
                <div key={r.id} className="p-3 rounded-lg border border-border bg-secondary/30">
                  <div className="flex items-center gap-2 text-sm font-medium"><Icon className="w-4 h-4 text-primary" /> {r.label}</div>
                  <div className="text-xs text-muted-foreground mt-1">{r.desc}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Quick actions">
          <div className="space-y-3">
            <div>
              <div className="text-xs text-muted-foreground mb-1">Course</div>
              <input value={course} onChange={(e) => setCourse(e.target.value)} className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm" />
            </div>
            <div>
              <div className="text-xs text-muted-foreground mb-1">Instructor</div>
              <input value={instructor} onChange={(e) => setInstructor(e.target.value)} className="w-full px-3 py-2 rounded-md bg-input border border-border text-sm" />
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { setSchedule({ course, instructor }); log("Admin", "Schedule updated"); }}
                className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm">Save schedule</button>
              <button onClick={() => setSchedule({ active: !schedule.active })}
                className="px-3 py-2 rounded-md bg-secondary border border-border text-sm">{schedule.active ? "End" : "Start"} session</button>
              <button onClick={runBackup} className="px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm inline-flex items-center gap-2"><Save className="w-4 h-4" /> Run backup</button>
              <button onClick={downloadReport} className="px-3 py-2 rounded-md bg-secondary border border-border text-sm">Generate report</button>
            </div>
          </div>
        </Panel>
      </div>

      <Panel title="Audit log" subtitle="Tamper-proof system activity record">
        <div className="max-h-[400px] overflow-y-auto text-xs font-mono space-y-1">
          {logs.length === 0 && <p className="text-muted-foreground">No events.</p>}
          {logs.map((l) => (
            <div key={l.id} className="grid grid-cols-12 gap-2 border-b border-border/40 py-1">
              <span className="col-span-2 text-muted-foreground">{l.time}</span>
              <span className="col-span-2 text-primary">{l.module}</span>
              <span className={`col-span-7 ${l.level === "error" ? "text-destructive-foreground" : l.level === "warn" ? "text-[color:var(--warning)]" : l.level === "success" ? "text-[color:var(--success)]" : ""}`}>{l.message}</span>
              <span className="col-span-1 text-right uppercase opacity-60">{l.level}</span>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
