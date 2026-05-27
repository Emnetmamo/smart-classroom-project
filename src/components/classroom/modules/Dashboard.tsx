import { useClassroom } from "@/lib/classroom-store";
import { Panel, Stat, Pill } from "./ui";
import { Lightbulb, Thermometer, Wind, Users, Activity, Video, MonitorPlay } from "lucide-react";

export function Dashboard() {
  const { students, sensors, devices, logs, schedule } = useClassroom();
  const present = students.filter((s) => s.present).length;
  const avgAttention = present > 0
    ? Math.round(students.filter((s) => s.present).reduce((a, s) => a + (s.attention ?? 0), 0) / present)
    : 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Live Classroom Overview</h1>
        <p className="text-sm text-muted-foreground">All modules are reacting to shared state in real time.</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Occupancy" value={`${present}/${students.length}`} hint={present > 0 ? "Class in session" : "Empty"} tone={present > 0 ? "good" : "default"} />
        <Stat label="Temperature" value={`${sensors.temperature.toFixed(1)}°C`} hint={`target ${sensors.targetTemp}°C`} tone={Math.abs(sensors.temperature - sensors.targetTemp) > 2 ? "warn" : "good"} />
        <Stat label="CO₂" value={`${Math.round(sensors.co2)} ppm`} hint={sensors.co2 > 1000 ? "Poor" : sensors.co2 > 700 ? "Moderate" : "Good"} tone={sensors.co2 > 1000 ? "bad" : sensors.co2 > 700 ? "warn" : "good"} />
        <Stat label="Avg attention" value={`${avgAttention}%`} hint={avgAttention < 50 ? "Engagement low" : "Healthy"} tone={avgAttention < 50 ? "bad" : avgAttention < 70 ? "warn" : "good"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Device state" subtitle="Driven by integrated rule engines" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <DeviceCard icon={Lightbulb} label="Lights" on={devices.lightsOn} />
            <DeviceCard icon={Thermometer} label="AC" on={devices.acOn} />
            <DeviceCard icon={Thermometer} label="Heater" on={devices.heaterOn} />
            <DeviceCard icon={Wind} label="Ventilation" on={devices.fanOn} />
            <DeviceCard icon={Wind} label="Purifier" on={devices.purifierOn} />
            <DeviceCard icon={Video} label="Recording" on={devices.recording} />
            <DeviceCard icon={MonitorPlay} label="Screen share" on={devices.sharing} />
            <DeviceCard icon={Users} label="Presence" on={sensors.presence} />
            <DeviceCard icon={Activity} label="Session" on={schedule.active} />
          </div>
        </Panel>

        <Panel title="Live event log" subtitle="Cross-module activity">
          <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
            {logs.length === 0 && <p className="text-sm text-muted-foreground">No events yet. Try checking a student in.</p>}
            {logs.map((l) => (
              <div key={l.id} className="text-xs border-l-2 pl-3 py-1"
                style={{ borderColor: l.level === "error" ? "var(--destructive)" : l.level === "warn" ? "var(--warning)" : l.level === "success" ? "var(--success)" : "var(--border)" }}>
                <div className="flex justify-between gap-2">
                  <span className="font-medium">{l.module}</span>
                  <span className="text-muted-foreground">{l.time}</span>
                </div>
                <div className="text-muted-foreground">{l.message}</div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel title="Module integration map" subtitle="How modules share data">
        <pre className="text-xs text-muted-foreground overflow-x-auto leading-relaxed">{`
  [Face Recognition] ──┐
                       ├──► [Attendance Service] ──► [Presence] ──┬──► [Light Control]
  [RFID Scanner]    ───┘                                          ├──► [Temperature]
                                                                  └──► [Air Quality]
  [Schedule] ──► [Screen Sharing] ──► [Lecture Recording]
  [Cameras]  ──► [Attention Monitor] ──► alerts + reports
  [System Admin] ◄── audit logs from all modules
`}</pre>
      </Panel>
    </div>
  );
}

function DeviceCard({ icon: Icon, label, on }: { icon: typeof Lightbulb; label: string; on: boolean }) {
  return (
    <div className="bg-secondary/40 border border-border/50 rounded-lg p-3 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-md grid place-items-center ${on ? "bg-primary/20 text-primary" : "bg-muted text-muted-foreground"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-medium truncate">{label}</div>
        <Pill on={on} label="" />
      </div>
    </div>
  );
}
