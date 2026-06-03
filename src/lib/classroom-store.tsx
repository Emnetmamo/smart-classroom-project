import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import studentBetty from "@/assets/student-betty.jpg";
import studentEmnet from "@/assets/student-emnet.jpg";
import teacherDagmawi from "@/assets/teacher-dagmawi.jpg";
import teacherAyalew from "@/assets/teacher-ayalew.jpg";
import teacherMulugeta from "@/assets/teacher-mulugeta.jpg";
import smartComputingSlides from "@/assets/smart-computing-slides.pdf.asset.json";
import computerNetworksSlides from "@/assets/computer-networks-slides.pdf.asset.json";

export type ScheduleMode = "demo" | "schedule";

export type Lateness = "on-time" | "warning" | "late";

export type Student = {
  id: string;
  name: string;
  email: string;
  rfid: string;
  avatar?: string;
  present: boolean;
  checkInMethod?: "face" | "rfid" | null;
  checkInTime?: string;
  lateness?: Lateness;
  attention?: number;
};

export type Teacher = {
  id: string;          // employee id
  username: string;    // login
  name: string;
  email: string;
  phone: string;
  department: string;
  avatar?: string;
};

export type Classroom = {
  id: string;
  name: string;
  capacity: number;
  building: string;
  floor: string;
  equipment: string[]; // tags
};

export type Course = {
  id: string;
  code: string;
  name: string;
  instructorId: string; // Teacher.id
  numStudents: number;
  durationMin: number;
  studentIds: string[]; // enrollment
};

export type SessionRow = {
  id: string;
  courseId: string;
  classroomId: string;
  instructorId: string;
  day: number; // 1=Mon … 6=Sat
  start: string;
  end: string;
  kind: "regular" | "makeup";
  material?: { title: string; type: "slides" | "doc" | "video"; preloaded: boolean; url?: string };
};

export type Recording = {
  id: string;
  sessionId: string;
  courseId: string;
  title: string;
  date: string;
  durationSec: number;
  url?: string; // object URL or download link when a real recording exists
};

export type Notification = {
  id: string;
  time: string;
  fromRole: "coordinator" | "instructor" | "student" | "system";
  fromName: string;
  toRole: "coordinator" | "instructor" | "student";
  toId?: string; // teacher.id or student.id; undefined = broadcast within role
  subject: string;
  body: string;
  read?: boolean;
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
  courseId: string | null;
  material?: SessionRow["material"];
};

type Ctx = {
  // entities
  students: Student[];
  teachers: Teacher[];
  classrooms: Classroom[];
  courses: Course[];
  sessions: SessionRow[];
  recordings: Recording[];
  notifications: Notification[];
  logs: LogEntry[];

  // live state
  teacherPresent: boolean;
  currentTeacher: string | null;
  sensors: Sensors;
  devices: Devices;
  schedule: CurrentSchedule;
  scheduleMode: ScheduleMode;
  setScheduleMode: (m: ScheduleMode) => void;

  // sim clock
  simNow: Date;
  setSimNow: (d: Date) => void;
  advanceSim: (minutes: number) => void;

  // setters
  setSensor: <K extends keyof Sensors>(k: K, v: Sensors[K]) => void;
  setDevice: <K extends keyof Devices>(k: K, v: Devices[K]) => void;

  // attendance
  checkIn: (id: string, method: "face" | "rfid") => void;
  multiFaceDetect: (ids: string[]) => void;
  checkInTeacher: (teacherId: string) => void;
  checkOutTeacher: () => void;
  checkOutAll: () => void;
  setAttention: (id: string, v: number) => void;

  // logging
  log: (module: string, message: string, level?: LogEntry["level"]) => void;
  setSchedule: (s: Partial<CurrentSchedule>) => void;

  // CRUD
  upsertStudent: (s: Student) => void;
  deleteStudent: (id: string) => void;
  upsertTeacher: (t: Teacher) => void;
  deleteTeacher: (id: string) => void;
  upsertClassroom: (c: Classroom) => void;
  deleteClassroom: (id: string) => void;
  upsertCourse: (c: Course) => void;
  deleteCourse: (id: string) => void;
  upsertSession: (s: SessionRow) => void;
  deleteSession: (id: string) => void;

  // notifications
  sendNotification: (n: Omit<Notification, "id" | "time">) => void;
  markNotificationRead: (id: string) => void;

  // recordings
  addRecording: (r: Omit<Recording, "id">) => void;

  // auth (in-memory demo)
  login: (role: "instructor" | "student", username: string, password: string) =>
    { ok: true; id: string } | { ok: false; error: string };
};

const ClassroomCtx = createContext<Ctx | null>(null);

const initialStudents: Student[] = [
  { id: "GSR/7517/18", name: "Abera Diro", email: "abera.diro@aau.edu.et", rfid: "RF-7517", present: false, attention: 78 },
  { id: "GSR/3930/18", name: "Amanuel Dereje", email: "amanuel.dereje@aau.edu.et", rfid: "RF-3930", present: false, attention: 72 },
  { id: "GSR/4801/18", name: "Ananya Fekeremariam", email: "ananya.f@aau.edu.et", rfid: "RF-4801", present: false, attention: 84 },
  { id: "GSR/6115/18", name: "Betelihem Solomon", email: "betelihem.s@aau.edu.et", rfid: "RF-6115", avatar: studentBetty, present: false, attention: 80 },
  { id: "GSR/2212/18", name: "Emnet Mamo", email: "emnet.mamo@aau.edu.et", rfid: "RF-2212", avatar: studentEmnet, present: false, attention: 88 },
  { id: "GSR/5243/18", name: "Erenso Hundessa", email: "erenso.h@aau.edu.et", rfid: "RF-5243", present: false, attention: 70 },
  { id: "GSR/7751/18", name: "Etsub Girma", email: "etsub.g@aau.edu.et", rfid: "RF-7751", present: false, attention: 75 },
  { id: "GSR/4720/18", name: "Kasanesh Ayalew", email: "kasanesh.a@aau.edu.et", rfid: "RF-4720", present: false, attention: 82 },
  { id: "GSR/1656/18", name: "Melat G/hiwot", email: "melat.g@aau.edu.et", rfid: "RF-1656", present: false, attention: 86 },
  { id: "GSR/6437/18", name: "Tarekegn Erena", email: "tarekegn.e@aau.edu.et", rfid: "RF-6437", present: false, attention: 74 },
];

const initialTeachers: Teacher[] = [
  { id: "T-AYB", username: "ayalew", name: "Dr. Ayalew B.", email: "ayalew.b@aau.edu.et", phone: "+251 911 000001", department: "Computer Science", avatar: teacherAyalew },
  { id: "T-DGM", username: "dagmawi", name: "Dr. Dagmawi L.", email: "dagmawi.l@aau.edu.et", phone: "+251 911 000002", department: "Computer Science", avatar: teacherDagmawi },
  { id: "T-MLG", username: "mulugeta", name: "Dr. Mulugeta L.", email: "mulugeta.l@aau.edu.et", phone: "+251 911 000003", department: "Computer Science" },
  { id: "T-DID", username: "dida", name: "Dr. Dida M.", email: "dida.m@aau.edu.et", phone: "+251 911 000004", department: "Computer Science" },
  { id: "T-YRG", username: "yaregal", name: "Dr. Yaregal A.", email: "yaregal.a@aau.edu.et", phone: "+251 911 000005", department: "Computer Science" },
];

const initialClassrooms: Classroom[] = [
  { id: "R-A319", name: "A319", capacity: 30, building: "Block A", floor: "3rd", equipment: ["Projector", "Smart Board", "AC", "Mics"] },
  { id: "R-A320", name: "A320", capacity: 25, building: "Block A", floor: "3rd", equipment: ["Projector", "Whiteboard"] },
  { id: "R-B210", name: "B210", capacity: 40, building: "Block B", floor: "2nd", equipment: ["Projector", "AC", "Smart Board"] },
];

const allStudentIds = initialStudents.map((s) => s.id);

const initialCourses: Course[] = [
  { id: "C-6104", code: "CoSc 6104", name: "Advanced Algorithms", instructorId: "T-AYB", numStudents: 10, durationMin: 60, studentIds: allStudentIds },
  { id: "C-6314", code: "CoSc 6314", name: "Distributed Systems", instructorId: "T-DGM", numStudents: 10, durationMin: 60, studentIds: allStudentIds },
  { id: "C-6252", code: "CoSc 6252", name: "AI & NLP", instructorId: "T-YRG", numStudents: 10, durationMin: 60, studentIds: allStudentIds },
  { id: "C-6316", code: "CoSc 6316", name: "Information Retrieval", instructorId: "T-AYB", numStudents: 10, durationMin: 60, studentIds: allStudentIds },
  { id: "C-6302", code: "CoSc 6302", name: "Machine Learning", instructorId: "T-MLG", numStudents: 10, durationMin: 60, studentIds: allStudentIds },
  { id: "C-6102", code: "CoSc 6102", name: "Algorithms", instructorId: "T-DID", numStudents: 10, durationMin: 60, studentIds: allStudentIds },
];

const initialSessions: SessionRow[] = [
  { id: "S1",  courseId: "C-6104", classroomId: "R-A319", instructorId: "T-AYB", day: 1, start: "08:30", end: "09:30", kind: "regular", material: { title: "CoSc 6104 · Algorithms W1", type: "slides", preloaded: true } },
  { id: "S2",  courseId: "C-6314", classroomId: "R-A319", instructorId: "T-DGM", day: 1, start: "10:30", end: "11:30", kind: "regular", material: { title: "CoSc 6314 · Distributed Systems Intro", type: "slides", preloaded: true } },
  { id: "S3",  courseId: "C-6252", classroomId: "R-A319", instructorId: "T-YRG", day: 1, start: "13:30", end: "14:30", kind: "regular" },
  { id: "S4",  courseId: "C-6316", classroomId: "R-A319", instructorId: "T-AYB", day: 2, start: "08:30", end: "09:30", kind: "regular" },
  { id: "S5",  courseId: "C-6302", classroomId: "R-A319", instructorId: "T-MLG", day: 2, start: "10:30", end: "11:30", kind: "regular", material: { title: "CoSc 6302 · ML Notes", type: "doc", preloaded: true } },
  { id: "S6",  courseId: "C-6104", classroomId: "R-A319", instructorId: "T-AYB", day: 3, start: "08:30", end: "09:30", kind: "regular" },
  { id: "S7",  courseId: "C-6102", classroomId: "R-A319", instructorId: "T-DID", day: 3, start: "10:30", end: "11:30", kind: "regular", material: { title: "CoSc 6102 · Algorithms Lecture", type: "slides", preloaded: true } },
  { id: "S8",  courseId: "C-6252", classroomId: "R-A319", instructorId: "T-YRG", day: 3, start: "13:30", end: "14:30", kind: "regular" },
  { id: "S9",  courseId: "C-6316", classroomId: "R-A319", instructorId: "T-AYB", day: 4, start: "08:30", end: "09:30", kind: "regular" },
  { id: "S10", courseId: "C-6302", classroomId: "R-A319", instructorId: "T-MLG", day: 4, start: "10:30", end: "11:30", kind: "regular" },
  { id: "S11", courseId: "C-6314", classroomId: "R-A319", instructorId: "T-DGM", day: 5, start: "08:30", end: "09:30", kind: "regular" },
  { id: "S12", courseId: "C-6102", classroomId: "R-A319", instructorId: "T-DID", day: 5, start: "10:30", end: "11:30", kind: "regular", material: { title: "CoSc 6102 · Algorithms Lecture", type: "slides", preloaded: true } },
];

// Anchor sim clock to a Monday 08:35 so demo defaults to an active session.
function buildInitialSimNow(): Date {
  const d = new Date();
  const day = d.getDay(); // 0=Sun
  // shift to Monday
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(8, 35, 0, 0);
  return d;
}

function toMinutes(hhmm: string) { const [h, m] = hhmm.split(":").map(Number); return h * 60 + m; }

function findActiveOrNext(sessions: SessionRow[], room: string, classrooms: Classroom[], now: Date) {
  const roomId = classrooms.find((c) => c.name === room)?.id ?? classrooms[0]?.id;
  const dow = now.getDay();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const today = sessions.filter((s) => s.day === dow && s.classroomId === roomId);
  const active = today.find((s) => toMinutes(s.start) <= nowMin && nowMin < toMinutes(s.end)) ?? null;
  const next = today.find((s) => toMinutes(s.start) > nowMin) ?? null;
  return { active, next };
}

function computeLateness(start: string, now: Date): Lateness {
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const diff = nowMin - toMinutes(start);
  if (diff >= 30) return "late";
  if (diff >= 10) return "warning";
  return "on-time";
}

export function ClassroomProvider({ children }: { children: ReactNode }) {
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [classrooms, setClassrooms] = useState<Classroom[]>(initialClassrooms);
  const [courses, setCourses] = useState<Course[]>(initialCourses);
  const [sessions, setSessions] = useState<SessionRow[]>(initialSessions);
  const [recordings, setRecordings] = useState<Recording[]>([
    { id: "REC1", sessionId: "S1", courseId: "C-6104", title: "Advanced Algorithms · Lecture 1", date: "2026-05-25", durationSec: 3120 },
    { id: "REC2", sessionId: "S2", courseId: "C-6314", title: "Distributed Systems · Intro", date: "2026-05-25", durationSec: 3000 },
    { id: "REC3", sessionId: "S5", courseId: "C-6302", title: "Machine Learning · Lecture 2", date: "2026-05-26", durationSec: 3300 },
  ]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simNow, setSimNow] = useState<Date>(buildInitialSimNow);
  const advanceSim = (m: number) => setSimNow((d) => new Date(d.getTime() + m * 60000));

  const [sensors, setSensors] = useState<Sensors>({
    ambientLight: 35, presence: false, temperature: 24, targetTemp: 22,
    co2: 480, pm25: 12, humidity: 45,
  });
  const [devices, setDevices] = useState<Devices>({
    lightsOn: false, acOn: false, heaterOn: false, fanOn: false,
    purifierOn: false, recording: false, sharing: false,
  });

  const [overrideSchedule, setOverrideSchedule] = useState<Partial<CurrentSchedule>>({});

  const schedule: CurrentSchedule = useMemo(() => {
    const { active, next } = findActiveOrNext(sessions, "A319", classrooms, simNow);
    const s = active ?? next;
    if (!s) {
      return { course: "No session scheduled", instructor: "—", start: "--:--", end: "--:--", room: "A319", active: false, sessionId: null, courseId: null, ...overrideSchedule };
    }
    const course = courses.find((c) => c.id === s.courseId);
    const teacher = teachers.find((t) => t.id === s.instructorId);
    const room = classrooms.find((c) => c.id === s.classroomId);
    const base: CurrentSchedule = {
      course: course?.code ? `${course.code} · ${course.name}` : course?.name ?? "Session",
      instructor: teacher?.name ?? "—",
      start: s.start,
      end: s.end,
      room: room?.name ?? "A319",
      active: !!active,
      sessionId: s.id,
      courseId: s.courseId,
      material: s.material,
    };
    return { ...base, ...overrideSchedule };
  }, [sessions, courses, teachers, classrooms, simNow, overrideSchedule]);

  const log: Ctx["log"] = (module, message, level = "info") => {
    setLogs((prev) => [{ id: crypto.randomUUID(), time: new Date().toLocaleTimeString(), module, message, level }, ...prev].slice(0, 300));
  };

  const setSensor: Ctx["setSensor"] = (k, v) => setSensors((s) => ({ ...s, [k]: v }));
  const setDevice: Ctx["setDevice"] = (k, v) => setDevices((d) => ({ ...d, [k]: v }));

  const checkIn: Ctx["checkIn"] = (id, method) => {
    setStudents((prev) => {
      const s = prev.find((x) => x.id === id);
      if (!s) return prev;
      if (s.present) {
        log("Attendance", `Already marked: ${s.name} (via ${s.checkInMethod?.toUpperCase()})`, "warn");
        return prev;
      }
      const lateness = schedule.active ? computeLateness(schedule.start, simNow) : "on-time";
      const tag = lateness === "late" ? "LATE" : lateness === "warning" ? "WARNING (10min late)" : "ON TIME";
      log("Attendance", `${s.name} checked in via ${method.toUpperCase()} — ${tag}`,
        lateness === "late" ? "error" : lateness === "warning" ? "warn" : "success");
      return prev.map((x) => x.id === id ? { ...x, present: true, checkInMethod: method, checkInTime: simNow.toLocaleTimeString(), lateness } : x);
    });
  };

  const multiFaceDetect: Ctx["multiFaceDetect"] = (ids) => {
    ids.forEach((id) => checkIn(id, "face"));
  };

  const checkInTeacher: Ctx["checkInTeacher"] = (teacherId) => {
    const t = teachers.find((x) => x.id === teacherId);
    if (!t) return;
    setTeacherPresent(true);
    setCurrentTeacher(t.name);
    setCurrentTeacherId(t.id);
    log("Face Recognition", `Teacher verified: ${t.name}`, "success");
    const matches = schedule.sessionId && schedule.instructor === t.name && schedule.active;
    if (matches) {
      setDevices((d) => ({ ...d, sharing: true, recording: true }));
      log("Smart Screen", schedule.material?.preloaded
        ? `Auto-loaded preloaded material: ${schedule.material.title}`
        : `Auto-share waiting for instructor's screen — recording armed`, "success");
      log("Recording", `Lecture recording auto-started for ${schedule.course}`, "success");
    } else {
      log("Schedule", `No active session matches ${t.name} right now — manual share available`, "info");
    }
  };

  const checkOutTeacher: Ctx["checkOutTeacher"] = () => {
    if (!teacherPresent) return;
    // Save a recording stub if we were recording
    if (devices.recording && schedule.sessionId && schedule.courseId) {
      const dur = 60 + Math.floor(Math.random() * 600);
      setRecordings((prev) => [
        { id: crypto.randomUUID(), sessionId: schedule.sessionId!, courseId: schedule.courseId!, title: `${schedule.course} · ${simNow.toLocaleDateString()}`, date: simNow.toISOString().slice(0, 10), durationSec: dur },
        ...prev,
      ]);
    }
    log("Face Recognition", `Teacher ${currentTeacher} left — auto-stopping share & recording`, "info");
    setTeacherPresent(false);
    setCurrentTeacher(null);
    setCurrentTeacherId(null);
    setDevices((d) => ({ ...d, sharing: false, recording: false }));
  };

  const checkOutAll = () => {
    setStudents((prev) => prev.map((s) => ({ ...s, present: false, checkInMethod: null, checkInTime: undefined, lateness: undefined })));
    log("Attendance", "Session ended — all students checked out", "info");
  };

  const setAttention = (id: string, v: number) => setStudents((prev) => prev.map((s) => s.id === id ? { ...s, attention: v } : s));

  const setSchedule: Ctx["setSchedule"] = (s) => setOverrideSchedule((cur) => ({ ...cur, ...s }));

  const presentCount = students.filter((s) => s.present).length;
  const occupied = teacherPresent || presentCount > 0;
  useEffect(() => { setSensors((s) => s.presence === occupied ? s : { ...s, presence: occupied }); }, [occupied]);

  // Light
  useEffect(() => {
    const should = sensors.presence && sensors.ambientLight < 40;
    setDevices((d) => {
      if (d.lightsOn === should) return d;
      log("Light Control", `Lights ${should ? "ON" : "OFF"} (presence=${sensors.presence}, ambient=${sensors.ambientLight}%)`, "info");
      return { ...d, lightsOn: should };
    });
  }, [sensors.presence, sensors.ambientLight]);

  // Temp
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

  // Air
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

  // Drift
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
      setStudents((prev) => prev.map((s) => s.present ? { ...s, attention: Math.max(10, Math.min(100, (s.attention ?? 70) + (Math.random() - 0.55) * 4)) } : s));
    }, 2000);
    return () => clearInterval(t);
  }, [students, teacherPresent]);

  // CRUD
  const upsertStudent = (s: Student) => setStudents((prev) => prev.some((x) => x.id === s.id) ? prev.map((x) => x.id === s.id ? s : x) : [...prev, s].sort((a, b) => a.name.localeCompare(b.name)));
  const deleteStudent = (id: string) => setStudents((prev) => prev.filter((x) => x.id !== id));
  const upsertTeacher = (t: Teacher) => setTeachers((prev) => prev.some((x) => x.id === t.id) ? prev.map((x) => x.id === t.id ? t : x) : [...prev, t]);
  const deleteTeacher = (id: string) => setTeachers((prev) => prev.filter((x) => x.id !== id));
  const upsertClassroom = (c: Classroom) => setClassrooms((prev) => prev.some((x) => x.id === c.id) ? prev.map((x) => x.id === c.id ? c : x) : [...prev, c]);
  const deleteClassroom = (id: string) => setClassrooms((prev) => prev.filter((x) => x.id !== id));
  const upsertCourse = (c: Course) => setCourses((prev) => prev.some((x) => x.id === c.id) ? prev.map((x) => x.id === c.id ? c : x) : [...prev, c]);
  const deleteCourse = (id: string) => setCourses((prev) => prev.filter((x) => x.id !== id));
  const upsertSession = (s: SessionRow) => setSessions((prev) => prev.some((x) => x.id === s.id) ? prev.map((x) => x.id === s.id ? s : x) : [...prev, s]);
  const deleteSession = (id: string) => setSessions((prev) => prev.filter((x) => x.id !== id));

  const sendNotification: Ctx["sendNotification"] = (n) =>
    setNotifications((prev) => [{ id: crypto.randomUUID(), time: new Date().toLocaleString(), ...n }, ...prev]);

  const markNotificationRead = (id: string) => setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));

  const addRecording: Ctx["addRecording"] = (r) => setRecordings((prev) => [{ id: crypto.randomUUID(), ...r }, ...prev]);

  // Auth
  const login: Ctx["login"] = (role, username, password) => {
    const u = username.trim().toLowerCase();
    if (role === "instructor") {
      const t = teachers.find((x) => x.username.toLowerCase() === u);
      if (!t) return { ok: false, error: "Unknown instructor username" };
      if (password !== "Teacher@1234") return { ok: false, error: "Invalid password" };
      return { ok: true, id: t.id };
    }
    const s = students.find((x) => x.name.split(" ")[0].toLowerCase() === u);
    if (!s) return { ok: false, error: "Unknown student username (use first name lowercase)" };
    const expected = `${s.name.split(" ")[0]}@1234`;
    if (password !== expected) return { ok: false, error: `Invalid password (hint: ${s.name.split(" ")[0]}@1234)` };
    return { ok: true, id: s.id };
  };

  return (
    <ClassroomCtx.Provider value={{
      students, teachers, classrooms, courses, sessions, recordings, notifications, logs,
      teacherPresent, currentTeacher, sensors, devices, schedule,
      simNow, setSimNow, advanceSim,
      setSensor, setDevice,
      checkIn, multiFaceDetect, checkInTeacher, checkOutTeacher, checkOutAll, setAttention,
      log, setSchedule,
      upsertStudent, deleteStudent, upsertTeacher, deleteTeacher,
      upsertClassroom, deleteClassroom, upsertCourse, deleteCourse,
      upsertSession, deleteSession,
      sendNotification, markNotificationRead, addRecording, login,
    }}>
      {children}
    </ClassroomCtx.Provider>
  );
}

export function useClassroom() {
  const c = useContext(ClassroomCtx);
  if (!c) throw new Error("useClassroom must be used within ClassroomProvider");
  return c;
}

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
