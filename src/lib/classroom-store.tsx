import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type Student = {
  id: string;
  name: string;
  rfid: string;
  present: boolean;
  checkInMethod?: "face" | "rfid" | null;
  checkInTime?: string;
  attention?: number;
};

export type Teacher = {
  id: string;
  name: string;
};

export type Session = {
  id: string;
  day: number; // 1=Mon … 5=Fri
  start: string; // "HH:MM"
  end: string;
  course: string;
  instructor: string; // matches Teacher.name
  room: string;
  material?: { title: string; type: "slides" | "doc" | "video"; preloaded: boolean };
};

export type LogEntry = {
  id: string;
  time: string;
  module: string;
  message: string;
  level: "info" | "warn" | "error" | "success";
};

type Sensors = {
  ambientLight: number;
  presence: boolean;
  temperature: number;
  targetTemp: number;
  co2: number;
  pm25: number;
  humidity: number;
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

type CurrentSchedule = {
  course: string;
  instructor: string;
  start: string;
  end: string;
  active: boolean;
  room: string;
  sessionId: string | null;
  material?: Session["material"];
};

type Ctx = {
  students: Student[];
  teachers: Teacher[];
  teacherPresent: boolean;
  currentTeacher: string | null;
  sessions: Session[];
  logs: LogEntry[];
  sensors: Sensors;
  devices: Devices;
  schedule: CurrentSchedule;
  simNow: Date;
  setSimNow: (d: Date) => void;
  setSensor: <K extends keyof Sensors>(k: K, v: Sensors[K]) => void;
  setDevice: <K extends keyof Devices>(k: K, v: Devices[K]) => void;
  checkIn: (id: string, method: "face" | "rfid") => void;
  checkInTeacher: (teacherId: string) => void;
  checkOutTeacher: () => void;
  checkOutAll: () => void;
  setAttention: (id: string, v: number) => void;
  log: (module: string, message: string, level?: LogEntry["level"]) => void;
  setSchedule: (s: Partial<CurrentSchedule>) => void;
};

const ClassroomCtx = createContext<Ctx | null>(null);

// Real registered students, sorted alphabetically by first name
const initialStudents: Student[] = [
  { id: "GSR/7517/18", name: "Abera Diro", rfid: "RF-7517", present: false, attention: 78 },
  { id: "GSR/3930/18", name: "Amanuel Dereje", rfid: "RF-3930", present: false, attention: 72 },
  { id: "GSR/4801/18", name: "Ananya Fekeremariam", rfid: "RF-4801", present: false, attention: 84 },
  { id: "GSR/6115/18", name: "Betelihem Solomon", rfid: "RF-6115", present: false, attention: 80 },
  { id: "GSR/2212/18", name: "Emnet Mamo", rfid: "RF-2212", present: false, attention: 88 },
  { id: "GSR/5243/18", name: "Erenso Hundessa", rfid: "RF-5243", present: false, attention: 70 },
  { id: "GSR/7751/18", name: "Etsub Girma", rfid: "RF-7751", present: false, attention: 75 },
  { id: "GSR/4720/18", name: "Kasanesh Ayalew", rfid: "RF-4720", present: false, attention: 82 },
  { id: "GSR/1656/18", name: "Melat G/hiwot", rfid: "RF-1656", present: false, attention: 86 },
  { id: "GSR/6437/18", name: "Tarekegn Erena", rfid: "RF-6437", present: false, attention: 74 },
];

// Teachers from the AAU CS Regular Program · Room A319 timetable
const initialTeachers: Teacher[] = [
  { id: "T-AYB", name: "Dr. Ayalew B." },
  { id: "T-DGM", name: "Dr. Dagmawi L." },
  { id: "T-MLG", name: "Dr. Mulugeta L." },
  { id: "T-DID", name: "Dr. Dida M." },
  { id: "T-YRG", name: "Dr. Yaregal A." },
];

// Schedule from Room A319 timetable (Mon=1 … Fri=5)
const initialSessions: Session[] = [
  { id: "S1", day: 1, start: "08:30", end: "09:30", course: "CoSc 6104", instructor: "Dr. Ayalew B.", room: "A319",
    material: { title: "CoSc 6104 · Lecture Slides W1", type: "slides", preloaded: true } },
  { id: "S2", day: 1, start: "10:30", end: "11:30", course: "CoSc 6314", instructor: "Dr. Dagmawi L.", room: "A319",
    material: { title: "CoSc 6314 · Distributed Systems Intro", type: "slides", preloaded: true } },
  { id: "S3", day: 1, start: "13:30", end: "14:30", course: "CoSc 6252", instructor: "Dr. Yaregal A.", room: "A319" },
  { id: "S4", day: 2, start: "08:30", end: "09:30", course: "CoSc 6316", instructor: "Dr. Ayalew B.", room: "A319" },
  { id: "S5", day: 2, start: "10:30", end: "11:30", course: "CoSc 6302", instructor: "Dr. Mulugeta L.", room: "A319",
    material: { title: "CoSc 6302 · Machine Learning Notes", type: "doc", preloaded: true } },
  { id: "S6", day: 3, start: "08:30", end: "09:30", course: "CoSc 6104", instructor: "Dr. Ayalew B.", room: "A319" },
  { id: "S7", day: 3, start: "10:30", end: "11:30", course: "CoSc 6102", instructor: "Dr. Dida M.", room: "A319",
    material: { title: "CoSc 6102 · Algorithms Lecture", type: "slides", preloaded: true } },
  { id: "S8", day: 3, start: "13:30", end: "14:30", course: "CoSc 6252", instructor: "Dr. Yaregal A.", room: "A319" },
  { id: "S9", day: 4, start: "08:30", end: "09:30", course: "CoSc 6316", instructor: "Dr. Ayalew B.", room: "A319" },
  { id: "S10", day: 4, start: "10:30", end: "11:30", course: "CoSc 6302", instructor: "Dr. Mulugeta L.", room: "A319" },
  { id: "S11", day: 5, start: "08:30", end: "09:30", course: "CoSc 6314", instructor: "Dr. Dagmawi L.", room: "A319" },
  { id: "S12", day: 5, start: "10:30", end: "11:30", course: "CoSc 6102", instructor: "Dr. Dida M.", room: "A319",
    material: { title: "CoSc 6102 · Algorithms Lecture", type: "slides", preloaded: true } },
];

function toMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function findActiveOrNext(sessions: Session[], now: Date): { active: Session | null; next: Session | null } {
  const dow = now.getDay(); // 0=Sun
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = sessions.filter((s) => s.day === dow);
  const active = today.find((s) => toMinutes(s.start) <= nowMin && nowMin < toMinutes(s.end)) ?? null;
  const next = today.find((s) => toMinutes(s.start) > nowMin) ?? null;
  return { active, next };
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers] = useState<Teacher[]>(initialTeachers);
  const [sessions] = useState<Session[]>(initialSessions);
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simNow, setSimNow] = useState<Date>(() => new Date());

  const [sensors, setSensors] = useState<Sensors>({
    ambientLight: 35, presence: false, temperature: 24, targetTemp: 22,
    co2: 480, pm25: 12, humidity: 45,
  });
  const [devices, setDevices] = useState<Devices>({
    lightsOn: false, acOn: false, heaterOn: false, fanOn: false,
    purifierOn: false, recording: false, sharing: false,
  });

  const [overrideSchedule, setOverrideSchedule] = useState<Partial<CurrentSchedule>>({});

  // tick sim clock every 30s so schedule stays current
  useEffect(() => {
    const t = setInterval(() => setSimNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const schedule: CurrentSchedule = useMemo(() => {
    const { active, next } = findActiveOrNext(sessions, simNow);
    const s = active ?? next;
    const base: CurrentSchedule = s
      ? {
          course: s.course,
          instructor: s.instructor,
          start: s.start,
          end: s.end,
          room: s.room,
          active: !!active,
          sessionId: s.id,
          material: s.material,
        }
      : {
          course: "No session scheduled",
          instructor: "—",
          start: "--:--",
          end: "--:--",
          room: "A319",
          active: false,
          sessionId: null,
        };
    return { ...base, ...overrideSchedule };
  }, [sessions, simNow, overrideSchedule]);

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

  const checkInTeacher: Ctx["checkInTeacher"] = (teacherId) => {
    const t = teachers.find((x) => x.id === teacherId);
    if (!t) return;
    setTeacherPresent(true);
    setCurrentTeacher(t.name);
    log("Face Recognition", `Teacher verified: ${t.name}`, "success");

    // Auto-start screen sharing + recording when scheduled session matches teacher
    const matches = schedule.sessionId && schedule.instructor === t.name && schedule.active;
    if (matches) {
      const hasMaterial = !!schedule.material?.preloaded;
      setDevices((d) => ({ ...d, sharing: true, recording: true }));
      log(
        "Smart Screen",
        hasMaterial
          ? `Auto-loaded preloaded material: ${schedule.material!.title}`
          : `Auto-share waiting for instructor's screen — recording armed`,
        "success",
      );
      log("Recording", `Lecture recording auto-started for ${schedule.course}`, "success");
    } else {
      log("Schedule", `No active session matches ${t.name} right now — manual share available`, "info");
    }
  };

  const checkOutTeacher: Ctx["checkOutTeacher"] = () => {
    if (!teacherPresent) return;
    log("Face Recognition", `Teacher ${currentTeacher} left — auto-stopping share & recording`, "info");
    setTeacherPresent(false);
    setCurrentTeacher(null);
    setDevices((d) => ({ ...d, sharing: false, recording: false }));
  };

  const checkOutAll = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, present: false, checkInMethod: null, checkInTime: undefined })));
    log("Attendance", "Session ended — all students checked out", "info");
  };

  const setAttention = (id: string, v: number) =>
    setStudents((prev) => prev.map((s) => (s.id === id ? { ...s, attention: v } : s)));

  const setSchedule: Ctx["setSchedule"] = (s) => setOverrideSchedule((cur) => ({ ...cur, ...s }));

  // Presence = teacher OR any student present (drives lights, HVAC, air)
  const presentCount = students.filter((s) => s.present).length;
  const occupied = teacherPresent || presentCount > 0;

  useEffect(() => {
    setSensors((s) => (s.presence === occupied ? s : { ...s, presence: occupied }));
  }, [occupied]);

  // Light controller
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
      if (ac === d.acOn && heat === d.heaterOn) return d;
      if (ac !== d.acOn) log("Temperature", `AC ${ac ? "ON" : "OFF"} — ${sensors.temperature.toFixed(1)}°C vs target ${sensors.targetTemp}°C`);
      if (heat !== d.heaterOn) log("Temperature", `Heater ${heat ? "ON" : "OFF"}`);
      return { ...d, acOn: ac, heaterOn: heat };
    });
  }, [sensors.temperature, sensors.targetTemp, sensors.presence]);

  // Air quality
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

  // Drift sensors
  useEffect(() => {
    const t = setInterval(() => {
      setSensors((s) => {
        const occ = teacherPresent || students.some((x) => x.present);
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
      setStudents((prev) =>
        prev.map((s) =>
          s.present
            ? { ...s, attention: Math.max(10, Math.min(100, (s.attention ?? 70) + (Math.random() - 0.55) * 4)) }
            : s,
        ),
      );
    }, 2000);
    return () => clearInterval(t);
  }, [students, teacherPresent]);

  return (
    <ClassroomCtx.Provider
      value={{
        students, teachers, teacherPresent, currentTeacher, sessions, logs, sensors, devices,
        schedule, simNow, setSimNow,
        setSensor, setDevice, checkIn, checkInTeacher, checkOutTeacher, checkOutAll, setAttention, log, setSchedule,
      }}
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
