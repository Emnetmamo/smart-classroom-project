import { useState, type ReactNode } from "react";
import {
  LayoutDashboard, ScanFace, CreditCard, Lightbulb, Thermometer, Wind,
  Eye, MonitorPlay, Video, ShieldCheck, Activity,
} from "lucide-react";
import { useClassroom } from "@/lib/classroom-store";
import { cn } from "@/lib/utils";

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, owner: "Integrated" },
  { id: "face", label: "Attendance · Face", icon: ScanFace, owner: "Erenso" },
  { id: "rfid", label: "Attendance · RFID", icon: CreditCard, owner: "Betty" },
  { id: "light", label: "Light Control", icon: Lightbulb, owner: "Etsub" },
  { id: "temp", label: "Temperature", icon: Thermometer, owner: "Ananya" },
  { id: "air", label: "Air Quality", icon: Wind, owner: "Melat" },
  { id: "attention", label: "Attention Monitor", icon: Eye, owner: "Amanuel" },
  { id: "screen", label: "Screen Sharing", icon: MonitorPlay, owner: "Smart Screen" },
  { id: "record", label: "Lecture Recording", icon: Video, owner: "Emnet" },
  { id: "admin", label: "System Admin", icon: ShieldCheck, owner: "Admin" },
] as const;

export type ModuleId = (typeof MODULES)[number]["id"];

export function Shell({ active, onChange, children }: { active: ModuleId; onChange: (m: ModuleId) => void; children: ReactNode }) {
  const { schedule, students, devices } = useClassroom();
  const present = students.filter((s) => s.present).length;
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen flex">
      <aside
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-40 w-72 bg-card/80 backdrop-blur-xl border-r border-border flex flex-col transition-transform",
          open ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        )}
      >
        <div className="p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-lg bg-primary/20 grid place-items-center glow-primary">
              <Activity className="w-5 h-5 text-primary" />
            </div>
            <div>
              <div className="font-semibold gradient-text">Smart Classroom</div>
              <div className="text-xs text-muted-foreground">Integrated Control Suite</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {MODULES.map((m) => {
            const Icon = m.icon;
            const isActive = active === m.id;
            return (
              <button
                key={m.id}
                onClick={() => { onChange(m.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all text-left",
                  isActive
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground",
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="truncate">{m.label}</div>
                  <div className="text-[10px] opacity-60 truncate">{m.owner}</div>
                </div>
              </button>
            );
          })}
        </nav>
        <div className="p-3 border-t border-border text-xs space-y-1">
          <div className="flex justify-between"><span className="text-muted-foreground">Session</span><span>{schedule.active ? "Active" : "Idle"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Present</span><span>{present}/{students.length}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Devices on</span>
            <span>{Object.values(devices).filter(Boolean).length}</span>
          </div>
        </div>
      </aside>

      <main className="flex-1 min-w-0">
        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border px-4 lg:px-8 py-3 flex items-center gap-3">
          <button className="lg:hidden p-2 rounded-md border border-border" onClick={() => setOpen((o) => !o)}>
            <LayoutDashboard className="w-4 h-4" />
          </button>
          <div className="flex-1">
            <div className="text-sm text-muted-foreground">{schedule.course}</div>
            <div className="text-xs text-muted-foreground/70">{schedule.instructor} · {schedule.start}–{schedule.end}</div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs">
            <span className={cn("inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border",
              schedule.active ? "border-success/40 text-[color:var(--success)] bg-[color:var(--success)]/10" : "border-border text-muted-foreground")}>
              <span className={cn("w-1.5 h-1.5 rounded-full", schedule.active ? "bg-[color:var(--success)] animate-pulse" : "bg-muted-foreground")} />
              {schedule.active ? "Live" : "Idle"}
            </span>
          </div>
        </header>
        <div className="p-4 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
