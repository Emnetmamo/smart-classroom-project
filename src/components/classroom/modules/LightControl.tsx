import { useClassroom } from "@/lib/classroom-store";
import { Panel, Slider, Pill, Stat } from "../ui";
import { Lightbulb, Sun, Moon } from "lucide-react";

export function LightControl() {
  const { sensors, devices, setSensor } = useClassroom();
  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold flex items-center gap-2"><Lightbulb className="w-6 h-6 text-primary" /> Light Control</h1>
        <p className="text-sm text-muted-foreground">Hardware replacement: simulated ultrasonic presence + LDR ambient light (Etsub module).</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-6">
        <Panel title="Sensor simulator" className="lg:col-span-1">
          <div className="space-y-4">
            <Slider label="Ambient light (LDR)" min={0} max={100} value={sensors.ambientLight}
              onChange={(v) => setSensor("ambientLight", v)} unit="%" />
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {sensors.ambientLight < 40 ? <><Moon className="w-3.5 h-3.5" /> Dark</> : <><Sun className="w-3.5 h-3.5" /> Daylight</>}
              · threshold 40%
            </div>
            <div className="pt-2 border-t border-border">
              <div className="text-xs text-muted-foreground mb-1">Presence (from attendance)</div>
              <Pill on={sensors.presence} label="Occupancy" />
            </div>
          </div>
        </Panel>

        <Panel title="Live state" className="lg:col-span-2">
          <div className="grid grid-cols-2 gap-3">
            <Stat label="Lights" value={devices.lightsOn ? "ON" : "OFF"} tone={devices.lightsOn ? "good" : "default"} />
            <Stat label="Ambient" value={`${sensors.ambientLight}%`} />
          </div>
          <div className="mt-6 aspect-[16/9] rounded-lg relative overflow-hidden border border-border"
            style={{
              background: devices.lightsOn
                ? "radial-gradient(circle at 50% 30%, oklch(0.95 0.05 90), oklch(0.6 0.08 90))"
                : `linear-gradient(135deg, oklch(${0.1 + sensors.ambientLight * 0.005} 0.02 240), oklch(${0.18 + sensors.ambientLight * 0.005} 0.02 240))`,
              transition: "background 0.4s",
            }}>
            <div className="absolute inset-0 grid place-items-center">
              <div className="text-center">
                <Lightbulb className={`w-16 h-16 mx-auto ${devices.lightsOn ? "text-yellow-300 drop-shadow-[0_0_20px_rgba(250,204,21,0.8)]" : "text-muted-foreground opacity-40"}`} />
                <div className="mt-2 text-sm font-medium" style={{ color: devices.lightsOn ? "#1a1a1a" : "var(--muted-foreground)" }}>
                  Classroom · {devices.lightsOn ? "Illuminated" : "Standby"}
                </div>
              </div>
            </div>
          </div>
          <div className="mt-4 text-xs text-muted-foreground leading-relaxed">
            <strong>Rule:</strong> Lights ON if presence detected AND ambient &lt; 40%. Otherwise OFF for energy saving.
          </div>
        </Panel>
      </div>
    </div>
  );
}
