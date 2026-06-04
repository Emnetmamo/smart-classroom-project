import { useMemo, useState } from "react";
import { useClassroom, type AdminUser } from "@/lib/classroom-store";
import { Panel, Stat } from "../ui";
import {
  Activity, Server, ShieldAlert, FileText, Save, BarChart3, Users,
  Download, Power, AlertTriangle, Lightbulb, Video, MonitorPlay, Wind, Thermometer,
  CheckCircle2, Trash2, Plus, Camera, ScanLine, Cpu,
} from "lucide-react";

type Tab = "monitor" | "devices" | "security" | "audit" | "backup" | "reports" | "users";
const TABS: { id: Tab; label: string; icon: typeof Activity }[] = [
  { id: "monitor", label: "Monitor class status", icon: Activity },
  { id: "devices", label: "Devices management", icon: Server },
  { id: "security", label: "Security", icon: ShieldAlert },
  { id: "audit", label: "Audit logs", icon: FileText },
  { id: "backup", label: "Backup & export", icon: Save },
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "users", label: "User management", icon: Users },
];

export function GeneralAdmin() {
  const [tab, setTab] = useState<Tab>("monitor");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">General Admin</h1>
        <p className="text-sm text-muted-foreground">System-wide oversight: monitoring, devices, security, audit, backup, reports and accounts.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => {
          const Icon = t.icon; const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-xs px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border hover:bg-secondary"}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "monitor" && <MonitorTab />}
      {tab === "devices" && <DevicesTab />}
      {tab === "security" && <SecurityTab />}
      {tab === "audit" && <AuditTab />}
      {tab === "backup" && <BackupTab />}
      {tab === "reports" && <ReportsTab />}
      {tab === "users" && <UsersTab />}
    </div>
  );
}

// -------- Monitor --------
function MonitorTab() {
  const { classrooms, sessions, simNow, devices, sensors, teacherPresent, students, schedule } = useClassroom();
  const dow = simNow.getDay();
  const presentCount = students.filter((s) => s.present).length;
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Classrooms" value={classrooms.length} />
        <Stat label="Active session" value={schedule.active ? "Yes" : "No"} tone={schedule.active ? "good" : undefined} />
        <Stat label="Teacher present" value={teacherPresent ? "Yes" : "No"} tone={teacherPresent ? "good" : undefined} />
        <Stat label="Students checked in" value={`${presentCount}/${students.length}`} />
      </div>

      <Panel title="Room status">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
          {classrooms.map((r) => {
            const inUse = sessions.some((s) => s.classroomId === r.id && s.day === dow && timeIn(s.start, s.end, simNow));
            // Only A304 has live sensor/device feed in the demo
            const isLive = r.name === "A304";
            return (
              <div key={r.id} className={`p-3 rounded-lg border ${inUse ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/5" : "border-border bg-secondary/20"}`}>
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.name}</div>
                  <span className={`text-[10px] uppercase px-1.5 py-0.5 rounded ${inUse ? "bg-[color:var(--success)]/20 text-[color:var(--success)]" : "bg-secondary text-muted-foreground"}`}>{inUse ? "Active" : "Idle"}</span>
                </div>
                <div className="text-xs text-muted-foreground">{r.building} · cap {r.capacity}</div>
                {isLive ? (
                  <div className="mt-2 grid grid-cols-3 gap-1.5 text-[11px]">
                    <Pill icon={Lightbulb} label="Light" on={devices.lightsOn} />
                    <Pill icon={Video} label="Rec" on={devices.recording} />
                    <Pill icon={MonitorPlay} label="Share" on={devices.sharing} />
                    <Pill icon={Users} label="Occupied" on={sensors.presence} />
                    <Pill icon={Wind} label="Vent" on={devices.fanOn} />
                    <Pill icon={Thermometer} label="AC" on={devices.acOn} />
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-muted-foreground">No live telemetry — sensors offline.</div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </>
  );
}
function timeIn(s: string, e: string, now: Date) { const t = now.getHours()*60+now.getMinutes(); const [sh,sm]=s.split(":").map(Number); const [eh,em]=e.split(":").map(Number); return sh*60+sm<=t && t<eh*60+em; }
function Pill({ icon: Icon, label, on }: { icon: typeof Activity; label: string; on: boolean }) {
  return <div className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded border ${on ? "border-[color:var(--success)]/40 bg-[color:var(--success)]/10 text-[color:var(--success)]" : "border-border bg-secondary/30 text-muted-foreground"}`}><Icon className="w-3 h-3" />{label}</div>;
}

// -------- Devices --------
function DevicesTab() {
  const { devices, sensors, log } = useClassroom();
  // Simulated device inventory.
  const devs = [
    { id: "CAM-1", name: "Face-recognition camera (A304)", kind: "Camera", icon: Camera, healthy: true, last: "just now" },
    { id: "RFID-1", name: "RFID reader (A304 door)", kind: "Reader", icon: ScanLine, healthy: true, last: "1m ago" },
    { id: "PROJ-1", name: "Smart projector (A304)", kind: "Projector", icon: MonitorPlay, healthy: devices.sharing || true, last: "live" },
    { id: "MIC-1", name: "Ceiling microphone array", kind: "Mic", icon: Cpu, healthy: true, last: "2m ago" },
    { id: "CAM-2", name: "Face camera (R-322)", kind: "Camera", icon: Camera, healthy: false, last: "30m ago" },
    { id: "SNS-1", name: "Air quality sensor (A304)", kind: "Sensor", icon: Wind, healthy: sensors.co2 < 1500, last: "live" },
  ];
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total devices" value={devs.length} />
        <Stat label="Healthy" value={devs.filter((d) => d.healthy).length} tone="good" />
        <Stat label="Faults" value={devs.filter((d) => !d.healthy).length} tone={devs.some((d) => !d.healthy) ? "bad" : "good"} />
        <Stat label="Streams live" value={(devices.recording ? 1 : 0) + (devices.sharing ? 1 : 0)} />
      </div>
      <Panel title="Inventory">
        <table className="w-full text-sm">
          <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Device</th><th>Type</th><th>Status</th><th>Last seen</th><th></th></tr></thead>
          <tbody>{devs.map((d) => {
            const Icon = d.icon;
            return (
              <tr key={d.id} className="border-b border-border/40">
                <td className="py-2 inline-flex items-center gap-2"><Icon className="w-4 h-4 text-primary" /> <span>{d.name}</span></td>
                <td className="text-xs">{d.kind}</td>
                <td>{d.healthy
                  ? <span className="inline-flex items-center gap-1 text-[11px] text-[color:var(--success)]"><CheckCircle2 className="w-3 h-3" /> Healthy</span>
                  : <span className="inline-flex items-center gap-1 text-[11px] text-destructive-foreground"><AlertTriangle className="w-3 h-3" /> Fault</span>}</td>
                <td className="text-xs text-muted-foreground">{d.last}</td>
                <td className="text-right">
                  <button onClick={() => log("Devices", `Restarted ${d.name}`, d.healthy ? "info" : "success")} className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary inline-flex items-center gap-1"><Power className="w-3 h-3" /> Restart</button>
                </td>
              </tr>
            );
          })}</tbody>
        </table>
      </Panel>
    </>
  );
}

// -------- Security --------
function SecurityTab() {
  const { audit, addAudit, students, teachers, adminUsers } = useClassroom();
  const failedLogins = audit.filter((a) => a.action === "login.fail");
  const recent = failedLogins.slice(0, 5);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Failed logins (24h)" value={failedLogins.length} tone={failedLogins.length ? "warn" : "good"} />
        <Stat label="Active sessions" value={1} />
        <Stat label="Accounts" value={students.length + teachers.length + adminUsers.length} />
        <Stat label="MFA enabled" value="—" />
      </div>
      <Panel title="Security posture">
        <ul className="text-sm space-y-2">
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[color:var(--success)]" /> Role-based access (System, Instructor, Student, Coordinator, Admin)</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[color:var(--success)]" /> Login attempts logged with IP and device</li>
          <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-[color:var(--success)]" /> Auto-deactivation available per account</li>
          <li className="flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[color:var(--warning)]" /> MFA / SSO: not yet wired (demo accounts only)</li>
        </ul>
      </Panel>
      <Panel title="Recent failed logins" subtitle="Use the audit log tab for the full history.">
        {recent.length === 0 ? <p className="text-sm text-muted-foreground">No failed attempts.</p> : (
          <ul className="text-xs font-mono space-y-1">
            {recent.map((r) => (<li key={r.id} className="flex justify-between border-b border-border/40 py-1"><span>{r.time} · {r.actorRole}:{r.actorName}</span><span className="text-muted-foreground">{r.target ?? ""} · {r.ip ?? ""}</span></li>))}
          </ul>
        )}
        <button onClick={() => addAudit({ actorRole: "admin", actorName: "General Admin", action: "security.review", target: "manual ack", level: "info" })}
          className="mt-3 text-xs px-2.5 py-1 rounded border border-border hover:bg-secondary">Acknowledge review</button>
      </Panel>
    </>
  );
}

// -------- Audit --------
function AuditTab() {
  const { audit } = useClassroom();
  const [filter, setFilter] = useState<string>("all");
  const filtered = audit.filter((a) => filter === "all" ? true : a.actorRole === filter);
  function exportCSV() {
    const headers = ["Time", "Role", "Actor", "Action", "Target", "IP", "Device", "Level"];
    const rows = filtered.map((r) => [r.time, r.actorRole, r.actorName, r.action, r.target ?? "", r.ip ?? "", (r.userAgent ?? "").slice(0, 120), r.level].map((v) => `"${String(v).replace(/"/g,'""')}"`).join(","));
    const csv = [headers.join(","), ...rows].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = `audit-${new Date().toISOString().slice(0,10)}.csv`; a.click();
  }
  return (
    <Panel title={`Audit log (${filtered.length})`} subtitle="Every login, account change and admin action with IP + device fingerprint."
      action={<button onClick={exportCSV} disabled={!filtered.length} className="text-xs px-2.5 py-1.5 rounded bg-primary text-primary-foreground inline-flex items-center gap-1.5 disabled:opacity-50"><Download className="w-3.5 h-3.5" /> Export CSV</button>}>
      <div className="flex items-center gap-2 mb-3 text-xs">
        <span className="text-muted-foreground">Filter:</span>
        <select className="px-2 py-1 rounded bg-input border border-border" value={filter} onChange={(e) => setFilter(e.target.value)}>
          {["all","student","instructor","coordinator","admin","system"].map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      {filtered.length === 0 ? <p className="text-sm text-muted-foreground">No audit entries yet — log in or out to generate one.</p> : (
        <div className="max-h-[460px] overflow-y-auto">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-card">
              <tr className="text-left text-muted-foreground border-b border-border">
                <th className="py-1.5">Time</th><th>Role</th><th>Actor</th><th>Action</th><th>Target</th><th>IP</th><th>Device</th>
              </tr>
            </thead>
            <tbody>{filtered.map((r) => (
              <tr key={r.id} className="border-b border-border/40">
                <td className="py-1 font-mono">{r.time}</td>
                <td className="uppercase">{r.actorRole}</td>
                <td>{r.actorName}</td>
                <td className={r.level === "warn" ? "text-[color:var(--warning)]" : r.level === "error" ? "text-destructive-foreground" : r.level === "success" ? "text-[color:var(--success)]" : ""}>{r.action}</td>
                <td className="text-muted-foreground">{r.target ?? "—"}</td>
                <td className="font-mono">{r.ip ?? "—"}</td>
                <td className="truncate max-w-[200px] text-muted-foreground" title={r.userAgent}>{(r.userAgent ?? "").split(") ")[0]}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </Panel>
  );
}

// -------- Backup --------
function BackupTab() {
  const { students, teachers, classrooms, courses, sessions, recordings, audit, adminUsers, log } = useClassroom();
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  function bundle(kind: "database" | "config" | "logins") {
    const payload =
      kind === "database" ? { students, teachers, classrooms, courses, sessions, recordings } :
      kind === "config"   ? { adminUsers, classrooms, courses, sessions } :
                            { logins: audit.filter((a) => a.action.startsWith("login.")) };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `backup-${kind}-${new Date().toISOString().slice(0,10)}.json`; a.click();
    setLastBackup(`${kind} · ${new Date().toLocaleString()}`);
    log("Admin", `Backup downloaded: ${kind}`, "success");
  }

  return (
    <>
      <div className="grid md:grid-cols-3 gap-3">
        <Stat label="Last backup" value={lastBackup ? "✓" : "—"} hint={lastBackup ?? "Never run in this session"} />
        <Stat label="DB records" value={students.length + teachers.length + courses.length + sessions.length + classrooms.length} />
        <Stat label="Audit entries" value={audit.length} />
      </div>
      <Panel title="Download backup bundles" subtitle="Each bundle is a JSON snapshot you can store off-system or import later.">
        <div className="grid sm:grid-cols-3 gap-3">
          <BackupCard title="Database" desc="Students, teachers, courses, classrooms, sessions, recordings." onClick={() => bundle("database")} />
          <BackupCard title="Configuration" desc="Admin accounts and room/course/session setup." onClick={() => bundle("config")} />
          <BackupCard title="Login history" desc="All login.success / login.fail audit entries." onClick={() => bundle("logins")} />
        </div>
      </Panel>
    </>
  );
}
function BackupCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-secondary/30">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      <button onClick={onClick} className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-primary text-primary-foreground"><Download className="w-3.5 h-3.5" /> Export</button>
    </div>
  );
}

// -------- Reports --------
function ReportsTab() {
  const { teacherAttendance, studentAttendance, recordings, devices, log } = useClassroom();
  const teacherOnTime = teacherAttendance.filter((r) => r.lateness === "on-time").length;
  const teacherLate = teacherAttendance.filter((r) => r.lateness === "late").length;
  const studentPresent = studentAttendance.filter((r) => r.present).length;
  const studentAbsent = studentAttendance.filter((r) => !r.present).length;

  function exportTeachers() {
    csv("teacher-attendance.csv", ["Date","Teacher","Course","Mode","Check-in","Check-out","Lateness"],
      teacherAttendance.map((r) => [r.date,r.teacherName,r.courseName,r.scheduleMode,r.checkInTime,r.checkOutTime??"",r.lateness]));
    log("Admin", "Report: teacher attendance exported", "success");
  }
  function exportStudents() {
    csv("student-attendance.csv", ["Date","Student","Course","Method","Check-in","Present","Lateness"],
      studentAttendance.map((r) => [r.date,r.studentName,r.courseName,r.method??"",r.checkInTime??"",r.present?"yes":"no",r.lateness??""]));
    log("Admin", "Report: student attendance exported", "success");
  }
  function exportDeviceUsage() {
    csv("device-usage.csv", ["Recording","Sharing","Lights","AC","Heater","Fan","Purifier","RecordingsSaved"],
      [[devices.recording,devices.sharing,devices.lightsOn,devices.acOn,devices.heaterOn,devices.fanOn,devices.purifierOn,recordings.length].map(String)]);
    log("Admin", "Report: device usage exported", "success");
  }

  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Teacher sign-ins" value={teacherAttendance.length} />
        <Stat label="Late arrivals" value={teacherLate} tone={teacherLate ? "bad" : "good"} />
        <Stat label="Student present" value={studentPresent} tone="good" />
        <Stat label="Student absent" value={studentAbsent} tone={studentAbsent ? "warn" : "good"} />
      </div>

      <Panel title="Generate reports">
        <div className="grid sm:grid-cols-3 gap-3">
          <ReportCard title="Teacher attendance" desc={`${teacherAttendance.length} entries · ${teacherOnTime} on-time, ${teacherLate} late`} onClick={exportTeachers} />
          <ReportCard title="Student attendance" desc={`${studentAttendance.length} entries (snapshot per ended session)`} onClick={exportStudents} />
          <ReportCard title="Device usage" desc={`${recordings.length} recordings · live device state included`} onClick={exportDeviceUsage} />
        </div>
      </Panel>
    </>
  );
}
function ReportCard({ title, desc, onClick }: { title: string; desc: string; onClick: () => void }) {
  return (
    <div className="p-4 rounded-lg border border-border bg-secondary/30">
      <div className="font-medium">{title}</div>
      <div className="text-xs text-muted-foreground mt-1">{desc}</div>
      <button onClick={onClick} className="mt-3 inline-flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded bg-primary text-primary-foreground"><Download className="w-3.5 h-3.5" /> Download CSV</button>
    </div>
  );
}
function csv(filename: string, headers: string[], rows: (string|number|boolean)[][]) {
  const out = [headers.join(","), ...rows.map((r) => r.map((v) => `"${String(v).replace(/"/g,'""')}"`).join(","))].join("\n");
  const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([out], { type: "text/csv" })); a.download = filename; a.click();
}

// -------- User management --------
function UsersTab() {
  const { students, teachers, adminUsers, setStudentActive, setTeacherActive, setAdminActive, upsertAdminUser, deleteAdminUser, addAudit } = useClassroom();
  const [group, setGroup] = useState<"students" | "teachers" | "admins">("students");
  const [newUser, setNewUser] = useState<AdminUser | null>(null);

  function toggle(kind: "student"|"teacher"|"admin", id: string, name: string, current: boolean) {
    const next = !current;
    if (kind === "student") setStudentActive(id, next);
    else if (kind === "teacher") setTeacherActive(id, next);
    else setAdminActive(id, next);
    addAudit({ actorRole: "admin", actorName: "General Admin", action: next ? "user.activate" : "user.deactivate", target: `${kind}:${name}`, level: next ? "success" : "warn" });
  }

  return (
    <>
      <div className="flex gap-2 flex-wrap">
        {(["students","teachers","admins"] as const).map((g) => (
          <button key={g} onClick={() => setGroup(g)} className={`text-xs px-3 py-1.5 rounded-md border ${group===g ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border"}`}>{g}</button>
        ))}
        {group === "admins" && (
          <button onClick={() => setNewUser({ id: "", username: "", name: "", role: "coordinator", active: true })} className="ml-auto text-xs px-2.5 py-1.5 rounded bg-accent text-accent-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add admin user</button>
        )}
      </div>

      {group === "students" && (
        <Panel title={`Students (${students.length})`}>
          <UserTable rows={students.map((s) => ({ id: s.id, name: s.name, email: s.email, active: s.active !== false }))} onToggle={(id,name,cur) => toggle("student", id, name, cur)} />
        </Panel>
      )}
      {group === "teachers" && (
        <Panel title={`Instructors (${teachers.length})`}>
          <UserTable rows={teachers.map((t) => ({ id: t.id, name: t.name, email: t.email, active: t.active !== false }))} onToggle={(id,name,cur) => toggle("teacher", id, name, cur)} />
        </Panel>
      )}
      {group === "admins" && (
        <Panel title={`Admin & Coordinator accounts (${adminUsers.length})`}>
          <table className="w-full text-sm">
            <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Username</th><th>Name</th><th>Role</th><th>Status</th><th></th></tr></thead>
            <tbody>{adminUsers.map((u) => (
              <tr key={u.id} className="border-b border-border/40">
                <td className="py-2 font-mono text-xs">{u.username}</td>
                <td>{u.name}</td>
                <td className="text-xs uppercase">{u.role}</td>
                <td>{u.active
                  ? <span className="text-[11px] text-[color:var(--success)]">Active</span>
                  : <span className="text-[11px] text-muted-foreground">Disabled</span>}</td>
                <td className="text-right space-x-1">
                  <button onClick={() => toggle("admin", u.id, u.name, u.active)} className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary">{u.active ? "Deactivate" : "Activate"}</button>
                  <button onClick={() => { deleteAdminUser(u.id); addAudit({ actorRole: "admin", actorName: "General Admin", action: "user.delete", target: `admin:${u.name}`, level: "warn" }); }} className="text-xs px-2 py-1 rounded border border-destructive/40 hover:bg-destructive/10 inline-flex items-center gap-1"><Trash2 className="w-3 h-3" /></button>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {newUser && (
            <form onSubmit={(e) => { e.preventDefault(); const u = { ...newUser, id: newUser.id || `U-${Date.now().toString(36).toUpperCase()}` }; upsertAdminUser(u); addAudit({ actorRole: "admin", actorName: "General Admin", action: "user.create", target: `${u.role}:${u.name}`, level: "success" }); setNewUser(null); }}
              className="mt-4 grid sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-secondary/30">
              <Input label="Username" value={newUser.username} onChange={(v) => setNewUser({ ...newUser, username: v })} required />
              <Input label="Display name" value={newUser.name} onChange={(v) => setNewUser({ ...newUser, name: v })} required />
              <label className="block text-xs"><div className="text-muted-foreground mb-1">Role</div>
                <select className="w-full px-2.5 py-1.5 rounded bg-input border border-border text-sm" value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value as "coordinator" | "admin" })}>
                  <option value="coordinator">Coordinator</option><option value="admin">Admin</option>
                </select></label>
              <div className="sm:col-span-2 flex gap-2"><button className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Save</button><button type="button" onClick={() => setNewUser(null)} className="px-3 py-1.5 rounded border border-border text-sm">Cancel</button></div>
            </form>
          )}
        </Panel>
      )}
    </>
  );
}
function Input({ label, value, onChange, required }: { label: string; value: string; onChange: (v: string) => void; required?: boolean }) {
  return <label className="block text-xs"><div className="text-muted-foreground mb-1">{label}</div>
    <input className="w-full px-2.5 py-1.5 rounded bg-input border border-border text-sm" value={value} onChange={(e) => onChange(e.target.value)} required={required} /></label>;
}
function UserTable({ rows, onToggle }: { rows: { id: string; name: string; email: string; active: boolean }[]; onToggle: (id: string, name: string, current: boolean) => void }) {
  return (
    <table className="w-full text-sm">
      <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">ID</th><th>Name</th><th>Email</th><th>Status</th><th></th></tr></thead>
      <tbody>{rows.map((r) => (
        <tr key={r.id} className="border-b border-border/40">
          <td className="py-2 font-mono text-xs">{r.id}</td>
          <td>{r.name}</td>
          <td className="text-xs">{r.email}</td>
          <td>{r.active ? <span className="text-[11px] text-[color:var(--success)]">Active</span> : <span className="text-[11px] text-muted-foreground">Disabled</span>}</td>
          <td className="text-right"><button onClick={() => onToggle(r.id, r.name, r.active)} className={`text-xs px-2 py-1 rounded border ${r.active ? "border-border" : "border-[color:var(--success)]/40 text-[color:var(--success)]"} hover:bg-secondary`}>{r.active ? "Deactivate" : "Activate"}</button></td>
        </tr>
      ))}</tbody>
    </table>
  );
}
