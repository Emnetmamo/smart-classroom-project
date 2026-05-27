import { useClassroom } from "@/lib/classroom-store";
import { Panel, Slider, Pill, Stat } from "../ui";
import { Wind } from "lucide-react";

export function AirQuality() {
  const { sensors, devices, setSensor } = useClassroom();
  const status =
    sensors.co2 > 1000 || sensors.pm25 > 35 ? { label: "Poor", tone: "bad" as const } :
    sensors.co2 > 700 || sensors.pm25 > 20 ? { label: "Moderate", tone: "warn" as const } :
    { label: "Good", tone: "good" as const };
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Wind className="w-6 h-6 text-primary" /> Air Quality Control</h1>
        <p className="text-sm text-muted-foreground">Hardware replacement: simulated MQ-135 / PM2.5 sensor + virtual purifier (Melat module).</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Simulator">
          <Slider label="CO₂" min={400} max={2000} value={sensors.co2} onChange={(v) => setSensor("co2", v)} unit=" ppm" />
          <div className="mt-3"><Slider label="PM2.5" min={0} max={100} value={sensors.pm25} onChange={(v) => setSensor("pm25", v)} unit=" µg/m³" /></div>
          <div className="mt-3"><Slider label="Humidity" min={20} max={80} value={sensors.humidity} onChange={(v) => setSensor("humidity", v)} unit="%" /></div>
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <Pill on={devices.fanOn} label="Ventilation" />
            <Pill on={devices.purifierOn} label="Purifier" />
          </div>
        </Panel>
        <Panel title="Live status" className="lg:col-span-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Air quality" value={status.label} tone={status.tone} />
            <Stat label="CO₂" value={`${Math.round(sensors.co2)}`} hint="ppm" />
            <Stat label="PM2.5" value={`${sensors.pm25.toFixed(1)}`} hint="µg/m³" />
            <Stat label="Humidity" value={`${sensors.humidity.toFixed(0)}%`} />
          </div>
          <div className="mt-6 rounded-lg border border-border p-6 bg-gradient-to-br from-secondary/30 to-card">
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-3">Response curve</div>
            <ResponseBar level={status.label} />
          </div>
          <div className="mt-4 text-xs text-muted-foreground space-y-1">
            <div><strong>Good:</strong> CO₂ &lt; 700 · normal mode</div>
            <div><strong>Moderate:</strong> increase ventilation</div>
            <div><strong>Poor:</strong> purifier + max ventilation</div>
          </div>
        </Panel>
      </div>
    </div>
  );
}

function ResponseBar({ level }: { level: string }) {
  const segs = [
    { name: "Good", color: "var(--success)" },
    { name: "Moderate", color: "var(--warning)" },
    { name: "Poor", color: "var(--destructive)" },
  ];
  return (
    <div className="flex gap-1">
      {segs.map((s) => (
        <div key={s.name} className="flex-1">
          <div className="h-3 rounded" style={{ background: s.color, opacity: level === s.name ? 1 : 0.25 }} />
          <div className="text-[10px] mt-1 text-muted-foreground text-center">{s.name}</div>
        </div>
      ))}
    </div>
  );
}
