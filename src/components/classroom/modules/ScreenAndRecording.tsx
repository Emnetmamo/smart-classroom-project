import { useEffect, useRef, useState, useCallback } from "react";
import { useClassroom } from "@/lib/classroom-store";
import { Panel } from "../ui";
import {
  MonitorPlay, Video, Square, Download, FileText, AlertCircle,
  ScanFace, Camera, CameraOff, Loader2, UserCheck, ChevronLeft, ChevronRight,
} from "lucide-react";
import { buildMatcher, detectAndMatch, type KnownPerson, type LiveMatch } from "@/lib/face-recognition";
import type { FaceMatcher } from "@vladmandic/face-api";
import type { PDFDocumentProxy } from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.mjs?url";

const MATCH_THRESHOLD = 0.5;
const STABLE_HITS = 2;

// Smart Screen Sharing + Lecture Recording.
//
// New flow:
//   1. Camera opens and runs face recognition against the registered teacher portraits.
//   2. When a teacher's face is matched, the camera is replaced by the Live Canvas:
//      preloaded slides auto-load (or the instructor can override with their screen).
//   3. Recording (screen + mic) is implicit and starts the moment sharing goes live.
//
// Preloaded PDFs are rendered page-by-page onto a canvas with PDF.js. This avoids
// Chrome's built-in PDF viewer entirely, so it cannot show "blocked by Chrome".
export function ScreenAndRecording({ mode }: { mode: "screen" | "record" }) {
  const {
    setDevice, log, schedule, devices, teachers, teacherPresent, currentTeacher,
    checkInTeacher, checkOutTeacher, addRecording,
  } = useClassroom();

  // --- screen / recording refs ---
  const videoRef = useRef<HTMLVideoElement>(null);         // screen share preview
  const camRef = useRef<HTMLVideoElement>(null);           // face-verification webcam
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const extraTracksRef = useRef<MediaStreamTrack[]>([]);
  const pdfFrameRef = useRef<HTMLDivElement>(null);
  const pdfCanvasRef = useRef<HTMLCanvasElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderTaskRef = useRef<{ cancel: () => void; promise: Promise<unknown> } | null>(null);

  const [liveStream, setLiveStream] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  // --- face verification state ---
  const matcherRef = useRef<FaceMatcher | null>(null);
  const loopRef = useRef<number | null>(null);
  const hitsRef = useRef<Record<string, number>>({});
  const [camOn, setCamOn] = useState(false);
  const [modelState, setModelState] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [matches, setMatches] = useState<LiveMatch[]>([]);
  const knownTeachers = teachers.filter((t) => t.avatar);

  const autoMode = devices.sharing && !liveStream;
  const hasMaterial = !!schedule.material?.preloaded;
  const materialUrl = schedule.material?.url;
  const [pdfStatus, setPdfStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [pdfPage, setPdfPage] = useState(1);
  const [pdfPages, setPdfPages] = useState(0);
  const [pdfRenderTick, setPdfRenderTick] = useState(0);

  useEffect(() => {
    if (!materialUrl || !hasMaterial) {
      setPdfStatus("idle");
      setPdfPages(0);
      setPdfPage(1);
      return;
    }
    let cancelled = false;
    const controller = new AbortController();
    setPdfStatus("loading");
    setPdfPages(0);
    setPdfPage(1);

    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
        const response = await fetch(materialUrl, { signal: controller.signal, credentials: "same-origin" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const bytes = new Uint8Array(await response.arrayBuffer());
        const doc = await pdfjs.getDocument({ data: bytes }).promise;
        if (cancelled) { await doc.cleanup(); return; }
        pdfDocRef.current = doc;
        setPdfPages(doc.numPages);
        setPdfStatus("ready");
        log("Smart Screen", `Loaded preloaded slides in secure canvas viewer: ${schedule.material?.title ?? "slides"}`, "success");
      } catch {
        if (cancelled) return;
        setPdfStatus("error");
        log("Smart Screen", "Could not render preloaded PDF slides", "error");
      }
    })();

    return () => {
      cancelled = true;
      controller.abort();
      renderTaskRef.current?.cancel();
      renderTaskRef.current = null;
      void pdfDocRef.current?.cleanup();
      pdfDocRef.current = null;
    };
  }, [materialUrl, hasMaterial, schedule.material?.title]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onResize = () => setPdfRenderTick((n) => n + 1);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const doc = pdfDocRef.current;
    const canvas = pdfCanvasRef.current;
    if (!doc || !canvas || pdfStatus !== "ready" || liveStream || !autoMode) return;
    let cancelled = false;

    (async () => {
      try {
        renderTaskRef.current?.cancel();
        const page = await doc.getPage(pdfPage);
        if (cancelled) return;
        const frame = pdfFrameRef.current;
        const frameW = Math.max(frame?.clientWidth ?? 1280, 320);
        const frameH = Math.max(frame?.clientHeight ?? 720, 180);
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const base = page.getViewport({ scale: 1 });
        const scale = Math.min(frameW / base.width, frameH / base.height) * dpr;
        const viewport = page.getViewport({ scale });
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${Math.floor(viewport.width / dpr)}px`;
        canvas.style.height = `${Math.floor(viewport.height / dpr)}px`;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        const task = page.render({ canvas, canvasContext: ctx, viewport });
        renderTaskRef.current = task;
        await task.promise;
      } catch (error) {
        if (!cancelled && !(error instanceof Error && error.name === "RenderingCancelledException")) {
          setPdfStatus("error");
        }
      }
    })();

    return () => {
      cancelled = true;
      renderTaskRef.current?.cancel();
    };
  }, [pdfStatus, pdfPage, liveStream, autoMode, pdfRenderTick, materialUrl]);

  useEffect(() => () => { stopMediaTracks(); stopCamera(); }, []);

  useEffect(() => {
    if (!devices.recording) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [devices.recording]);

  // Auto-stop camera once a teacher is verified — the Live Canvas takes over.
  useEffect(() => {
    if (teacherPresent && camOn) stopCamera();
  }, [teacherPresent, camOn]);

  // If sharing turns off externally (sign-out / end of session) stop everything.
  useEffect(() => {
    if (!devices.sharing && liveStream) stopMediaTracks();
    if (!devices.sharing) setElapsed(0);
  }, [devices.sharing]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---------- Face verification ----------
  const ensureMatcher = useCallback(async () => {
    if (matcherRef.current) return matcherRef.current;
    setModelState("loading");
    log("Face Recognition", "Loading models for instructor verification…");
    try {
      const people: KnownPerson[] = knownTeachers.map((t) => ({ label: t.id, name: t.name, imageUrl: t.avatar! }));
      const { matcher, failed } = await buildMatcher(people, MATCH_THRESHOLD);
      matcherRef.current = matcher;
      setModelState("ready");
      log("Face Recognition", `Ready · ${people.length - failed.length} teacher faces encoded${failed.length ? ` (failed: ${failed.join(", ")})` : ""}`, failed.length ? "warn" : "success");
      return matcher;
    } catch {
      setModelState("error");
      log("Face Recognition", "Failed to load face models", "error");
      return null;
    }
  }, [knownTeachers, log]);

  async function tick() {
    const v = camRef.current;
    const matcher = matcherRef.current;
    if (!v || !matcher || v.readyState < 2) return;
    try {
      const found = await detectAndMatch(v, matcher);
      setMatches(found);
      for (const m of found) {
        if (m.label === "unknown") continue;
        hitsRef.current[m.label] = (hitsRef.current[m.label] ?? 0) + 1;
        if (hitsRef.current[m.label] === STABLE_HITS) {
          const t = teachers.find((x) => x.id === m.label);
          if (t) {
            log("Face Recognition", `Instructor confirmed: ${t.name} (${Math.round((1 - m.distance) * 100)}% match)`, "success");
            checkInTeacher(t.id);
          }
        }
      }
    } catch { /* transient frame error */ }
  }

  async function startCamera() {
    const matcher = await ensureMatcher();
    if (!matcher) return;
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      if (camRef.current) camRef.current.srcObject = s;
      setCamOn(true);
      hitsRef.current = {};
      log("Face Recognition", "Verification camera live", "success");
      loopRef.current = window.setInterval(tick, 600);
    } catch {
      log("Face Recognition", "Webcam unavailable — grant camera permission", "error");
    }
  }

  function stopCamera() {
    if (loopRef.current) { clearInterval(loopRef.current); loopRef.current = null; }
    const v = camRef.current;
    const tracks = (v?.srcObject as MediaStream | null)?.getTracks() ?? [];
    tracks.forEach((t) => t.stop());
    if (v) v.srcObject = null;
    setCamOn(false);
    setMatches([]);
  }

  // ---------- Manual screen share + recording ----------
  async function startManualShare() {
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
      let mic: MediaStream | null = null;
      try { mic = await navigator.mediaDevices.getUserMedia({ audio: true }); }
      catch { log("Recording", "Microphone unavailable — recording screen audio only", "warn"); }

      const combined = new MediaStream();
      display.getVideoTracks().forEach((t) => combined.addTrack(t));
      display.getAudioTracks().forEach((t) => combined.addTrack(t));
      mic?.getAudioTracks().forEach((t) => { combined.addTrack(t); extraTracksRef.current.push(t); });

      if (videoRef.current) videoRef.current.srcObject = display;
      setLiveStream(true);
      setDevice("sharing", true);
      setDevice("recording", true);
      log("Smart Screen", "Instructor shared their screen — recording started", "success");

      chunksRef.current = [];
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      const rec = new MediaRecorder(combined, { mimeType: mime });
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        setRecordedUrl(url);
        addRecording({
          sessionId: schedule.sessionId ?? "live",
          courseId: schedule.courseId ?? "live",
          title: `${schedule.course} · ${new Date().toLocaleDateString()}`,
          date: new Date().toISOString().slice(0, 10),
          durationSec: elapsed,
          url,
        });
        log("Recording", `Saved ${(blob.size / 1024 / 1024).toFixed(1)} MB with audio · students notified`, "success");
      };
      rec.start(1000);
      recRef.current = rec;

      display.getVideoTracks()[0].addEventListener("ended", stopMediaTracks);
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
    extraTracksRef.current.forEach((t) => t.stop());
    extraTracksRef.current = [];
    if (v) v.srcObject = null;
    setLiveStream(false);
    setDevice("sharing", false);
    setDevice("recording", false);
  }

  const title = mode === "screen" ? "Smart Screen Sharing" : "Smart Lecture Recording";
  const Icon = mode === "screen" ? MonitorPlay : Video;
  const vw = camRef.current?.videoWidth || 1;
  const vh = camRef.current?.videoHeight || 1;

  // What to render in the main canvas: verification cam → preloaded slides → live screen.
  const showCam = !teacherPresent;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Icon className="w-6 h-6 text-primary" /> {title}</h1>
        <p className="text-sm text-muted-foreground">
          Instructor verifies via face on this screen — once recognized, preloaded slides auto-load and recording begins. No tab-switching required.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel
          title={showCam ? "Instructor verification" : "Live canvas"}
          className="lg:col-span-2"
          subtitle={showCam
            ? (modelState === "loading" ? "Loading models…" : camOn ? "Scanning…" : "Camera off")
            : autoMode && hasMaterial ? "Auto · preloaded material" : liveStream ? "Live screen share" : "Idle"}
          action={showCam ? (
            <button onClick={camOn ? stopCamera : startCamera} disabled={modelState === "loading"}
              className="text-xs px-3 py-1.5 rounded-md bg-primary text-primary-foreground hover:opacity-90 inline-flex items-center gap-1.5 disabled:opacity-50">
              {modelState === "loading" ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Loading</>
                : camOn ? <><CameraOff className="w-3.5 h-3.5" /> Stop</>
                : <><Camera className="w-3.5 h-3.5" /> Start camera</>}
            </button>
          ) : undefined}>

          <div className="aspect-video bg-black rounded-lg overflow-hidden border border-border relative">
            {/* --- VERIFICATION CAMERA --- */}
            {showCam && (
              <>
                <video ref={camRef} autoPlay playsInline muted className="w-full h-full object-contain" />
                {!camOn && (
                  <div className="absolute inset-0 grid place-items-center text-muted-foreground text-sm">
                    <div className="text-center">
                      <ScanFace className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <div>{modelState === "error" ? "Could not load models" : "Start the camera to verify the instructor"}</div>
                      <div className="text-xs mt-1">Sharing & recording start automatically on a match.</div>
                    </div>
                  </div>
                )}
                {camOn && matches.map((m, i) => {
                  const known = m.label !== "unknown";
                  const name = teachers.find((t) => t.id === m.label)?.name ?? "Unknown";
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
                        {known ? `${name} · ${Math.round((1 - m.distance) * 100)}%` : "Unknown face"}
                      </span>
                    </div>
                  );
                })}
              </>
            )}

            {/* --- LIVE CANVAS --- */}
            {!showCam && (
              <>
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />

                {!liveStream && autoMode && hasMaterial && materialUrl && (
                  <div ref={pdfFrameRef} className="absolute inset-0 bg-white grid place-items-center p-3">
                    {pdfStatus === "ready" && <canvas ref={pdfCanvasRef} className="max-w-full max-h-full shadow-lg" />}
                    {pdfStatus !== "ready" && (
                      <div className="text-center max-w-md text-background">
                        {pdfStatus === "loading" ? <Loader2 className="w-14 h-14 mx-auto text-primary mb-4 animate-spin" /> : <FileText className="w-14 h-14 mx-auto text-primary mb-4" />}
                        <div className="text-xs uppercase tracking-widest opacity-70">{pdfStatus === "error" ? "Slide renderer needs reload" : "Loading preloaded material…"}</div>
                        <div className="text-xl font-semibold mt-2">{schedule.material!.title}</div>
                      </div>
                    )}
                    {pdfStatus === "ready" && pdfPages > 1 && (
                      <div className="absolute bottom-3 right-3 inline-flex items-center gap-2 rounded-md border border-border bg-background/90 px-2 py-1 text-xs shadow-sm">
                        <button onClick={() => setPdfPage((p) => Math.max(1, p - 1))} disabled={pdfPage <= 1} className="p-1 rounded hover:bg-secondary disabled:opacity-40" aria-label="Previous slide">
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <span>{pdfPage} / {pdfPages}</span>
                        <button onClick={() => setPdfPage((p) => Math.min(pdfPages, p + 1))} disabled={pdfPage >= pdfPages} className="p-1 rounded hover:bg-secondary disabled:opacity-40" aria-label="Next slide">
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {!liveStream && autoMode && !hasMaterial && (
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
                      <div className="text-sm mt-2">Awaiting active session window…</div>
                    </div>
                  </div>
                )}

                {devices.recording && (
                  <div className="absolute top-3 left-3 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-destructive/80 text-white text-xs">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" /> REC {fmt(elapsed)}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2 items-center">
            {teacherPresent && (
              <span className="text-xs inline-flex items-center gap-1.5 px-2 py-1 rounded-full bg-[color:var(--success)]/15 text-[color:var(--success)] border border-[color:var(--success)]/30">
                <UserCheck className="w-3.5 h-3.5" /> {currentTeacher} verified
              </span>
            )}
            {!liveStream && teacherPresent && (
              <button onClick={startManualShare} className="px-3 py-2 rounded-md bg-primary text-primary-foreground text-sm inline-flex items-center gap-2">
                <MonitorPlay className="w-4 h-4" /> {hasMaterial ? "Override · share my screen" : "Share my screen"}
              </button>
            )}
            {devices.sharing && (
              <button onClick={teacherPresent ? checkOutTeacher : stopMediaTracks}
                className="px-3 py-2 rounded-md bg-secondary border border-border text-sm inline-flex items-center gap-2">
                <Square className="w-4 h-4" /> End session
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
            Verification → live canvas → recording all run in this panel. No need to switch tabs.
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
