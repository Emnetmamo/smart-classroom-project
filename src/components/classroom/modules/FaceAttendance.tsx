import { useEffect, useRef, useState } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import { ScanFace, Camera, CameraOff, UserCheck, UserX, Users } from "lucide-react";

export function FaceAttendance() {
  const { students, teachers, teacherPresent, currentTeacher, checkIn, multiFaceDetect, checkInTeacher, checkOutTeacher, log } = useClassroom();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [detected, setDetected] = useState<string | null>(null);

  useEffect(() => () => stop(), []);

  async function start() {
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = s;
      setStreaming(true);
      log("Face Recognition", "Camera stream started", "success");
    } catch {
      log("Face Recognition", "Webcam unavailable — using simulator", "warn");
      setStreaming(false);
    }
  }
  function stop() {
    const v = videoRef.current;
    const tracks = (v?.srcObject as MediaStream | null)?.getTracks() ?? [];
    tracks.forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setStreaming(false);
  }

  function simulateScan(studentId: string) {
    setScanning(true);
    setDetected(`S:${studentId}`);
    const s = students.find((x) => x.id === studentId);
    log("Face Recognition", `Analyzing facial embedding for ${s?.name}…`);
    setTimeout(() => {
      checkIn(studentId, "face");
      setScanning(false);
      setTimeout(() => setDetected(null), 1500);
    }, 700);
  }

  function multiScan() {
    const absent = students.filter((s) => !s.present);
    if (absent.length === 0) {
      log("Face Recognition", "All students already checked in", "info");
      return;
    }
    const n = Math.min(absent.length, 2 + Math.floor(Math.random() * 3));
    const picks = [...absent].sort(() => Math.random() - 0.5).slice(0, n).map((s) => s.id);
    setScanning(true);
    log("Face Recognition", `Multi-face detection: ${n} faces in frame…`, "info");
    setTimeout(() => {
      multiFaceDetect(picks);
      setScanning(false);
    }, 900);
  }

  function simulateTeacher(teacherId: string) {
    setScanning(true);
    setDetected(`T:${teacherId}`);
    const t = teachers.find((x) => x.id === teacherId);
    log("Face Recognition", `Verifying instructor ${t?.name}…`);
    setTimeout(() => {
      checkInTeacher(teacherId);
      setScanning(false);
      setTimeout(() => setDetected(null), 1500);
    }, 800);
  }

  const detectedLabel = () => {
    if (!detected) return null;
    const [k, id] = detected.split(":");
    if (k === "S") return students.find((s) => s.id === id)?.name;
    return teachers.find((t) => t.id === id)?.name;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ScanFace className="w-6 h-6 text-primary" /> Facial Recognition Attendance</h1>
        <p className="text-sm text-muted-foreground">Multi-face real-time detection · verifies the instructor (auto-starts screen share + recording) · enforces 10-min warning / 30-min late.</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Camera feed" subtitle={streaming ? "Live" : "Simulator mode"}
          action={
            <div className="flex gap-2">
              <button onClick={multiScan} disabled={scanning}
                className="text-xs px-3 py-1.5 rounded-md bg-accent text-accent-foreground hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50">
                <Users className="w-3.5 h-3.5" /> Detect classroom
              </button>
              <button onClick={streaming ? stop : start}
                className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5">
                {streaming ? <><CameraOff className="w-3.5 h-3.5" /> Stop</> : <><Camera className="w-3.5 h-3.5" /> Start</>}
              </button>
            </div>
          }>
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-border">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!streaming && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Webcam off — use the simulators below
                </div>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-0 h-0.5 bg-primary animate-[scan_1s_ease-in-out]" style={{ top: "50%" }} />
              </div>
            )}
            {detected && (
              <div className="absolute bottom-3 left-3 right-3 bg-[color:var(--success)]/20 border border-[color:var(--success)]/40 text-[color:var(--success)] px-3 py-2 rounded-md text-sm backdrop-blur">
                ✓ Match: {detectedLabel()} (confidence 96%)
              </div>
            )}
          </div>
          <style>{`@keyframes scan {0%{top:0}100%{top:100%}}`}</style>

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
          <Panel title="Verify instructor" subtitle="Triggers auto screen-share + recording when matching the active session">
            <div className="grid grid-cols-2 gap-2">
              {teachers.map((t) => (
                <button key={t.id}
                  disabled={scanning || (teacherPresent && currentTeacher === t.name)}
                  onClick={() => simulateTeacher(t.id)}
                  className="text-left p-3 rounded-md border border-border bg-primary/5 hover:bg-primary/10 disabled:opacity-50 flex items-center gap-3">
                  {t.avatar
                    ? <img src={t.avatar} alt={t.name} className="w-10 h-10 rounded-full object-cover" />
                    : <div className="w-10 h-10 rounded-full bg-primary/20 grid place-items-center text-xs font-medium">{t.name.split(" ").map((n) => n[0]).slice(0,2).join("")}</div>}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{t.name}</div>
                    <div className="text-[10px] text-muted-foreground">{t.id}</div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>

          <Panel title="Check in students" subtitle="Alphabetical · simulated facial scan">
            <div className="grid grid-cols-2 gap-2 max-h-[360px] overflow-y-auto">
              {students.map((s) => (
                <button key={s.id}
                  disabled={s.present || scanning}
                  onClick={() => simulateScan(s.id)}
                  className="text-left p-3 rounded-md border border-border bg-secondary/30 hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3">
                  {s.avatar
                    ? <img src={s.avatar} alt={s.name} className="w-9 h-9 rounded-full object-cover" />
                    : <div className="w-9 h-9 rounded-full bg-secondary border border-border grid place-items-center text-[10px] font-medium">{s.name.split(" ").map((n) => n[0]).slice(0,2).join("")}</div>}
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{s.name}</div>
                    <div className="text-[10px] text-muted-foreground truncate">
                      {s.id}
                      {s.present && <> · <span className={s.lateness === "late" ? "text-destructive-foreground" : s.lateness === "warning" ? "text-[color:var(--warning)]" : "text-[color:var(--success)]"}>{s.lateness ?? "in"}</span></>}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}
