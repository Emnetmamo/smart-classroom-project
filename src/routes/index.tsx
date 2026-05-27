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
import { SystemAdmin } from "@/components/classroom/modules/SystemAdmin";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Classroom · Integrated Control Suite" },
      { name: "description", content: "Unified dashboard integrating attendance, environment, attention, screen sharing, lecture recording and admin modules." },
      { property: "og:title", content: "Smart Classroom · Integrated Control Suite" },
      { property: "og:description", content: "All smart classroom modules in one integrated dashboard. Hardware sensors replaced with software simulations." },
    ],
  }),
  component: Index,
});

function Index() {
  const [active, setActive] = useState<ModuleId>("dashboard");
  return (
    <ClassroomProvider>
      <Shell active={active} onChange={setActive}>
        {active === "dashboard" && <Dashboard />}
        {active === "face" && <FaceAttendance />}
        {active === "rfid" && <RfidAttendance />}
        {active === "light" && <LightControl />}
        {active === "temp" && <TempControl />}
        {active === "air" && <AirQuality />}
        {active === "attention" && <AttentionMonitor />}
        {active === "screen" && <ScreenAndRecording mode="screen" />}
        {active === "record" && <ScreenAndRecording mode="record" />}
        {active === "admin" && <SystemAdmin />}
      </Shell>
    </ClassroomProvider>
  );
}
