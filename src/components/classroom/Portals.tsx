import { useMemo, useState } from "react";
import { useClassroom, DAY_LABELS } from "@/lib/classroom-store";
import { Panel, Stat } from "./ui";
import { LogOut, CalendarDays, Bell, Send, Inbox, Pencil, Activity } from "lucide-react";

export function InstructorPortal({ teacherId, onLogout }: { teacherId: string; onLogout: () => void }) {
  const { teachers, sessions, courses, classrooms, students, notifications, sendNotification, markNotificationRead, upsertSession } = useClassroom();
  const me = teachers.find((t) => t.id === teacherId);
  const [tab, setTab] = useState<"dash" | "sched" | "inbox" | "compose">("dash");

  const mySessions = useMemo(() => sessions.filter((s) => s.instructorId === teacherId).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start)), [sessions, teacherId]);
  const teachingHours = mySessions.reduce((acc, s) => {
    const [sh, sm] = s.start.split(":").map(Number); const [eh, em] = s.end.split(":").map(Number);
    return acc + (eh + em / 60 - sh - sm / 60);
  }, 0);
  const myCourses = new Set(mySessions.map((s) => s.courseId));
  const inbox = notifications.filter((n) => n.toRole === "instructor" && (!n.toId || n.toId === teacherId));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-card/70 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 grid place-items-center"><Activity className="w-4 h-4 text-primary" /></div>
        <div className="flex-1">
          <div className="text-sm font-medium">Instructor Portal</div>
          <div className="text-xs text-muted-foreground">{me?.name} · {me?.department}</div>
        </div>
        <div className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {inbox.filter((n) => !n.read).length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] grid place-items-center">{inbox.filter((n) => !n.read).length}</span>
          )}
        </div>
        <button onClick={onLogout} className="text-xs px-2.5 py-1.5 rounded-md border border-border inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Logout</button>
      </header>

      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <nav className="flex gap-2 border-b border-border pb-3">
          {[["dash","Dashboard"],["sched","My schedule"],["inbox","Inbox"],["compose","Compose"]].map(([id,label]) => (
            <button key={id} onClick={() => setTab(id as never)} className={`text-sm px-3 py-1.5 rounded-md border ${tab===id?"bg-primary text-primary-foreground border-primary":"bg-secondary/40 border-border"}`}>{label}</button>
          ))}
        </nav>

        {tab === "dash" && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="My classes" value={mySessions.length} />
              <Stat label="Teaching hours / week" value={teachingHours.toFixed(1)} />
              <Stat label="My courses" value={myCourses.size} />
              <Stat label="Unread messages" value={inbox.filter((n) => !n.read).length} />
            </div>
            <Panel title="Today" >
              {(() => {
                const t = mySessions.filter((s) => s.day === new Date().getDay());
                if (!t.length) return <p className="text-sm text-muted-foreground">No classes today.</p>;
                return <ul className="space-y-1.5">{t.map((s) => { const c = courses.find((x) => x.id === s.courseId); return <li key={s.id} className="text-sm flex justify-between"><span>{c?.code} · {c?.name}</span><span className="font-mono text-xs">{s.start}–{s.end}</span></li>; })}</ul>;
              })()}
            </Panel>
          </>
        )}

        {tab === "sched" && (
          <Panel title="My schedule" subtitle="Click Edit to move a class to another open slot. Students get a notification.">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Day</th><th>Time</th><th>Course</th><th>Room</th><th></th></tr></thead>
              <tbody>{mySessions.map((s) => {
                const c = courses.find((x) => x.id === s.courseId);
                const r = classrooms.find((x) => x.id === s.classroomId);
                return (
                  <tr key={s.id} className="border-b border-border/40">
                    <td className="py-2">{DAY_LABELS[s.day]}</td>
                    <td className="font-mono text-xs">{s.start}–{s.end}</td>
                    <td>{c?.code} · {c?.name}</td>
                    <td className="text-xs">{r?.name}</td>
                    <td className="text-right"><RescheduleButton sessionId={s.id} /></td>
                  </tr>
                );
              })}</tbody>
            </table>
          </Panel>
        )}

        {tab === "inbox" && (
          <Panel title={`Inbox (${inbox.filter((n) => !n.read).length} unread)`}>
            {inbox.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
            <div className="space-y-2">{inbox.map((n) => (
              <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`p-3 rounded-md border cursor-pointer ${n.read ? "border-border bg-secondary/20" : "border-primary/40 bg-primary/5"}`}>
                <div className="flex justify-between text-xs text-muted-foreground"><span>From <strong>{n.fromName}</strong> ({n.fromRole})</span><span>{n.time}</span></div>
                <div className="text-sm font-medium">{n.subject}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}</div>
          </Panel>
        )}

        {tab === "compose" && <ComposeNotification fromRole="instructor" fromName={me?.name ?? "Instructor"} toRoles={["coordinator", "student"]} students={students} />}
      </div>
    </div>
  );

  function RescheduleButton({ sessionId }: { sessionId: string }) {
    const [open, setOpen] = useState(false);
    const s = mySessions.find((x) => x.id === sessionId)!;
    const [day, setDay] = useState(s.day);
    const [start, setStart] = useState(s.start);
    const [end, setEnd] = useState(s.end);
    function save() {
      const conflict = sessions.some((x) => x.id !== s.id && x.classroomId === s.classroomId && x.day === day && !(end <= x.start || start >= x.end));
      if (conflict) { alert("Room conflict — pick another slot."); return; }
      upsertSession({ ...s, day, start, end });
      // notify enrolled students
      const c = courses.find((x) => x.id === s.courseId);
      c?.studentIds.forEach((sid) => sendNotification({
        fromRole: "instructor", fromName: me?.name ?? "Instructor", toRole: "student", toId: sid,
        subject: `Class rescheduled: ${c.code}`, body: `Your class ${c.code} has moved to ${DAY_LABELS[day]} ${start}–${end}.`,
      }));
      setOpen(false);
    }
    return (
      <>
        <button onClick={() => setOpen(!open)} className="text-xs px-2 py-1 rounded border border-border hover:bg-secondary inline-flex items-center gap-1"><Pencil className="w-3 h-3" /> Edit</button>
        {open && (
          <div className="absolute right-6 mt-1 z-10 bg-card border border-border rounded-lg p-3 shadow-lg space-y-2 w-64">
            <label className="text-xs block">Day<select className="w-full px-2 py-1 rounded bg-input border border-border text-sm" value={day} onChange={(e) => setDay(+e.target.value)}>{[1,2,3,4,5,6].map((d) => <option key={d} value={d}>{DAY_LABELS[d]}</option>)}</select></label>
            <label className="text-xs block">Start<input className="w-full px-2 py-1 rounded bg-input border border-border text-sm" type="time" value={start} onChange={(e) => setStart(e.target.value)} /></label>
            <label className="text-xs block">End<input className="w-full px-2 py-1 rounded bg-input border border-border text-sm" type="time" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
            <div className="flex gap-2"><button onClick={save} className="text-xs px-2 py-1 rounded bg-primary text-primary-foreground">Save</button><button onClick={() => setOpen(false)} className="text-xs px-2 py-1 rounded border border-border">Cancel</button></div>
          </div>
        )}
      </>
    );
  }
}

export function StudentPortal({ studentId, onLogout }: { studentId: string; onLogout: () => void }) {
  const { students, sessions, courses, teachers, classrooms, recordings, notifications, sendNotification, markNotificationRead } = useClassroom();
  const me = students.find((s) => s.id === studentId);
  const [tab, setTab] = useState<"sched" | "materials" | "inbox" | "compose">("sched");

  const mySessions = useMemo(() => {
    const myCourseIds = courses.filter((c) => c.studentIds.includes(studentId)).map((c) => c.id);
    return sessions.filter((s) => myCourseIds.includes(s.courseId)).sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  }, [sessions, courses, studentId]);
  const myCourses = courses.filter((c) => c.studentIds.includes(studentId));
  const inbox = notifications.filter((n) => n.toRole === "student" && (!n.toId || n.toId === studentId));

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-card/70 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 grid place-items-center">
          {me?.avatar ? <img src={me.avatar} className="w-9 h-9 rounded-lg object-cover" alt={me.name} /> : <Activity className="w-4 h-4 text-primary" />}
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium">Student Portal</div>
          <div className="text-xs text-muted-foreground">{me?.name} · {me?.id}</div>
        </div>
        <div className="relative">
          <Bell className="w-5 h-5 text-muted-foreground" />
          {inbox.filter((n) => !n.read).length > 0 && (
            <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-white text-[10px] grid place-items-center">{inbox.filter((n) => !n.read).length}</span>
          )}
        </div>
        <button onClick={onLogout} className="text-xs px-2.5 py-1.5 rounded-md border border-border inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Logout</button>
      </header>

      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <nav className="flex gap-2 border-b border-border pb-3">
          {([
            { id: "sched", label: "Schedule", Icon: CalendarDays },
            { id: "materials", label: "Materials & Recordings", Icon: Inbox },
            { id: "inbox", label: "Inbox", Icon: Bell },
            { id: "compose", label: "Compose", Icon: Send },
          ] as const).map(({ id, label, Icon }) => (
            <button key={id} onClick={() => setTab(id)} className={`text-sm px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${tab===id?"bg-primary text-primary-foreground border-primary":"bg-secondary/40 border-border"}`}>
              <Icon className="w-3.5 h-3.5" />{label}
            </button>
          ))}
        </nav>

        {tab === "sched" && (
          <Panel title="My weekly schedule">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs text-muted-foreground border-b border-border"><th className="py-2">Day</th><th>Time</th><th>Course</th><th>Instructor</th><th>Room</th></tr></thead>
              <tbody>{mySessions.map((s) => {
                const c = courses.find((x) => x.id === s.courseId);
                const t = teachers.find((x) => x.id === s.instructorId);
                const r = classrooms.find((x) => x.id === s.classroomId);
                return <tr key={s.id} className="border-b border-border/40"><td className="py-2">{DAY_LABELS[s.day]}</td><td className="font-mono text-xs">{s.start}–{s.end}</td><td>{c?.code} · {c?.name}</td><td className="text-xs">{t?.name}</td><td className="text-xs">{r?.name}</td></tr>;
              })}</tbody>
            </table>
          </Panel>
        )}

        {tab === "materials" && (
          <div className="space-y-4">
            {myCourses.map((c) => {
              const recs = recordings.filter((r) => r.courseId === c.id);
              const mats = sessions.filter((s) => s.courseId === c.id && s.material?.preloaded).map((s) => s.material!);
              return (
                <Panel key={c.id} title={`${c.code} · ${c.name}`}>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Slides / docs</div>
                      {mats.length === 0 ? <p className="text-xs text-muted-foreground">No materials yet.</p> :
                        <ul className="space-y-1.5 text-sm">{mats.map((m, i) => <li key={i} className="p-2 rounded border border-border bg-secondary/30">📄 {m.title}<span className="text-[10px] ml-2 uppercase text-muted-foreground">{m.type}</span></li>)}</ul>}
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Recordings</div>
                      {recs.length === 0 ? <p className="text-xs text-muted-foreground">No recordings yet.</p> :
                        <ul className="space-y-1.5 text-sm">{recs.map((r) => (
                          <li key={r.id} className="p-2 rounded border border-border bg-secondary/30 space-y-1.5">
                            <div className="flex justify-between"><span>🎥 {r.title}</span><span className="text-[10px] text-muted-foreground">{r.date} · {Math.round(r.durationSec/60)}m</span></div>
                            {r.url ? (
                              <div className="space-y-1.5">
                                <video controls src={r.url} className="w-full rounded border border-border max-h-48" />
                                <a href={r.url} download={`${r.title.replace(/\s/g, "_")}.webm`} className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-primary text-primary-foreground">⬇ Download</a>
                              </div>
                            ) : <div className="text-[10px] text-muted-foreground">Processing — file will be available after the lecture is recorded.</div>}
                          </li>
                        ))}</ul>}
                    </div>
                  </div>
                </Panel>
              );
            })}
          </div>
        )}

        {tab === "inbox" && (
          <Panel title={`Inbox (${inbox.filter((n) => !n.read).length} unread)`}>
            {inbox.length === 0 && <p className="text-sm text-muted-foreground">No messages.</p>}
            <div className="space-y-2">{inbox.map((n) => (
              <div key={n.id} onClick={() => markNotificationRead(n.id)} className={`p-3 rounded-md border cursor-pointer ${n.read ? "border-border bg-secondary/20" : "border-primary/40 bg-primary/5"}`}>
                <div className="flex justify-between text-xs text-muted-foreground"><span>From <strong>{n.fromName}</strong></span><span>{n.time}</span></div>
                <div className="text-sm font-medium">{n.subject}</div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">{n.body}</div>
              </div>
            ))}</div>
          </Panel>
        )}

        {tab === "compose" && <ComposeNotification fromRole="student" fromName={me?.name ?? "Student"} toRoles={["coordinator", "instructor"]} />}
      </div>
    </div>
  );
}

// shared compose
function ComposeNotification({ fromRole, fromName, toRoles, students }: {
  fromRole: "instructor" | "student";
  fromName: string;
  toRoles: ("coordinator" | "instructor" | "student")[];
  students?: { id: string; name: string }[];
}) {
  const { sendNotification, teachers, notifications } = useClassroom();
  const sent = notifications.filter((n) => n.fromRole === fromRole && n.fromName === fromName);
  const [toRole, setToRole] = useState<"coordinator" | "instructor" | "student">(toRoles[0]);
  const [toId, setToId] = useState<string>("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [sent, setSent] = useState(false);
  function send() {
    sendNotification({ fromRole, fromName, toRole, toId: toId || undefined, subject, body });
    setSent(true);
    setSubject(""); setBody("");
    setTimeout(() => setSent(false), 2000);
  }
  return (
    <Panel title="Send a notification">
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block text-xs"><div className="text-muted-foreground mb-1">To (role)</div>
          <select className="w-full px-2.5 py-1.5 rounded-md bg-input border border-border text-sm" value={toRole} onChange={(e) => { setToRole(e.target.value as never); setToId(""); }}>
            {toRoles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label className="block text-xs"><div className="text-muted-foreground mb-1">Specific person (optional)</div>
          <select className="w-full px-2.5 py-1.5 rounded-md bg-input border border-border text-sm" value={toId} onChange={(e) => setToId(e.target.value)}>
            <option value="">— Anyone in role —</option>
            {toRole === "instructor" && teachers.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            {toRole === "student" && students?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </label>
        <label className="block text-xs sm:col-span-2"><div className="text-muted-foreground mb-1">Subject</div>
          <input className="w-full px-2.5 py-1.5 rounded-md bg-input border border-border text-sm" value={subject} onChange={(e) => setSubject(e.target.value)} />
        </label>
        <label className="block text-xs sm:col-span-2"><div className="text-muted-foreground mb-1">Message</div>
          <textarea className="w-full px-2.5 py-1.5 rounded-md bg-input border border-border text-sm min-h-[120px]" value={body} onChange={(e) => setBody(e.target.value)} />
        </label>
      </div>
      <button onClick={send} disabled={!subject || !body} className="mt-3 px-3 py-2 rounded bg-primary text-primary-foreground text-sm inline-flex items-center gap-2 disabled:opacity-50"><Send className="w-4 h-4" /> Send</button>
      {sent && <span className="ml-3 text-xs text-[color:var(--success)]">Sent ✓</span>}
    </Panel>
  );
}
