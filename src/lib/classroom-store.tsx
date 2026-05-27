import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Student = {
  id: string;
  name: string;
  rfid: string;
  present: boolean;
  checkInMethod?: "face" | "rfid" | null;
  checkInTime?: string;
  attention?: number; // 0-100
};

export type LogEntry = {
  id: string;
  time: string;
  module: string;
  message: string;
  level: "info" | "warn" | "error" | "success";
};

type Sensors = {
  ambientLight: number; // 0-100 (% brightness)
  presence: boolean;
  temperature: number; // °C
  targetTemp: number;
  co2: number; // ppm
  pm25: number; // µg/m³
  humidity: number; // %
};

type Devices = {
  lightsOn: boolean;
  acOn: boolean;
  heaterOn: boolean;
  fanOn: boolean;
  purifierOn: boolean;
  recording: boolean;
  sharing: boolean;
};

type Schedule = {
  course: string;
  instructor: string;
  start: string;
  end: string;
  active: boolean;
};

type Ctx = {
  students: Student[];
  logs: LogEntry[];
  sensors: Sensors;
  devices: Devices;
  schedule: Schedule;
  setSensor: <K extends keyof Sensors>(k: K, v: Sensors[K]) => void;
  setDevice: <K extends keyof Devices>(k: K, v: Devices[K]) => void;
  checkIn: (id: string, method: "face" | "rfid") => void;
  checkOutAll: () => void;
  setAttention: (id: string, v: number) => void;
  log: (module: string, message: string, level?: LogEntry["level"]) => void;
  setSchedule: (s: Partial<Schedule>) => void;
};

const ClassroomCtx = createContext<Ctx | null>(null);

const initialStudents: Student[] = [
  { id: "S001", name: "Alex Martin", rfid: "RF-8821", present: false, attention: 78 },
  { id: "S002", name: "Bilal Ahmed", rfid: "RF-2294", present: false, attention: 65 },
  { id: "S003", name: "Chloé Dubois", rfid: "RF-5517", present: false, attention: 84 },
  { id: "S004", name: "Daniel Kim", rfid: "RF-7733", present: false, attention: 72 },
  { id: "S005", name: "Emma Rossi", rfid: "RF-1102", present: false, attention: 90 },
  { id: "S006", name: "Farah Noor", rfid: "RF-9988", present: false, attention: 55 },
  { id: "S007", name: "Gabriel Silva", rfid: "RF-4456", present: false, attention: 68 },
  { id: "S008", name: "Hana Tanaka", rfid: "RF-6620", present: false, attention: 82 },
];

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [sensors, setSensors] = useState<Sensors>({
    ambientLight: 70,
    presence: false,
    temperature: 24,
    targetTemp: 22,
    co2: 480,
    pm25: 12,
    humidity: 45,
  });
  const [devices, setDevices] = useState<Devices>({
    lightsOn: false,
    acOn: false,
    heaterOn: false,
    fanOn: false,
    purifierOn: false,
    recording: false,
    sharing: false,
  });
  const [schedule, setScheduleState] = useState<Schedule>({
    course: "CS-401 Distributed Systems",
    instructor: "Dr. Mengistu",
    start: "09:00",
    end: "10:30",
    active: true,
  });

  const log: Ctx["log"] = (module, message, level = "info") => {
    setLogs((prev) =>
      [{ id: crypto.randomUUID(), time: new Date().toLocaleTimeString(), module, message, level }, ...prev].slice(0, 200),
    );
  };

  const setSensor: Ctx["setSensor"] = (k, v) => setSensors((s) => ({ ...s, [k]: v }));
  const setDevice: Ctx["setDevice"] = (k, v) => setDevices((d) => ({ ...d, [k]: v }));

  const checkIn: Ctx["checkIn"] = (id, method) => {
    setStudents((prev) => {
      const s = prev.find((x) => x.id === id);
      if (!s) return prev;
      if (s.present) {
        log("Attendance", `Duplicate ignored: ${s.name} via ${method.toUpperCase()}`, "warn");
        return prev;
      }
      log("Attendance", `${s.name} checked in via ${method.toUpperCase()}`, "success");
      return prev.map((x) =>
        x.id === id ? { ...x, present: true, checkInMethod: method, checkInTime: new Date().toLocaleTimeString() } : x,
      );
    });
  };

  const checkOutAll = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, present: false, checkInMethod: null, checkInTime: undefined })));
    log("Attendance", "Session ended — all students checked out", "info");
  };

  const setAttention = (id: string, v: number) =>
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, attention: v } : s)));

  const setSchedule: Ctx["setSchedule"] = (s) => setScheduleState((cur) => ({ ...cur, ...s }));

  // Integrated reactive control loops
  const presentCount = students.filter((s) => s.present).length;
  const occupied = presentCount > 0;

  // sync presence sensor with attendance
  useEffect(() => {
    setSensors((s) => (s.presence === occupied ? s : { ...s, presence: occupied }));
  }, [occupied]);

  // Light controller: presence + ambient light threshold
  useEffect(() => {
    const should = sensors.presence && sensors.ambientLight < 40;
    setDevices((d) => {
      if (d.lightsOn === should) return d;
      log("Light Control", `Lights ${should ? "ON" : "OFF"} (presence=${sensors.presence}, ambient=${sensors.ambientLight}%)`, "info");
      return { ...d, lightsOn: should };
    });
  }, [sensors.presence, sensors.ambientLight]);

  // Temperature controller
  useEffect(() => {
    const diff = sensors.temperature - sensors.targetTemp;
    setDevices((d) => {
      const ac = sensors.presence && diff > 1.5;
      const heat = sensors.presence && diff < -1.5;
      const next = { ...d, acOn: ac, heaterOn: heat };
      if (ac !== d.acOn) log("Temperature", `AC ${ac ? "ON" : "OFF"} — ${sensors.temperature.toFixed(1)}°C vs target ${sensors.targetTemp}°C`);
      if (heat !== d.heaterOn) log("Temperature", `Heater ${heat ? "ON" : "OFF"}`);
      return next;
    });
  }, [sensors.temperature, sensors.targetTemp, sensors.presence]);

  // Air quality controller
  useEffect(() => {
    const poor = sensors.co2 > 1000 || sensors.pm25 > 35;
    const moderate = sensors.co2 > 700 || sensors.pm25 > 20;
    const fan = sensors.presence && (moderate || poor);
    const pur = sensors.presence && poor;
    setDevices((d) => {
      if (d.fanOn === fan && d.purifierOn === pur) return d;
      if (fan !== d.fanOn) log("Air Quality", `Ventilation ${fan ? "ON" : "OFF"} (CO₂=${sensors.co2}ppm)`);
      if (pur !== d.purifierOn) log("Air Quality", `Purifier ${pur ? "ON" : "OFF"} (PM2.5=${sensors.pm25})`, pur ? "warn" : "info");
      return { ...d, fanOn: fan, purifierOn: pur };
    });
  }, [sensors.co2, sensors.pm25, sensors.presence]);

  // Drift sensors over time
  useEffect(() => {
    const t = setInterval(() => {
      setSensors((s) => {
        const occ = students.some((x) => x.present);
        const tempDrift = occ ? 0.08 : -0.05;
        const co2Drift = occ ? 12 : -8;
        const pmDrift = occ ? 0.4 : -0.3;
        return {
          ...s,
          temperature: Math.max(15, Math.min(35, s.temperature + tempDrift + (Math.random() - 0.5) * 0.2)),
          co2: Math.max(400, Math.min(2000, s.co2 + co2Drift + (Math.random() - 0.5) * 5)),
          pm25: Math.max(2, Math.min(100, s.pm25 + pmDrift + (Math.random() - 0.5) * 0.6)),
          humidity: Math.max(20, Math.min(80, s.humidity + (Math.random() - 0.5) * 0.5)),
        };
      });
      // gentle attention drift
      setStudents((prev) =>
        prev.map((s) =>
          s.present
            ? { ...s, attention: Math.max(10, Math.min(100, (s.attention ?? 70) + (Math.random() - 0.55) * 4)) }
            : s,
        ),
      );
    }, 2000);
    return () => clearInterval(t);
  }, [students]);

  return (
    <ClassroomCtx.Provider
      value={{ students, logs, sensors, devices, schedule, setSensor, setDevice, checkIn, checkOutAll, setAttention, log, setSchedule }}
    >
      {children}
    </ClassroomCtx.Provider>
  );
}

export function useClassroom() {
  const c = useContext(ClassroomCtx);
  if (!c) throw new Error("useClassroom must be used within ClassroomProvider");
  return c;
}
