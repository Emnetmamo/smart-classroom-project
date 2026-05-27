import { useClassroom } from "@/lib/classroom-store";
import { Panel, Slider, Pill, Stat } from "../ui";
import { Thermometer, Snowflake, Flame } from "lucide-react";

export function TempControl() {
  const { sensors, devices, setSensor } = useClassroom();
  const diff = sensors.temperature - sensors.targetTemp;
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Thermometer className="w-6 h-6 text-primary" /> Temperature Regulation</h1>
        <p className="text-sm text-muted-foreground">Hardware replacement: simulated digital temp sensor + HVAC relay (Ananya module).</p>
      </header>
      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Controls">
          <Slider label="Current temperature" min={15} max={35} step={0.1} value={sensors.temperature}
            onChange={(v) => setSensor("temperature", v)} unit="°C" />
          <div className="mt-4">
            <Slider label="Target comfort temp" min={18} max={28} value={sensors.targetTemp}
              onChange={(v) => setSensor("targetTemp", v)} unit="°C" />
          </div>
          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <Pill on={devices.acOn} label="AC" />
            <Pill on={devices.heaterOn} label="Heater" />
            <Pill on={sensors.presence} label="Occupancy" />
          </div>
        </Panel>
        <Panel title="Live state" className="lg:col-span-2">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Now" value={`${sensors.temperature.toFixed(1)}°C`} />
            <Stat label="Target" value={`${sensors.targetTemp}°C`} />
            <Stat label="Delta" value={`${diff > 0 ? "+" : ""}${diff.toFixed(1)}°C`}
              tone={Math.abs(diff) > 1.5 ? "warn" : "good"} />
          </div>
          <div className="mt-6 rounded-lg border border-border p-8 grid place-items-center bg-gradient-to-br from-secondary/40 to-card">
            {devices.acOn && <div className="flex items-center gap-3 text-cyan-400"><Snowflake className="w-12 h-12 animate-spin-slow" /><div><div className="text-2xl font-semibold">Cooling</div><div className="text-xs text-muted-foreground">AC active</div></div></div>}
            {devices.heaterOn && <div className="flex items-center gap-3 text-orange-400"><Flame className="w-12 h-12" /><div><div className="text-2xl font-semibold">Heating</div><div className="text-xs text-muted-foreground">Heater active</div></div></div>}
            {!devices.acOn && !devices.heaterOn && (
              <div className="text-center text-muted-foreground">
                <Thermometer className="w-12 h-12 mx-auto opacity-50" />
                <div className="mt-2 text-sm">Comfort range · HVAC idle</div>
              </div>
            )}
          </div>
          <style>{`.animate-spin-slow{animation:spin 6s linear infinite}`}</style>
          <div className="mt-4 text-xs text-muted-foreground">
            <strong>Rule:</strong> If occupied AND delta &gt; +1.5°C → AC. If delta &lt; −1.5°C → Heater. Else idle (energy save).
          </div>
        </Panel>
      </div>
    </div>
  );
}
