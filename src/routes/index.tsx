import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ClassroomProvider, useClassroom } from "@/lib/classroom-store";
import { Shell, type ModuleId } from "@/components/classroom/Shell";
import { Dashboard } from "@/components/classroom/modules/Dashboard";
import { FaceAttendance } from "@/components/classroom/modules/FaceAttendance";
import { RfidAttendance } from "@/components/classroom/modules/RfidAttendance";
import { LightControl } from "@/components/classroom/modules/LightControl";
import { TempControl } from "@/components/classroom/modules/TempControl";
import { AirQuality } from "@/components/classroom/modules/AirQuality";
import { AttentionMonitor } from "@/components/classroom/modules/AttentionMonitor";
import { ScreenAndRecording } from "@/components/classroom/modules/ScreenAndRecording";
import { CoordinatorWorkspace } from "@/components/classroom/modules/CoordinatorWorkspace";
import { PortalSelector, type Portal } from "@/components/classroom/PortalSelector";
import { Login } from "@/components/classroom/Login";
import { InstructorPortal, StudentPortal } from "@/components/classroom/Portals";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Classroom · System / Instructor / Student" },
      { name: "description", content: "Three integrated portals: System (attendance, environment, screen sharing, recording, admin), Instructor, and Student." },
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
  | { kind: "student"; id: string };

function Index() {
  const [view, setView] = useState<View>({ kind: "select" });

  function pick(p: Portal) {
    if (p === "system") setView({ kind: "system" });
    else if (p === "instructor") setView({ kind: "instructor-login" });
    else setView({ kind: "student-login" });
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
    </ClassroomProvider>
  );
}

function SystemPortalShell({ onBack }: { onBack: () => void }) {
  const [active, setActive] = useState<ModuleId>("dashboard");
  // useClassroom not needed here, but ensures provider mounts
  useClassroom();
  return (
    <Shell active={active} onChange={setActive} onSwitchPortal={onBack} portalLabel="System Portal">
      {active === "dashboard" && <Dashboard />}
      {active === "face" && <FaceAttendance />}
      {active === "rfid" && <RfidAttendance />}
      {active === "light" && <LightControl />}
      {active === "temp" && <TempControl />}
      {active === "air" && <AirQuality />}
      {active === "attention" && <AttentionMonitor />}
      {active === "screen" && <ScreenAndRecording mode="screen" />}
      {active === "record" && <ScreenAndRecording mode="record" />}
      {active === "admin" && <CoordinatorWorkspace />}
    </Shell>
  );
}
