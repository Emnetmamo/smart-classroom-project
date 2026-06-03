import { useMemo, useState } from "react";
import { useClassroom, DAY_LABELS, type Student, type Teacher, type Classroom, type Course, type SessionRow } from "@/lib/classroom-store";
import { Panel, Stat } from "../ui";
import {
  LayoutDashboard, Users, GraduationCap, Building2, BookOpen, CalendarPlus, CalendarDays,
  BarChart3, Download, Mail, Bell, Trash2, Pencil, Plus, Printer, UserCheck,
} from "lucide-react";

type Tab = "dashboard" | "instructors" | "students" | "classrooms" | "courses" | "schedule-add" | "schedule-view" | "teacher-attendance" | "analytics" | "export" | "bulk-email" | "notifications";

const TABS: { id: Tab; label: string; icon: typeof Users }[] = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "instructors", label: "Instructors", icon: GraduationCap },
  { id: "students", label: "Students", icon: Users },
  { id: "classrooms", label: "Classrooms", icon: Building2 },
  { id: "courses", label: "Courses", icon: BookOpen },
  { id: "schedule-add", label: "Schedule course", icon: CalendarPlus },
  { id: "schedule-view", label: "View schedule", icon: CalendarDays },
  { id: "teacher-attendance", label: "Teacher attendance", icon: UserCheck },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "export", label: "Export", icon: Download },
  { id: "bulk-email", label: "Bulk emails", icon: Mail },
  { id: "notifications", label: "Notifications", icon: Bell },
];

export function CoordinatorWorkspace() {
  const [tab, setTab] = useState<Tab>("dashboard");
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Coordinator Workspace</h1>
        <p className="text-sm text-muted-foreground">Manage instructors, students, classrooms, courses, schedule and analytics.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-border pb-3">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`text-xs px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${active ? "bg-primary text-primary-foreground border-primary" : "bg-secondary/40 border-border hover:bg-secondary"}`}>
              <Icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "instructors" && <InstructorsTab />}
      {tab === "students" && <StudentsTab />}
      {tab === "classrooms" && <ClassroomsTab />}
      {tab === "courses" && <CoursesTab />}
      {tab === "schedule-add" && <ScheduleAddTab />}
      {tab === "schedule-view" && <ScheduleViewTab />}
      {tab === "analytics" && <AnalyticsTab />}
      {tab === "export" && <ExportTab />}
      {tab === "bulk-email" && <BulkEmailTab />}
      {tab === "notifications" && <NotificationsTab />}
    </div>
  );
}

// -------- Dashboard --------
function DashboardTab() {
  const { teachers, courses, classrooms, sessions, simNow } = useClassroom();
  const dow = simNow.getDay();
  const today = sessions.filter((s) => s.day === dow);
  const upcoming = sessions.filter((s) => s.day === dow && timeAfter(s.start, simNow)).slice(0, 5);
  return (
    <>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Instructors" value={teachers.length} />
        <Stat label="Courses" value={courses.length} />
        <Stat label="Classrooms" value={classrooms.length} />
        <Stat label="Scheduled sessions" value={sessions.length} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Panel title={`Today's schedule · ${DAY_LABELS[dow]}`}>
          {today.length === 0 && <p className="text-sm text-muted-foreground">No sessions today.</p>}
          <div className="space-y-2">
            {today.map((s) => {
              const c = courses.find((x) => x.id === s.courseId);
              const t = teachers.find((x) => x.id === s.instructorId);
              const r = classrooms.find((x) => x.id === s.classroomId);
              return (
                <div key={s.id} className="flex items-center justify-between text-sm border-b border-border/40 pb-1.5">
                  <div><div className="font-medium">{c?.code} · {c?.name}</div><div className="text-xs text-muted-foreground">{t?.name} · Room {r?.name}</div></div>
                  <div className="text-xs font-mono">{s.start}–{s.end}</div>
                </div>
              );
            })}
          </div>
        </Panel>

        <Panel title="Upcoming">
          {upcoming.length === 0 && <p className="text-sm text-muted-foreground">No more sessions today.</p>}
          <div className="space-y-2">
            {upcoming.map((s) => {
              const c = courses.find((x) => x.id === s.courseId);
              return <div key={s.id} className="text-sm flex justify-between"><span>{c?.code}</span><span className="text-xs text-muted-foreground">{s.start}</span></div>;
            })}
          </div>
        </Panel>

        <Panel title="Rooms status">
          <div className="grid grid-cols-3 gap-3">
            {classrooms.map((r) => {
              const inUse = sessions.some((s) => s.classroomId === r.id && s.day === dow && timeNowIn(s.start, s.end, simNow));
              return (
                <div key={r.id} className={`p-3 rounded-md border ${inUse ? "border-destructive/40 bg-destructive/10" : "border-[color:var(--success)]/40 bg-[color:var(--success)]/10"}`}>
                  <div className="font-medium text-sm">{r.name}</div>
                  <div className="text-xs text-muted-foreground">{r.building} · {r.capacity} seats</div>
                  <div className={`text-xs mt-1 ${inUse ? "text-destructive-foreground" : "text-[color:var(--success)]"}`}>{inUse ? "In use" : "Available"}</div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>
    </>
  );
}

function timeAfter(hhmm: string, now: Date) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m > now.getHours() * 60 + now.getMinutes();
}
function timeNowIn(start: string, end: string, now: Date) {
  const t = now.getHours() * 60 + now.getMinutes();
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return sh * 60 + sm <= t && t < eh * 60 + em;
}

// -------- Generic table helpers --------
function IconBtn({ onClick, children, danger }: { onClick: () => void; children: React.ReactNode; danger?: boolean }) {
  return <button onClick={onClick} className={`p-1.5 rounded border ${danger ? "border-destructive/40 hover:bg-destructive/10" : "border-border hover:bg-secondary"}`}>{children}</button>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-xs"><div className="text-muted-foreground mb-1">{label}</div>{children}</label>;
}
const inputCls = "w-full px-2.5 py-1.5 rounded-md bg-input border border-border text-sm outline-none focus:border-primary";

// Reusable portrait uploader → stores a data URL on the entity's `avatar`.
function AvatarField({ value, onChange }: { value?: string; onChange: (dataUrl: string | undefined) => void }) {
  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result as string);
    reader.readAsDataURL(file);
  }
  return (
    <Field label="Photo (for face recognition)">
      <div className="flex items-center gap-3">
        {value
          ? <img src={value} alt="portrait" className="w-12 h-12 rounded-full object-cover border border-border" />
          : <div className="w-12 h-12 rounded-full bg-secondary border border-border grid place-items-center text-[10px] text-muted-foreground">none</div>}
        <input type="file" accept="image/*" onChange={onFile} className="text-xs" />
        {value && <button type="button" onClick={() => onChange(undefined)} className="text-xs px-2 py-1 rounded border border-border">Remove</button>}
      </div>
    </Field>
  );
}


// -------- Instructors --------
function InstructorsTab() {
  const { teachers, upsertTeacher, deleteTeacher, log } = useClassroom();
  const [edit, setEdit] = useState<Teacher | null>(null);
  const blank: Teacher = { id: "", username: "", name: "", email: "", phone: "", department: "Computer Science" };
  return (
    <Panel title="Instructors" action={<button onClick={() => setEdit(blank)} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Photo</th><th>Emp ID</th><th>Name</th><th>Email</th><th>Phone</th><th>Department</th><th></th></tr></thead>
        <tbody>{teachers.map((t) => (
          <tr key={t.id} className="border-b border-border/40">
            <td className="py-2">{t.avatar ? <img src={t.avatar} alt={t.name} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-secondary border border-border grid place-items-center text-[10px] text-muted-foreground">{t.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>}</td>
            <td className="font-mono text-xs">{t.id}</td><td>{t.name}</td><td className="text-xs">{t.email}</td><td className="text-xs">{t.phone}</td><td className="text-xs">{t.department}</td>
            <td className="text-right space-x-1">
              <IconBtn onClick={() => setEdit(t)}><Pencil className="w-3 h-3" /></IconBtn>
              <IconBtn danger onClick={() => { deleteTeacher(t.id); log("Coordinator", `Deleted instructor ${t.name}`, "warn"); }}><Trash2 className="w-3 h-3" /></IconBtn>
            </td>
          </tr>
        ))}</tbody>
      </table>

      {edit && (
        <form onSubmit={(e) => { e.preventDefault(); const t = { ...edit, id: edit.id || `T-${Date.now().toString(36).toUpperCase()}` }; upsertTeacher(t); log("Coordinator", `Saved instructor ${t.name}`, "success"); setEdit(null); }}
          className="mt-4 grid sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-secondary/30">
          <Field label="Employee ID"><input className={inputCls} value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} placeholder="auto if blank" /></Field>
          <Field label="Username"><input className={inputCls} value={edit.username} onChange={(e) => setEdit({ ...edit, username: e.target.value })} required /></Field>
          <Field label="Full name"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} required /></Field>
          <Field label="Phone"><input className={inputCls} value={edit.phone} onChange={(e) => setEdit({ ...edit, phone: e.target.value })} /></Field>
          <Field label="Department"><input className={inputCls} value={edit.department} onChange={(e) => setEdit({ ...edit, department: e.target.value })} /></Field>
          <div className="sm:col-span-2"><AvatarField value={edit.avatar} onChange={(avatar) => setEdit({ ...edit, avatar })} /></div>
          <div className="sm:col-span-2 flex gap-2"><button className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Save</button><button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 rounded bg-secondary border border-border text-sm">Cancel</button></div>
        </form>
      )}
    </Panel>
  );
}

// -------- Students --------
function StudentsTab() {
  const { students, upsertStudent, deleteStudent, log } = useClassroom();
  const [edit, setEdit] = useState<Student | null>(null);
  const blank: Student = { id: "", name: "", email: "", rfid: "", present: false, attention: 75 };
  return (
    <Panel title={`Students (${students.length})`} action={<button onClick={() => setEdit(blank)} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Photo</th><th>Student ID</th><th>Name</th><th>Email</th><th>RFID</th><th></th></tr></thead>
        <tbody>{students.map((s) => (
          <tr key={s.id} className="border-b border-border/40">
            <td className="py-2">{s.avatar ? <img src={s.avatar} alt={s.name} className="w-8 h-8 rounded-full object-cover" /> : <div className="w-8 h-8 rounded-full bg-secondary border border-border grid place-items-center text-[10px] text-muted-foreground">{s.name.split(" ").map((x) => x[0]).slice(0, 2).join("")}</div>}</td>
            <td className="font-mono text-xs">{s.id}</td><td>{s.name}</td><td className="text-xs">{s.email}</td><td className="text-xs font-mono">{s.rfid}</td>
            <td className="text-right space-x-1">
              <IconBtn onClick={() => setEdit(s)}><Pencil className="w-3 h-3" /></IconBtn>
              <IconBtn danger onClick={() => { deleteStudent(s.id); log("Coordinator", `Deleted student ${s.name}`, "warn"); }}><Trash2 className="w-3 h-3" /></IconBtn>
            </td>
          </tr>
        ))}</tbody>
      </table>

      {edit && (
        <form onSubmit={(e) => { e.preventDefault(); const s = { ...edit, id: edit.id || `GSR/${Math.floor(1000 + Math.random()*9000)}/18` }; upsertStudent(s); log("Coordinator", `Saved student ${s.name}`, "success"); setEdit(null); }}
          className="mt-4 grid sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-secondary/30">
          <Field label="Student ID"><input className={inputCls} value={edit.id} onChange={(e) => setEdit({ ...edit, id: e.target.value })} placeholder="auto if blank" /></Field>
          <Field label="Full name"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
          <Field label="Email"><input className={inputCls} type="email" value={edit.email} onChange={(e) => setEdit({ ...edit, email: e.target.value })} required /></Field>
          <Field label="RFID tag"><input className={inputCls} value={edit.rfid} onChange={(e) => setEdit({ ...edit, rfid: e.target.value })} required /></Field>
          <div className="sm:col-span-2"><AvatarField value={edit.avatar} onChange={(avatar) => setEdit({ ...edit, avatar })} /></div>
          <div className="sm:col-span-2 flex gap-2"><button className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Save</button><button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 rounded bg-secondary border border-border text-sm">Cancel</button></div>
        </form>
      )}
    </Panel>
  );
}

// -------- Classrooms --------
function ClassroomsTab() {
  const { classrooms, upsertClassroom, deleteClassroom, log } = useClassroom();
  const [edit, setEdit] = useState<Classroom | null>(null);
  const blank: Classroom = { id: "", name: "", capacity: 30, building: "Block A", floor: "1st", equipment: [] };
  return (
    <Panel title="Classrooms" action={<button onClick={() => setEdit(blank)} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Name</th><th>Capacity</th><th>Building</th><th>Floor</th><th>Equipment</th><th></th></tr></thead>
        <tbody>{classrooms.map((c) => (
          <tr key={c.id} className="border-b border-border/40">
            <td className="py-2">{c.name}</td><td>{c.capacity}</td><td className="text-xs">{c.building}</td><td className="text-xs">{c.floor}</td><td className="text-xs">{c.equipment.join(", ")}</td>
            <td className="text-right space-x-1">
              <IconBtn onClick={() => setEdit(c)}><Pencil className="w-3 h-3" /></IconBtn>
              <IconBtn danger onClick={() => { deleteClassroom(c.id); log("Coordinator", `Deleted classroom ${c.name}`, "warn"); }}><Trash2 className="w-3 h-3" /></IconBtn>
            </td>
          </tr>
        ))}</tbody>
      </table>
      {edit && (
        <form onSubmit={(e) => { e.preventDefault(); const c = { ...edit, id: edit.id || `R-${edit.name}` }; upsertClassroom(c); log("Coordinator", `Saved classroom ${c.name}`, "success"); setEdit(null); }}
          className="mt-4 grid sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-secondary/30">
          <Field label="Room name"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
          <Field label="Capacity"><input className={inputCls} type="number" value={edit.capacity} onChange={(e) => setEdit({ ...edit, capacity: +e.target.value })} required /></Field>
          <Field label="Building"><input className={inputCls} value={edit.building} onChange={(e) => setEdit({ ...edit, building: e.target.value })} /></Field>
          <Field label="Floor"><input className={inputCls} value={edit.floor} onChange={(e) => setEdit({ ...edit, floor: e.target.value })} /></Field>
          <Field label="Equipment (comma-separated)"><input className={inputCls} value={edit.equipment.join(", ")} onChange={(e) => setEdit({ ...edit, equipment: e.target.value.split(",").map(x => x.trim()).filter(Boolean) })} /></Field>
          <div className="sm:col-span-2 flex gap-2"><button className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Save</button><button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 rounded bg-secondary border border-border text-sm">Cancel</button></div>
        </form>
      )}
    </Panel>
  );
}

// -------- Courses --------
function CoursesTab() {
  const { courses, teachers, upsertCourse, deleteCourse, log } = useClassroom();
  const [edit, setEdit] = useState<Course | null>(null);
  const blank: Course = { id: "", code: "", name: "", instructorId: teachers[0]?.id ?? "", numStudents: 10, durationMin: 60, studentIds: [] };
  return (
    <Panel title="Courses" action={<button onClick={() => setEdit(blank)} className="text-xs px-2.5 py-1 rounded bg-primary text-primary-foreground inline-flex items-center gap-1"><Plus className="w-3 h-3" /> Add</button>}>
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Code</th><th>Name</th><th>Instructor</th><th>#Students</th><th>Duration</th><th></th></tr></thead>
        <tbody>{courses.map((c) => {
          const t = teachers.find((x) => x.id === c.instructorId);
          return (
            <tr key={c.id} className="border-b border-border/40">
              <td className="py-2 font-mono text-xs">{c.code}</td><td>{c.name}</td><td className="text-xs">{t?.name ?? "—"}</td><td>{c.numStudents}</td><td className="text-xs">{c.durationMin} min</td>
              <td className="text-right space-x-1">
                <IconBtn onClick={() => setEdit(c)}><Pencil className="w-3 h-3" /></IconBtn>
                <IconBtn danger onClick={() => { deleteCourse(c.id); log("Coordinator", `Deleted course ${c.code}`, "warn"); }}><Trash2 className="w-3 h-3" /></IconBtn>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
      {edit && (
        <form onSubmit={(e) => { e.preventDefault(); const c = { ...edit, id: edit.id || `C-${Date.now().toString(36).toUpperCase()}` }; upsertCourse(c); log("Coordinator", `Saved course ${c.code}`, "success"); setEdit(null); }}
          className="mt-4 grid sm:grid-cols-2 gap-3 p-4 rounded-lg border border-border bg-secondary/30">
          <Field label="Course code"><input className={inputCls} value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} required /></Field>
          <Field label="Course name"><input className={inputCls} value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} required /></Field>
          <Field label="Instructor">
            <select className={inputCls} value={edit.instructorId} onChange={(e) => setEdit({ ...edit, instructorId: e.target.value })}>
              {teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Number of students"><input className={inputCls} type="number" value={edit.numStudents} onChange={(e) => setEdit({ ...edit, numStudents: +e.target.value })} /></Field>
          <Field label="Duration (min)"><input className={inputCls} type="number" value={edit.durationMin} onChange={(e) => setEdit({ ...edit, durationMin: +e.target.value })} /></Field>
          <div className="sm:col-span-2 flex gap-2"><button className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm">Save</button><button type="button" onClick={() => setEdit(null)} className="px-3 py-1.5 rounded bg-secondary border border-border text-sm">Cancel</button></div>
        </form>
      )}
    </Panel>
  );
}

// -------- Schedule add --------
function ScheduleAddTab() {
  const { courses, classrooms, teachers, sessions, upsertSession, log } = useClassroom();
  const [form, setForm] = useState<SessionRow>({
    id: "", courseId: courses[0]?.id ?? "", classroomId: classrooms[0]?.id ?? "",
    instructorId: courses[0]?.instructorId ?? teachers[0]?.id ?? "",
    day: 1, start: "08:30", end: "09:30", kind: "regular",
  });
  const conflict = sessions.find((s) => s.id !== form.id && s.day === form.day && s.classroomId === form.classroomId && overlap(s.start, s.end, form.start, form.end));

  return (
    <Panel title="Schedule a course">
      <form onSubmit={(e) => { e.preventDefault(); if (conflict) return; const s = { ...form, id: form.id || `S-${Date.now().toString(36).toUpperCase()}` }; upsertSession(s); log("Coordinator", `Scheduled ${s.kind} session ${s.start}–${s.end}`, "success"); setForm({ ...form, id: "" }); }}
        className="grid sm:grid-cols-2 gap-3">
        <Field label="Course"><select className={inputCls} value={form.courseId} onChange={(e) => { const c = courses.find((x) => x.id === e.target.value); setForm({ ...form, courseId: e.target.value, instructorId: c?.instructorId ?? form.instructorId }); }}>{courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}</select></Field>
        <Field label="Classroom"><select className={inputCls} value={form.classroomId} onChange={(e) => setForm({ ...form, classroomId: e.target.value })}>{classrooms.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}</select></Field>
        <Field label="Instructor"><select className={inputCls} value={form.instructorId} onChange={(e) => setForm({ ...form, instructorId: e.target.value })}>{teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}</select></Field>
        <Field label="Day">
          <select className={inputCls} value={form.day} onChange={(e) => setForm({ ...form, day: +e.target.value })}>
            {[1, 2, 3, 4, 5, 6].map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}
          </select>
        </Field>
        <Field label="Start"><input className={inputCls} type="time" value={form.start} onChange={(e) => setForm({ ...form, start: e.target.value })} required /></Field>
        <Field label="End"><input className={inputCls} type="time" value={form.end} onChange={(e) => setForm({ ...form, end: e.target.value })} required /></Field>
        <Field label="Type">
          <select className={inputCls} value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value as "regular" | "makeup" })}>
            <option value="regular">Regular class</option>
            <option value="makeup">Makeup class</option>
          </select>
        </Field>
        <div className="sm:col-span-2 flex items-center gap-3">
          <button disabled={!!conflict} className="px-3 py-1.5 rounded bg-primary text-primary-foreground text-sm disabled:opacity-50">Add to schedule</button>
          {conflict && <span className="text-xs text-destructive-foreground">Conflicts with another booking in this room.</span>}
        </div>
      </form>
    </Panel>
  );
}
function overlap(a1: string, a2: string, b1: string, b2: string) {
  const toM = (h: string) => { const [x, y] = h.split(":").map(Number); return x * 60 + y; };
  return toM(a1) < toM(b2) && toM(b1) < toM(a2);
}

// -------- Schedule view --------
function ScheduleViewTab() {
  const { sessions, courses, classrooms, teachers, upsertSession, deleteSession, log } = useClassroom();
  const [editingId, setEditingId] = useState<string | null>(null);
  const sorted = [...sessions].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  return (
    <Panel title="Schedule" subtitle="Edit time/day/room/instructor — conflicts in the same room are blocked.">
      <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Day</th><th>Time</th><th>Course</th><th>Instructor</th><th>Room</th><th>Type</th><th className="text-right">Actions</th></tr></thead>
        <tbody>{sorted.map((s) => {
          const c = courses.find((x) => x.id === s.courseId);
          const t = teachers.find((x) => x.id === s.instructorId);
          const r = classrooms.find((x) => x.id === s.classroomId);
          if (editingId === s.id) {
            return <EditRow key={s.id} row={s} sessions={sessions} courses={courses} classrooms={classrooms} teachers={teachers}
              onCancel={() => setEditingId(null)}
              onSave={(next) => { upsertSession(next); log("Coordinator", `Edited session ${next.id} → ${DAY_LABELS[next.day]} ${next.start}–${next.end}`, "success"); setEditingId(null); }} />;
          }
          return (
            <tr key={s.id} className="border-b border-border/40">
              <td className="py-2">{DAY_LABELS[s.day]}</td>
              <td className="font-mono text-xs">{s.start}–{s.end}</td>
              <td className="text-xs">{c?.code} · {c?.name}</td>
              <td className="text-xs">{t?.name}</td>
              <td className="text-xs">{r?.name}</td>
              <td className="text-xs">{s.kind === "makeup" ? <span className="text-[color:var(--warning)]">Makeup</span> : "Regular"}</td>
              <td className="text-right whitespace-nowrap">
                <IconBtn onClick={() => setEditingId(s.id)}><Pencil className="w-3 h-3" /></IconBtn>
                <IconBtn danger onClick={() => { if (confirm(`Delete ${c?.code} on ${DAY_LABELS[s.day]} ${s.start}?`)) { deleteSession(s.id); log("Coordinator", `Deleted session ${s.id}`, "warn"); } }}><Trash2 className="w-3 h-3" /></IconBtn>
              </td>
            </tr>
          );
        })}</tbody>
      </table>
      </div>
    </Panel>
  );
}

function EditRow({ row, sessions, courses, classrooms, teachers, onCancel, onSave }: {
  row: SessionRow; sessions: SessionRow[]; courses: Course[]; classrooms: Classroom[]; teachers: Teacher[];
  onCancel: () => void; onSave: (s: SessionRow) => void;
}) {
  const [f, setF] = useState<SessionRow>(row);
  const conflict = sessions.find((s) => s.id !== f.id && s.day === f.day && s.classroomId === f.classroomId && overlap(s.start, s.end, f.start, f.end));
  return (
    <tr className="border-b border-border/40 bg-muted/30">
      <td className="py-2"><select className={inputCls} value={f.day} onChange={(e) => setF({ ...f, day: +e.target.value })}>{[1,2,3,4,5,6].map(d => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}</select></td>
      <td><div className="flex gap-1"><input className={inputCls} type="time" value={f.start} onChange={(e) => setF({ ...f, start: e.target.value })} /><input className={inputCls} type="time" value={f.end} onChange={(e) => setF({ ...f, end: e.target.value })} /></div></td>
      <td><select className={inputCls} value={f.courseId} onChange={(e) => { const c = courses.find(x => x.id === e.target.value); setF({ ...f, courseId: e.target.value, instructorId: c?.instructorId ?? f.instructorId }); }}>{courses.map(c => <option key={c.id} value={c.id}>{c.code}</option>)}</select></td>
      <td><select className={inputCls} value={f.instructorId} onChange={(e) => setF({ ...f, instructorId: e.target.value })}>{teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}</select></td>
      <td><select className={inputCls} value={f.classroomId} onChange={(e) => setF({ ...f, classroomId: e.target.value })}>{classrooms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></td>
      <td><select className={inputCls} value={f.kind} onChange={(e) => setF({ ...f, kind: e.target.value as "regular" | "makeup" })}><option value="regular">Regular</option><option value="makeup">Makeup</option></select></td>
      <td className="text-right whitespace-nowrap">
        <button disabled={!!conflict} onClick={() => onSave(f)} className="px-2 py-1 rounded bg-primary text-primary-foreground text-xs disabled:opacity-50" title={conflict ? "Room conflict with another booking" : "Save"}>Save</button>
        <button onClick={onCancel} className="ml-1 px-2 py-1 rounded bg-secondary border border-border text-xs">Cancel</button>
        {conflict && <div className="text-[10px] text-destructive mt-1">Room conflict</div>}
      </td>
    </tr>
  );
}

// -------- Analytics --------
function AnalyticsTab() {
  const { sessions, teachers, classrooms, courses } = useClassroom();
  const totalSlots = 6 * 8; // Mon-Sat × 8h working slots
  // Hours per instructor
  const hoursByInstr = teachers.map((t) => {
    const h = sessions.filter((s) => s.instructorId === t.id).reduce((acc, s) => {
      const [sh, sm] = s.start.split(":").map(Number); const [eh, em] = s.end.split(":").map(Number);
      return acc + (eh + em / 60 - sh - sm / 60);
    }, 0);
    return { name: t.name.replace("Dr. ", ""), hours: +h.toFixed(1) };
  });
  const perDay = [1, 2, 3, 4, 5, 6].map((d) => ({ day: DAY_LABELS[d], count: sessions.filter((s) => s.day === d).length }));
  const utilByRoom = classrooms.map((r) => ({ name: r.name, util: Math.round(sessions.filter((s) => s.classroomId === r.id).length / totalSlots * 100) }));
  // Equipment distribution
  const equipCount: Record<string, number> = {};
  classrooms.forEach((r) => r.equipment.forEach((e) => { equipCount[e] = (equipCount[e] ?? 0) + 1; }));
  const equipArr = Object.entries(equipCount).map(([k, v]) => ({ name: k, n: v }));

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      <Panel title="Classroom utilization (%)"><BarRows data={utilByRoom.map(d => ({ label: d.name, value: d.util }))} max={100} unit="%" /></Panel>
      <Panel title="Teaching hours per instructor"><BarRows data={hoursByInstr.map(d => ({ label: d.name, value: d.hours }))} max={Math.max(...hoursByInstr.map(d => d.hours), 1)} unit="h" /></Panel>
      <Panel title="Classes per day"><BarRows data={perDay.map(d => ({ label: d.day, value: d.count }))} max={Math.max(...perDay.map(d => d.count), 1)} /></Panel>
      <Panel title="Equipment distribution"><BarRows data={equipArr.map(d => ({ label: d.name, value: d.n }))} max={Math.max(...equipArr.map(d => d.n), 1)} /></Panel>
      <Panel title="Quick metrics" className="lg:col-span-2">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Stat label="Sessions" value={sessions.length} />
          <Stat label="Avg hours/instr" value={(hoursByInstr.reduce((a, b) => a + b.hours, 0) / Math.max(hoursByInstr.length, 1)).toFixed(1)} />
          <Stat label="Active courses" value={courses.length} />
          <Stat label="Rooms" value={classrooms.length} />
        </div>
      </Panel>
    </div>
  );
}
function BarRows({ data, max, unit = "" }: { data: { label: string; value: number }[]; max: number; unit?: string }) {
  return (
    <div className="space-y-2">
      {data.map((d) => (
        <div key={d.label}>
          <div className="flex justify-between text-xs"><span>{d.label}</span><span className="font-mono">{d.value}{unit}</span></div>
          <div className="h-2 bg-secondary/40 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-primary to-accent" style={{ width: `${(d.value / max) * 100}%` }} /></div>
        </div>
      ))}
    </div>
  );
}

// -------- Export --------
function ExportTab() {
  const { sessions, courses, classrooms, teachers, log } = useClassroom();
  const rows = sessions.map((s) => {
    const c = courses.find((x) => x.id === s.courseId);
    const t = teachers.find((x) => x.id === s.instructorId);
    const r = classrooms.find((x) => x.id === s.classroomId);
    return { Day: DAY_LABELS[s.day], Start: s.start, End: s.end, Course: `${c?.code ?? ""} ${c?.name ?? ""}`, Instructor: t?.name ?? "", Room: r?.name ?? "", Type: s.kind };
  });
  function downloadCSV(filename: string) {
    const headers = Object.keys(rows[0] ?? { Day: "" });
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => `"${(r as Record<string, string>)[h] ?? ""}"`).join(","))].join("\n");
    const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv" })); a.download = filename; a.click();
    log("Coordinator", `Exported schedule as ${filename}`, "success");
  }
  return (
    <Panel title="Export schedule">
      <div className="flex flex-wrap gap-2">
        <button onClick={() => downloadCSV("schedule.csv")} className="px-3 py-2 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-2"><Download className="w-4 h-4" /> CSV</button>
        <button onClick={() => downloadCSV("schedule.xlsx.csv")} className="px-3 py-2 rounded bg-secondary border border-border text-sm">Excel (.csv)</button>
        <button onClick={() => downloadCSV("schedule.pdf.csv")} className="px-3 py-2 rounded bg-secondary border border-border text-sm">PDF (.csv)</button>
        <button onClick={() => window.print()} className="px-3 py-2 rounded bg-accent text-accent-foreground text-sm inline-flex items-center gap-2"><Printer className="w-4 h-4" /> Print</button>
      </div>
      <p className="text-xs text-muted-foreground mt-3">Native browser print prints the current page. PDF/XLSX export currently downloads CSV; ask to wire a real PDF/XLSX library when needed.</p>
    </Panel>
  );
}

// -------- Bulk email --------
function BulkEmailTab() {
  const { teachers, students, courses, log } = useClassroom();
  const [group, setGroup] = useState<"instructors" | "students">("students");
  const [courseId, setCourseId] = useState<string>("all");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const recipients = (() => {
    if (group === "instructors") {
      if (courseId === "all") return teachers.map((t) => t.email);
      const c = courses.find((c) => c.id === courseId);
      return teachers.filter((t) => t.id === c?.instructorId).map((t) => t.email);
    }
    if (courseId === "all") return students.map((s) => s.email);
    const c = courses.find((c) => c.id === courseId);
    return students.filter((s) => c?.studentIds.includes(s.id)).map((s) => s.email);
  })();
  function send() {
    const url = `mailto:${recipients.join(",")}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = url;
    log("Coordinator", `Bulk email queued to ${recipients.length} ${group}`, "success");
  }
  return (
    <Panel title="Bulk emails">
      <div className="grid sm:grid-cols-2 gap-3">
        <Field label="Recipient group"><select className={inputCls} value={group} onChange={(e) => setGroup(e.target.value as "instructors" | "students")}>
          <option value="students">Students</option><option value="instructors">Instructors</option>
        </select></Field>
        <Field label="Filter by course"><select className={inputCls} value={courseId} onChange={(e) => setCourseId(e.target.value)}>
          <option value="all">All</option>{courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
        </select></Field>
        <Field label="Subject"><input className={inputCls} value={subject} onChange={(e) => setSubject(e.target.value)} /></Field>
        <Field label={`Body (${recipients.length} recipients)`}><textarea className={inputCls + " min-h-[120px]"} value={body} onChange={(e) => setBody(e.target.value)} /></Field>
      </div>
      <button onClick={send} disabled={!recipients.length || !subject} className="mt-4 px-3 py-2 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-2 disabled:opacity-50"><Mail className="w-4 h-4" /> Send via mail client</button>
    </Panel>
  );
}

// -------- Notifications --------
function NotificationsTab() {
  const { notifications, markNotificationRead } = useClassroom();
  const inbox = notifications.filter((n) => n.toRole === "coordinator");
  return (
    <Panel title={`Inbox (${inbox.filter((n) => !n.read).length} unread)`}>
      {inbox.length === 0 && <p className="text-sm text-muted-foreground">No notifications yet. Messages sent from the Instructor or Student portals appear here.</p>}
      <div className="space-y-2">
        {inbox.map((n) => (
          <div key={n.id} onClick={() => markNotificationRead(n.id)}
            className={`p-3 rounded-md border cursor-pointer ${n.read ? "border-border bg-secondary/20" : "border-primary/40 bg-primary/5"}`}>
            <div className="flex justify-between text-xs text-muted-foreground"><span>From <strong>{n.fromName}</strong> ({n.fromRole})</span><span>{n.time}</span></div>
            <div className="text-sm font-medium mt-1">{n.subject}</div>
            <div className="text-sm text-muted-foreground mt-1 whitespace-pre-wrap">{n.body}</div>
          </div>
        ))}
      </div>
    </Panel>
  );
}
