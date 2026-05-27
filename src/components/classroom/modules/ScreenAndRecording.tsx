import { useEffect, useRef, useState } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import { MonitorPlay, Video, Square, Download, FileText, AlertCircle } from "lucide-react";

// Smart Screen Sharing + Lecture Recording.
// Auto-driven by schedule + teacher face verification.
// - On teacher verification during an active session: devices.sharing = true.
//   If preloaded material exists, it is shown as the shared canvas.
//   Otherwise the instructor is prompted to share their actual screen.
// - Recording starts implicitly the moment sharing becomes active.
export function ScreenAndRecording({ mode }: { mode: "screen" | "record" }) {
  const { setDevice, log, schedule, devices, teacherPresent, currentTeacher, checkOutTeacher } = useClassroom();
  const videoRef = useRef<HTMLVideoElement>(null);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const [liveStream, setLiveStream] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const autoMode = devices.sharing && !liveStream; // sharing driven by store w/ no manual stream → preloaded material mode
  const hasMaterial = !!schedule.material?.preloaded;

  useEffect(() => () => stopMediaTracks(), []);

  // Recording timer
  useEffect(() => {
    if (!devices.recording) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [devices.recording]);

  // When sharing turns off externally (e.g. teacher signed out), stop any real stream
  useEffect(() => {
    if (!devices.sharing && liveStream) stopMediaTracks();
    if (!devices.sharing) setElapsed(0);
  }, [devices.sharing]);

  async function startManualShare() {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setLiveStream(true);
      setDevice("sharing", true);
      setDevice("recording", true); // implicit: recording starts with sharing
      log("Smart Screen", "Instructor shared their screen — recording started automatically", "success");

      // begin recording
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

      stream.getVideoTracks()[0].addEventListener("ended", stopMediaTracks);
    } catch {
      log("Smart Screen", "Screen share cancelled / unsupported", "warn");
    }
  }

  function stopMediaTracks() {
    recRef.current?.stop();
    recRef.current = null;
    const v = videoRef.current;
    const tracks = (v?.srcObject as MediaStream | null)?.getTracks() ?? [];
    tracks.forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setLiveStream(false);
    setDevice("sharing", false);
    setDevice("recording", false);
  }

  const title = mode === "screen" ? "Smart Screen Sharing" : "Smart Lecture Recording";
  const Icon = mode === "screen" ? MonitorPlay : Video;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Icon className="w-6 h-6 text-primary" /> {title}</h1>
        <p className="text-sm text-muted-foreground">
          Implicit: triggered by schedule + teacher face verification. Recording starts automatically the moment sharing goes live.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Live canvas" className="lg:col-span-2"
          subtitle={autoMode && hasMaterial ? "Auto · preloaded material" : liveStream ? "Live screen share" : "Idle"}>
          <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border relative">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />

            {autoMode && hasMaterial && schedule.material && (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-background to-accent/20 grid place-items-center p-8">
                <div className="text-center max-w-md">
                  <FileText className="w-14 h-14 mx-auto text-primary mb-4" />
                  <div className="text-xs uppercase tracking-widest text-muted-foreground">Preloaded material · {schedule.material.type}</div>
                  <div className="text-xl font-semibold mt-2">{schedule.material.title}</div>
                  <div className="mt-2 text-sm text-muted-foreground">{schedule.course} · {currentTeacher}</div>
                </div>
              </div>
            )}

            {autoMode && !hasMaterial && (
              <div className="absolute inset-0 grid place-items-center bg-background/80 p-6">
                <div className="text-center max-w-sm">
                  <AlertCircle className="w-10 h-10 mx-auto text-[color:var(--warning)] mb-2" />
                  <div className="font-medium">No preloaded material</div>
                  <div className="text-sm text-muted-foreground mt-1">Recording is armed — share your screen to begin streaming.</div>
                  <button onClick={startManualShare} className="mt-4 px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
                    <MonitorPlay className="w-4 h-4" /> Share screen now
                  </button>
                </div>
              </div>
            )}

            {!devices.sharing && (
              <div className="absolute inset-0 grid place-items-center text-muted-foreground">
                <div className="text-center">
                  <MonitorPlay className="w-12 h-12 mx-auto opacity-50" />
                  <div className="text-sm mt-2">
                    {teacherPresent
                      ? "Awaiting active session window…"
                      : "Waiting for instructor face verification."}
                  </div>
                </div>
              </div>
            )}

            {devices.recording && (
              <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/80 text-white text-xs">
                <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {fmt(elapsed)}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            {!liveStream && teacherPresent && (
              <button onClick={startManualShare} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
                <MonitorPlay className="w-4 h-4" /> Override · share my screen
              </button>
            )}
            {devices.sharing && (
              <button onClick={teacherPresent ? checkOutTeacher : stopMediaTracks}
                className="px-3 py-2 rounded-md bg-secondary border border-border text-sm inline-flex items-center gap-2">
                <Square className="w-4 h-4" /> Stop session
              </button>
            )}
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
            <Row k="Room" v={schedule.room} />
            <Row k="Window" v={`${schedule.start} – ${schedule.end}`} />
            <Row k="Session active" v={schedule.active ? "Yes" : "No (next slot)"} />
            <Row k="Teacher verified" v={teacherPresent ? currentTeacher ?? "Yes" : "No"} />
            <Row k="Preloaded material" v={hasMaterial ? schedule.material!.title : "None"} />
            <Row k="Sharing" v={devices.sharing ? (liveStream ? "Live screen" : "Preloaded") : "Off"} />
            <Row k="Recording" v={devices.recording ? `Recording · ${fmt(elapsed)}` : "Off"} />
          </dl>
          <div className="mt-4 text-xs text-muted-foreground leading-relaxed">
            Recording is implicit: it starts the instant sharing becomes active, whether the source is preloaded material or the instructor's screen.
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
  return <div className="flex justify-between border-b border-border/40 pb-1"><dt className="text-muted-foreground">{k}</dt><dd className="text-right">{v}</dd></div>;
}
function fmt(s: number) { const m = Math.floor(s / 60); const r = s % 60; return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`; }
