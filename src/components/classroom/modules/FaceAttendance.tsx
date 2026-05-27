import { useEffect, useRef, useState } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import { ScanFace, Camera, CameraOff } from "lucide-react";

// Software replacement for facial recognition hardware:
// uses webcam (or simulator) + manual student match to model the workflow.
export function FaceAttendance() {
  const { students, checkIn, log } = useClassroom();
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
    setDetected(studentId);
    const s = students.find((x) => x.id === studentId);
    log("Face Recognition", `Analyzing facial embedding for ${s?.name}…`);
    setTimeout(() => {
      checkIn(studentId, "face");
      setScanning(false);
      setTimeout(() => setDetected(null), 1500);
    }, 900);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><ScanFace className="w-6 h-6 text-primary" /> Facial Recognition Attendance</h1>
        <p className="text-sm text-muted-foreground">Hardware replacement: browser webcam + simulated embedding match (Erenso module).</p>
      </header>

      <div className="grid lg:grid-cols-2 gap-6">
        <Panel title="Camera feed" subtitle={streaming ? "Live" : "Simulator mode"}
          action={
            <button onClick={streaming ? stop : start}
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5">
              {streaming ? <><CameraOff className="w-3.5 h-3.5" /> Stop</> : <><Camera className="w-3.5 h-3.5" /> Start camera</>}
            </button>
          }>
          <div className="aspect-video bg-black rounded-lg overflow-hidden relative border border-border">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            {!streaming && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                <div className="text-center">
                  <Camera className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  Webcam off — use simulator panel →
                </div>
              </div>
            )}
            {scanning && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-x-0 h-0.5 bg-primary animate-[scan_1s_ease-in-out]" style={{ top: "50%" }} />
              </div>
            )}
            {detected && (
              <div className="absolute bottom-3 left-3 right-3 bg-success/20 border border-[color:var(--success)]/40 text-[color:var(--success)] px-3 py-2 rounded-md text-sm backdrop-blur">
                ✓ Match: {students.find((s) => s.id === detected)?.name} (confidence 96%)
              </div>
            )}
          </div>
          <style>{`@keyframes scan {0%{top:0}100%{top:100%}}`}</style>
        </Panel>

        <Panel title="Simulate face scan" subtitle="Pick a student to emulate detection">
          <div className="grid grid-cols-2 gap-2 max-h-[420px] overflow-y-auto">
            {students.map((s) => (
              <button key={s.id}
                disabled={s.present || scanning}
                onClick={() => simulateScan(s.id)}
                className="text-left p-3 rounded-md border border-border bg-secondary/30 hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="text-sm font-medium">{s.name}</div>
                <div className="text-xs text-muted-foreground">{s.id} {s.present && `· ✓ ${s.checkInTime}`}</div>
              </button>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}
