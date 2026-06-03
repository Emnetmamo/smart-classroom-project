import { useEffect, useRef, useState, useCallback } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import { ScanFace, Camera, CameraOff, UserCheck, UserX, Loader2, Clock, AlertTriangle } from "lucide-react";
import { buildMatcher, detectAndMatch, type KnownPerson, type LiveMatch } from "@/lib/face-recognition";
import type { FaceMatcher } from "@vladmandic/face-api";

const MATCH_THRESHOLD = 0.5; // max descriptor distance to accept a match
const STABLE_HITS = 2; // consecutive frames before marking attendance

export function FaceAttendance() {
  const { students, teacherPresent, currentTeacher, checkIn, checkOutTeacher, schedule, scheduleMode, setScheduleMode, simNow, setSimNow, log } = useClassroom();
  const videoRef = useRef<HTMLVideoElement>(null);
  const matcherRef = useRef<FaceMatcher | null>(null);
  const loopRef = useRef<number | null>(null);
  const hitsRef = useRef<Record<string, number>>({});

  const [modelState, setModelState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [streaming, setStreaming] = useState(false);
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const [encodeFailed, setEncodeFailed] = useState<string[]>([]);

  // Student-only recognition. Instructor verification now lives in Screen Sharing & Recording.
  const knownStudents = students.filter((s) => s.avatar);

  useEffect(() => () => stopCamera(), []);

  const ensureMatcher = useCallback(async () => {
    if (matcherRef.current) return matcherRef.current;
    setModelState("loading");
    log("Face Recognition", "Loading neural models & encoding reference faces…");
    try {
      const people: KnownPerson[] = knownStudents.map((s) => ({ label: s.id, name: s.name, imageUrl: s.avatar! }));
      const { matcher, failed } = await buildMatcher(people, MATCH_THRESHOLD);
      matcherRef.current = matcher;
      setEncodeFailed(failed);
      setModelState("ready");
      log("Face Recognition", `Encoded ${people.length - failed.length} reference faces${failed.length ? ` (failed: ${failed.join(", ")})` : ""}`, failed.length ? "warn" : "success");
      return matcher;
    } catch {
      setModelState("error");
      log("Face Recognition", "Failed to load face models — check connection", "error");
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [students]);

  function nameForLabel(label: string) {
    return students.find((s) => s.id === label)?.name ?? label;
  }

  function markPerson(label: string) {
    const student = students.find((s) => s.id === label);
    if (student && !student.present) checkIn(student.id, "face");
  }

  async function tick() {
    const v = videoRef.current;
    const matcher = matcherRef.current;
    if (!v || !matcher || v.readyState < 2) return;
    try {
      const found = await detectAndMatch(v, matcher);
      setMatches(found);
      for (const m of found) {
        if (m.label === "unknown") continue;
        hitsRef.current[m.label] = (hitsRef.current[m.label] ?? 0) + 1;
        if (hitsRef.current[m.label] === STABLE_HITS) {
          log("Face Recognition", `Identity confirmed: ${nameForLabel(m.label)} (${Math.round((1 - m.distance) * 100)}% match)`, "success");
          markPerson(m.label);
        }
      }
    } catch {
      /* transient frame error */
    }
  }

  async function startCamera() {
    const matcher = await ensureMatcher();
    if (!matcher) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = s;
      setStreaming(true);
      log("Face Recognition", "Camera live — scanning for registered faces", "success");
      hitsRef.current = {};
      loopRef.current = window.setInterval(tick, 600);
    } catch {
      log("Face Recognition", "Webcam unavailable — grant camera permission", "error");
      setStreaming(false);
    }
  }

  function stopCamera() {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    const v = videoRef.current;
    const tracks = (v?.srcObject as MediaStream | null)?.getTracks() ?? [];
    tracks.forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setStreaming(false);
    setMatches([]);
  }

  // ---- Lateness simulation: set the sim clock relative to the active session start ----
  function simulateOffset(offsetMin: number) {
    if (schedule.start === "--:--") {
      log("Face Recognition", "No active session to offset against", "warn");
      return;
    }
    const [h, m] = schedule.start.split(":").map(Number);
    const d = new Date(simNow);
    d.setHours(h, m + offsetMin, 0, 0);
    setSimNow(d);
    const tag = offsetMin >= 30 ? "LATE (30 min)" : offsetMin >= 10 ? "WARNING (10 min)" : "ON TIME";
    log("Face Recognition", `Sim clock set to ${d.toLocaleTimeString()} — next check-ins will be ${tag}`, offsetMin >= 30 ? "error" : offsetMin >= 10 ? "warn" : "info");
  }

  const vw = videoRef.current?.videoWidth || 1;
  const vh = videoRef.current?.videoHeight || 1;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ScanFace className="w-6 h-6 text-primary" /> Facial Recognition Attendance</h1>
        <p className="text-sm text-muted-foreground">Real on-device face detection &amp; recognition — attendance is only marked when a registered face is matched on camera.</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel
          className="lg:col-span-2"
          title="Live camera"
          subtitle={modelState === "loading" ? "Loading models…" : streaming ? "Recognizing" : modelState === "ready" ? "Ready" : "Off"}
          action={
            <button onClick={streaming ? stopCamera : startCamera} disabled={modelState === "loading"}
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50">
              {modelState === "loading" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading</> : streaming ? <><CameraOff className="w-3.5 h-3.5" /> Stop</> : <><Camera className="w-3.5 h-3.5" /> Start camera</>}
            </button>
          }>
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-border">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            {!streaming && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  {modelState === "error" ? "Could not load models" : "Start the camera to begin recognition"}
                </div>
              </div>
            )}
            {/* Detection overlays */}
            {streaming && matches.map((m, i) => {
              const known = m.label !== "unknown";
              return (
                <div key={i} className="absolute border-2 rounded"
                  style={{
                    left: `${(m.box.x / vw) * 100}%`,
                    top: `${(m.box.y / vh) * 100}%`,
                    width: `${(m.box.width / vw) * 100}%`,
                    height: `${(m.box.height / vh) * 100}%`,
                    borderColor: known ? "var(--success)" : "var(--destructive)",
                  }}>
                  <span className="absolute -top-6 left-0 text-[11px] px-1.5 py-0.5 rounded whitespace-nowrap text-white"
                    style={{ background: known ? "var(--success)" : "var(--destructive)" }}>
                    {known ? `${nameForLabel(m.label)} · ${Math.round((1 - m.distance) * 100)}%` : "Unknown face"}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="mt-4 p-3 rounded-md bg-secondary/40 border border-border/50 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              {teacherPresent ? <UserCheck className="w-4 h-4 text-[color:var(--success)]" /> : <UserX className="w-4 h-4 text-muted-foreground" />}
              <span>Instructor: <strong>{currentTeacher ?? "Not verified"}</strong></span>
            </div>
            {teacherPresent && (
              <button onClick={checkOutTeacher} className="px-2 py-1 rounded bg-secondary border border-border">Sign out</button>
            )}
          </div>
        </Panel>

        <div className="space-y-6">
          <Panel title="Schedule mode" subtitle="How the system decides which course takes the floor">
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setScheduleMode("demo")}
                className={`p-2.5 rounded-md border text-sm text-left ${scheduleMode === "demo" ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                <div className="font-medium">Demo</div>
                <div className="text-[11px] text-muted-foreground">Idle until a teacher is verified, then their course starts.</div>
              </button>
              <button onClick={() => setScheduleMode("schedule")}
                className={`p-2.5 rounded-md border text-sm text-left ${scheduleMode === "schedule" ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:bg-secondary"}`}>
                <div className="font-medium">Schedule</div>
                <div className="text-[11px] text-muted-foreground">Clock-driven; warns if the wrong teacher is at the slot.</div>
              </button>
            </div>
          </Panel>

          <Panel title="Lateness simulator" subtitle="Manually shift the clock relative to session start">

            <div className="text-xs text-muted-foreground mb-3">
              Active session: <strong>{schedule.course}</strong> · starts {schedule.start}
              <div className="mt-1">Sim clock: <strong>{simNow.toLocaleTimeString()}</strong></div>
            </div>
            <div className="grid grid-cols-1 gap-2">
              <button onClick={() => simulateOffset(0)}
                className="text-left p-2.5 rounded-md border border-border bg-[color:var(--success)]/10 hover:bg-[color:var(--success)]/20 inline-flex items-center gap-2 text-sm">
                <Clock className="w-4 h-4 text-[color:var(--success)]" /> On time (at start)
              </button>
              <button onClick={() => simulateOffset(10)}
                className="text-left p-2.5 rounded-md border border-border bg-[color:var(--warning)]/10 hover:bg-[color:var(--warning)]/20 inline-flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-[color:var(--warning)]" /> Warning — 10 min late
              </button>
              <button onClick={() => simulateOffset(30)}
                className="text-left p-2.5 rounded-md border border-border bg-destructive/10 hover:bg-destructive/20 inline-flex items-center gap-2 text-sm">
                <AlertTriangle className="w-4 h-4 text-destructive-foreground" /> Late — 30 min late
              </button>
            </div>
          </Panel>

          <Panel title="Registered faces" subtitle="Only these identities can be matched">
            {encodeFailed.length > 0 && (
              <div className="mb-2 text-[11px] text-[color:var(--warning)]">⚠ No face found in portrait: {encodeFailed.join(", ")}</div>
            )}
            <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
              {knownStudents.map((p) => {
                const student = students.find((s) => s.id === p.id);
                const present = student?.present ?? (teacherPresent && currentTeacher === p.name);
                return (
                  <div key={p.id} className="flex items-center gap-2.5 p-1.5 rounded-md bg-secondary/30 border border-border/50">
                    <img src={p.avatar} alt={p.name} className="w-8 h-8 rounded-full object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-medium truncate">{p.name}</div>
                      <div className="text-[10px] text-muted-foreground truncate">{p.id}{student?.present && student.lateness ? ` · ${student.lateness}` : ""}</div>
                    </div>
                    {present
                      ? <UserCheck className="w-4 h-4 text-[color:var(--success)] shrink-0" />
                      : <span className="text-[10px] text-muted-foreground shrink-0">waiting</span>}
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
