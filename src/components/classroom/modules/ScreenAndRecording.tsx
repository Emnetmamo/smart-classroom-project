import { useEffect, useRef, useState } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import { MonitorPlay, Video, Square, Download } from "lucide-react";

// Combined Screen Share + Lecture Recording using MediaRecorder + getDisplayMedia
export function ScreenAndRecording({ mode }: { mode: "screen" | "record" }) {
  const { setDevice, log, schedule, devices } = useClassroom();
  const videoRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [sharing, setSharing] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => () => stopAll(), []);

  useEffect(() => {
    if (!recording) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [recording]);

  async function startShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setSharing(true);
      setDevice("sharing", true);
      log("Screen Share", "Instructor started screen sharing", "success");
      stream.getVideoTracks()[0].addEventListener("ended", stopAll);
    } catch {
      log("Screen Share", "User cancelled / unsupported", "warn");
    }
  }

  function startRecording() {
    const stream = videoRef.current?.srcObject as MediaStream | null;
    if (!stream) { log("Recording", "Start screen sharing first", "error"); return; }
    chunksRef.current = [];
    const rec = new MediaRecorder(stream, { mimeType: "video/webm" });
    rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
    rec.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: "video/webm" });
      setRecordedUrl(URL.createObjectURL(blob));
      log("Recording", `Saved ${(blob.size / 1024 / 1024).toFixed(1)} MB · students notified`, "success");
    };
    rec.start(1000);
    recRef.current = rec;
    setRecording(true);
    setElapsed(0);
    setDevice("recording", true);
    log("Recording", `Lecture recording started for ${schedule.course}`, "success");
  }

  function stopRecording() {
    recRef.current?.stop();
    setRecording(false);
    setDevice("recording", false);
  }

  function stopAll() {
    stopRecording();
    const v = videoRef.current;
    const tracks = (v?.srcObject as MediaStream | null)?.getTracks() ?? [];
    tracks.forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setSharing(false);
    setDevice("sharing", false);
  }

  const title = mode === "screen" ? "Smart Screen Sharing" : "Smart Lecture Recording";
  const Icon = mode === "screen" ? MonitorPlay : Video;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Icon className="w-6 h-6 text-primary" /> {title}</h1>
        <p className="text-sm text-muted-foreground">
          Hardware replacement: browser <code className="text-primary">getDisplayMedia</code> + <code className="text-primary">MediaRecorder</code> APIs replace HD capture rig.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Live screen" className="lg:col-span-2">
          <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            {!sharing && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <div className="text-center">
                  <MonitorPlay className="w-12 h-12 mx-auto opacity-50" />
                  <div className="text-sm mt-2">No active share. Press "Start sharing".</div>
                </div>
              </div>
            )}
            {recording && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/80 text-white text-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {fmt(elapsed)}
              </div>
            )}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {!sharing
              ? <button onClick={startShare} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2"><MonitorPlay className="w-4 h-4" /> Start sharing</button>
              : <button onClick={stopAll} className="px-3 py-2 rounded-md bg-secondary border border-border text-sm">Stop sharing</button>}

            {!recording
              ? <button onClick={startRecording} disabled={!sharing} className="px-3 py-2 rounded-md bg-destructive text-destructive-foreground text-sm inline-flex items-center gap-2 disabled:opacity-50"><Video className="w-4 h-4" /> Start recording</button>
              : <button onClick={stopRecording} className="px-3 py-2 rounded-md bg-secondary border border-border text-sm inline-flex items-center gap-2"><Square className="w-4 h-4" /> Stop recording</button>}

            {recordedUrl && (
              <a href={recordedUrl} download={`${schedule.course.replace(/\s/g, "_")}.webm`}
                className="px-3 py-2 rounded-md bg-accent text-accent-foreground text-sm inline-flex items-center gap-2">
                <Download className="w-4 h-4" /> Download recording
              </a>
            )}
          </div>
        </Panel>

        <Panel title="Session metadata">
          <dl className="text-sm space-y-2">
            <Row k="Course" v={schedule.course} />
            <Row k="Instructor" v={schedule.instructor} />
            <Row k="Time" v={`${schedule.start} – ${schedule.end}`} />
            <Row k="Sharing" v={devices.sharing ? "Active" : "Off"} />
            <Row k="Recording" v={devices.recording ? `Recording · ${fmt(elapsed)}` : "Off"} />
            <Row k="Auto-start" v="On teacher detected" />
          </dl>
          <div className="mt-4 text-xs text-muted-foreground">
            Integrates with attendance (teacher identity), schedule (timing), and admin dashboard (access control).
          </div>
        </Panel>
      </div>

      {recordedUrl && (
        <Panel title="Recorded preview">
          <video controls src={recordedUrl} className="w-full rounded-lg border border-border max-h-[480px]" />
        </Panel>
      )}
    </div>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return <div className="flex justify-between border-b border-border/40 pb-1"><dt className="text-muted-foreground">{k}</dt><dd>{v}</dd></div>;
}
function fmt(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`; }
