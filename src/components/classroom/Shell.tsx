import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, ScanFace, CreditCard, Lightbulb, Thermometer, Wind,
  Eye, MonitorPlay, Video, Activity, LogOut, Clock, FastForward, Rewind,
} from "lucide-react";
import { useClassroom } from "@/lib/classroom-store";
import { cn } from "@/lib/utils";

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "face",      label: "Attendance · Face", icon: ScanFace },
  { id: "rfid",      label: "Attendance · RFID", icon: CreditCard },
  { id: "light",     label: "Light Control", icon: Lightbulb },
  { id: "temp",      label: "Temperature", icon: Thermometer },
  { id: "air",       label: "Air Quality", icon: Wind },
  { id: "attention", label: "Attention Monitor", icon: Eye },
  { id: "screen",    label: "Screen Sharing", icon: MonitorPlay },
  { id: "record",    label: "Lecture Recording", icon: Video },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

export function Shell({
  active, onChange, children, onSwitchPortal, portalLabel = "System Portal", userLabel,
}: {
  active: ModuleId;
  onChange: (m: ModuleId) => void;
  children: ReactNode;
  onSwitchPortal: () => void;
  portalLabel?: string;
  userLabel?: string;
}) {
  const { schedule, students, devices, simNow, advanceSim } = useClassroom();
  const present = students.filter((s) => s.present).length;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-72 bg-card/80 backdrop-blur-xl border-r border-border flex flex-col transition-transform",
        open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
      )}>
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/20 grid place-items-center glow-primary">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold gradient-text">Smart Classroom</div>
              <div className="text-xs text-muted-foreground">{portalLabel}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button key={m.id} onClick={() => { onChange(m.id); setOpen(false); }}
                className={cn("w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  isActive ? "bg-primary/15 text-primary border border-primary/30"
                           : "text-muted-foreground hover:bg-secondary hover:text-foreground")}>
                <Icon className="w-4 h-4 shrink-0" />
                <div className="truncate">{m.label}</div>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Session</span><span>{schedule.active ? "Active" : "Idle"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Present</span><span>{present}/{students.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Devices on</span><span>{Object.values(devices).filter(Boolean).length}</span></div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border px-4 lg:px-8 py-3 flex items-center gap-3">
          <button className="lg:hidden p-2 rounded-md border border-border" onClick={() => setOpen((o) => !o)}>
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="text-sm text-muted-foreground truncate">{schedule.course}</div>
            <div className="text-xs text-muted-foreground/70 truncate">{schedule.instructor} · {schedule.start}–{schedule.end} · Room {schedule.room}</div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-border bg-secondary/30">
              <Clock className="w-3 h-3" /> Sim {simNow.toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })}
            </span>
            <button onClick={() => advanceSim(-30)} title="Rewind simulated clock 30 min"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-secondary">
              <Rewind className="w-3 h-3" /> -30m
            </button>
            <button onClick={() => advanceSim(-10)} title="Rewind simulated clock 10 min"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-secondary">
              <Rewind className="w-3 h-3" /> -10m
            </button>
            <button onClick={() => advanceSim(10)} title="Advance simulated clock 10 min"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-secondary">
              <FastForward className="w-3 h-3" /> +10m
            </button>
            <button onClick={() => advanceSim(30)} title="Advance simulated clock 30 min"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border hover:bg-secondary">
              <FastForward className="w-3 h-3" /> +30m
            </button>
          </div>
          {userLabel && <span className="hidden sm:inline text-xs text-muted-foreground">{userLabel}</span>}
          <button onClick={onSwitchPortal} className="text-xs px-2.5 py-1.5 rounded-md border border-border hover:bg-secondary inline-flex items-center gap-1.5">
            <LogOut className="w-3.5 h-3.5" /> Switch portal
          </button>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
