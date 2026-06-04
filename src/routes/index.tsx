import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClassroomProvider } from "@/lib/classroom-store";
import { Shell, type ModuleId } from "@/components/classroom/Shell";
import { Dashboard } from "@/components/classroom/modules/Dashboard";
import { FaceAttendance } from "@/components/classroom/modules/FaceAttendance";
import { RfidAttendance } from "@/components/classroom/modules/RfidAttendance";
import { LightControl } from "@/components/classroom/modules/LightControl";
import { TempControl } from "@/components/classroom/modules/TempControl";
import { AirQuality } from "@/components/classroom/modules/AirQuality";
import { AttentionMonitor } from "@/components/classroom/modules/AttentionMonitor";
import { ScreenAndRecording } from "@/components/classroom/modules/ScreenAndRecording";

import { PortalSelector, type Portal } from "@/components/classroom/PortalSelector";
import { Login } from "@/components/classroom/Login";
import { InstructorPortal, StudentPortal } from "@/components/classroom/Portals";
import { AdminPortal } from "@/components/classroom/AdminPortal";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Classroom · System / Instructor / Student / Admin" },
      { name: "description", content: "Four integrated portals: System (in-class), Instructor, Student, and Admin (Coordinator + General Admin)." },
      { property: "og:title", content: "Smart Classroom · Integrated Control Suite" },
      { property: "og:description", content: "Smart classroom with multi-face attendance, lateness rules, schedule-aware recording, and role-based portals." },
    ],
  }),
  component: Index,
});

type View =
  | { kind: "select" }
  | { kind: "system" }
  | { kind: "instructor-login" }
  | { kind: "instructor"; id: string }
  | { kind: "student-login" }
  | { kind: "student"; id: string }
  | { kind: "admin-role-pick" }
  | { kind: "admin-login"; role: "coordinator" | "admin" }
  | { kind: "admin"; id: string };

function Index() {
  const [view, setView] = useState<View>({ kind: "select" });

  function pick(p: Portal) {
    if (p === "system") setView({ kind: "system" });
    else if (p === "instructor") setView({ kind: "instructor-login" });
    else if (p === "student") setView({ kind: "student-login" });
    else setView({ kind: "admin-role-pick" });
  }
  const back = () => setView({ kind: "select" });

  return (
    <ClassroomProvider>
      {view.kind === "select" && <PortalSelector onPick={pick} />}
      {view.kind === "system" && <SystemPortalShell onBack={back} />}
      {view.kind === "instructor-login" && (
        <Login role="instructor" onBack={back} onSuccess={(id) => setView({ kind: "instructor", id })} />
      )}
      {view.kind === "instructor" && <InstructorPortal teacherId={view.id} onLogout={back} />}
      {view.kind === "student-login" && (
        <Login role="student" onBack={back} onSuccess={(id) => setView({ kind: "student", id })} />
      )}
      {view.kind === "student" && <StudentPortal studentId={view.id} onLogout={back} />}
      {view.kind === "admin-role-pick" && <AdminRolePicker onPick={(role) => setView({ kind: "admin-login", role })} onBack={back} />}
      {view.kind === "admin-login" && (
        <Login role={view.role} onBack={() => setView({ kind: "admin-role-pick" })} onSuccess={(id) => setView({ kind: "admin", id })} />
      )}
      {view.kind === "admin" && <AdminPortal adminId={view.id} onLogout={back} />}
    </ClassroomProvider>
  );
}

function AdminRolePicker({ onPick, onBack }: { onPick: (r: "coordinator" | "admin") => void; onBack: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-2xl">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground mb-4">← Back to portals</button>
        <h1 className="text-2xl font-semibold mb-1">Admin sign-in</h1>
        <p className="text-sm text-muted-foreground mb-6">Choose how you want to sign in.</p>
        <div className="grid sm:grid-cols-2 gap-4">
          <button onClick={() => onPick("coordinator")} className="text-left rounded-2xl p-6 border border-border bg-card/60 hover:border-primary/50">
            <div className="text-lg font-semibold">Class Coordinator</div>
            <div className="text-sm text-muted-foreground mt-1">Manage instructors, students, courses, schedule and preload slides for teachers.</div>
            <div className="text-xs text-muted-foreground mt-3"><code>coordinator / Coord@1234</code></div>
          </button>
          <button onClick={() => onPick("admin")} className="text-left rounded-2xl p-6 border border-border bg-card/60 hover:border-primary/50">
            <div className="text-lg font-semibold">General Admin</div>
            <div className="text-sm text-muted-foreground mt-1">Monitoring, devices, security, audit logs, backups, reports and user activation.</div>
            <div className="text-xs text-muted-foreground mt-3"><code>admin / Admin@1234</code></div>
          </button>
        </div>
      </div>
    </div>
  );
}

function SystemPortalShell({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<ModuleId>("dashboard");
  const showScreen = active === "screen" || active === "record";
  return (
    <Shell active={active} onChange={setActive} onSwitchPortal={onBack} portalLabel="System Portal">
      {active === "dashboard" && <Dashboard />}
      {active === "face" && <FaceAttendance />}
      {active === "rfid" && <RfidAttendance />}
      {active === "light" && <LightControl />}
      {active === "temp" && <TempControl />}
      {active === "air" && <AirQuality />}
      {active === "attention" && <AttentionMonitor />}
      {/* Screen & Recording stays mounted so recording can continue in background (mini mode) when navigating away. */}
      <div style={{ display: showScreen ? "block" : "none" }}>
        <ScreenAndRecording mode={active === "screen" ? "screen" : "record"} backgroundActive={!showScreen} onJumpBack={() => setActive("record")} />
      </div>
    </Shell>
  );
}
