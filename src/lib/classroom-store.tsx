import { createContext, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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

export type TeacherAttendance = {
  id: string;
  teacherId: string;
  teacherName: string;
  courseId: string | null;
  courseName: string;
  sessionId: string | null;
  date: string;          // YYYY-MM-DD
  checkInTime: string;   // HH:MM:SS
  checkOutTime?: string;
  lateness: Lateness;
  scheduleMode: ScheduleMode;
};

export type StudentAttendanceRecord = {
  id: string;
  studentId: string;
  studentName: string;
  courseId: string | null;
  courseName: string;
  sessionId: string | null;
  date: string;
  checkInTime?: string;
  present: boolean;
  lateness?: Lateness;
  method?: "face" | "rfid";
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
  teacherAttendance: TeacherAttendance[];
  studentAttendance: StudentAttendanceRecord[];

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
  { id: "T-MLG", username: "mulugeta", name: "Dr. Mulugeta L.", email: "mulugeta.l@aau.edu.et", phone: "+251 911 000003", department: "Computer Science", avatar: teacherMulugeta },
  { id: "T-SLM", username: "solomon", name: "Dr. Solomon T.", email: "solomon.t@aau.edu.et", phone: "+251 911 000004", department: "Computer Science" },
];

const initialClassrooms: Classroom[] = [
  { id: "R-A304", name: "A304", capacity: 30, building: "New Science Building", floor: "CS Floor", equipment: ["Projector", "Smart Board", "AC", "Mics"] },
  { id: "R-322",  name: "322",  capacity: 30, building: "New Science Building", floor: "CS Floor", equipment: ["Projector", "Smart Board"] },
];

const allStudentIds = initialStudents.map((s) => s.id);

// Preloaded lecture decks shared by the verified instructor.
const SMART_COMPUTING_MATERIAL = { title: "Smart Computing — Design 2026", type: "slides", preloaded: true, url: smartComputingSlides.url } as const;
const NETWORKS_MATERIAL = { title: "Advanced Computer Networks — Overview", type: "slides", preloaded: true, url: computerNetworksSlides.url } as const;

const initialCourses: Course[] = [
  { id: "C-SC",  code: "CoSc 6316", name: "Smart Computing",            instructorId: "T-DGM", numStudents: 10, durationMin: 120, studentIds: allStudentIds },
  { id: "C-ES",  code: "CoSc 6201", name: "Embedded Systems",           instructorId: "T-AYB", numStudents: 10, durationMin: 120, studentIds: allStudentIds },
  { id: "C-ACN", code: "CoSc 6302", name: "Advanced Computer Networks", instructorId: "T-MLG", numStudents: 10, durationMin: 90,  studentIds: allStudentIds },
  { id: "C-CS",  code: "CoSc 6401", name: "Cyber Security",             instructorId: "T-SLM", numStudents: 10, durationMin: 90,  studentIds: allStudentIds },
];

// Weekly schedule for room A304 — 1=Mon … 5=Fri.
const initialSessions: SessionRow[] = [
  // Monday
  { id: "S-MON-DGM", courseId: "C-SC",  classroomId: "R-A304", instructorId: "T-DGM", day: 1, start: "10:00", end: "12:00", kind: "regular", material: { ...SMART_COMPUTING_MATERIAL } },
  // Tuesday
  { id: "S-TUE-AYB", courseId: "C-ES",  classroomId: "R-A304", instructorId: "T-AYB", day: 2, start: "08:30", end: "10:30", kind: "regular" },
  { id: "S-TUE-MLG", courseId: "C-ACN", classroomId: "R-A304", instructorId: "T-MLG", day: 2, start: "10:30", end: "12:00", kind: "regular", material: { ...NETWORKS_MATERIAL } },
  { id: "S-TUE-SLM", courseId: "C-CS",  classroomId: "R-A304", instructorId: "T-SLM", day: 2, start: "13:30", end: "17:00", kind: "regular" },
  // Wednesday
  { id: "S-WED-SLM", courseId: "C-CS",  classroomId: "R-A304", instructorId: "T-SLM", day: 3, start: "10:30", end: "12:00", kind: "regular" },
  // Thursday
  { id: "S-THU-AYB", courseId: "C-ES",  classroomId: "R-A304", instructorId: "T-AYB", day: 4, start: "08:30", end: "10:30", kind: "regular" },
  { id: "S-THU-MLG", courseId: "C-ACN", classroomId: "R-A304", instructorId: "T-MLG", day: 4, start: "10:30", end: "12:00", kind: "regular", material: { ...NETWORKS_MATERIAL } },
  // Friday
  { id: "S-FRI-DGM", courseId: "C-SC",  classroomId: "R-A304", instructorId: "T-DGM", day: 5, start: "08:30", end: "10:30", kind: "regular", material: { ...SMART_COMPUTING_MATERIAL } },
];

// Sim clock now follows the real wall clock by default — lateness simulator
// can still override it. An effect below re-syncs it every 30 seconds.
function buildInitialSimNow(): Date { return new Date(); }


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
  const [recordings, setRecordings] = useState<Recording[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [teacherPresent, setTeacherPresent] = useState(false);
  const [currentTeacher, setCurrentTeacher] = useState<string | null>(null);
  const [currentTeacherId, setCurrentTeacherId] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [simNow, setSimNow] = useState<Date>(buildInitialSimNow);
  const [scheduleMode, setScheduleMode] = useState<ScheduleMode>("schedule");
  const [simOverride, setSimOverride] = useState(false); // becomes true when lateness simulator overrides the wall clock
  const advanceSim = (m: number) => { setSimOverride(true); setSimNow((d) => new Date(d.getTime() + m * 60000)); };

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
    // DEMO mode: idle until a teacher is verified; then the verified teacher's
    // course takes the floor (with their preloaded material if available).
    if (scheduleMode === "demo") {
      if (!currentTeacherId) {
        return { course: "Idle — waiting for instructor", instructor: "—", start: "--:--", end: "--:--", room: "A304", active: false, sessionId: null, courseId: null, ...overrideSchedule };
      }
      const course = courses.find((c) => c.instructorId === currentTeacherId);
      const sess = sessions.find((s) => s.instructorId === currentTeacherId && s.material) ?? sessions.find((s) => s.instructorId === currentTeacherId);
      const teacher = teachers.find((t) => t.id === currentTeacherId);
      const base: CurrentSchedule = {
        course: course?.code ? `${course.code} · ${course.name}` : course?.name ?? "Session",
        instructor: teacher?.name ?? "—",
        start: sess?.start ?? simNow.toTimeString().slice(0, 5),
        end: sess?.end ?? "--:--",
        room: "A304",
        active: true,
        sessionId: sess?.id ?? null,
        courseId: course?.id ?? null,
        material: sess?.material,
      };
      return { ...base, ...overrideSchedule };
    }

    // SCHEDULE mode: driven by the (simulated) clock.
    const { active, next } = findActiveOrNext(sessions, "A304", classrooms, simNow);
    const s = active ?? next;
    if (!s) {
      return { course: "No session scheduled", instructor: "—", start: "--:--", end: "--:--", room: "A304", active: false, sessionId: null, courseId: null, ...overrideSchedule };
    }
    const course = courses.find((c) => c.id === s.courseId);
    const teacher = teachers.find((t) => t.id === s.instructorId);
    const room = classrooms.find((c) => c.id === s.classroomId);
    const base: CurrentSchedule = {
      course: course?.code ? `${course.code} · ${course.name}` : course?.name ?? "Session",
      instructor: teacher?.name ?? "—",
      start: s.start,
      end: s.end,
      room: room?.name ?? "A304",
      active: !!active,
      sessionId: s.id,
      courseId: s.courseId,
      material: s.material,
    };
    return { ...base, ...overrideSchedule };
  }, [scheduleMode, currentTeacherId, sessions, courses, teachers, classrooms, simNow, overrideSchedule]);

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

    // SCHEDULE mode guard: only the instructor scheduled for the active slot
    // may take the floor. Anyone else gets notified that the slot is taken.
    if (scheduleMode === "schedule") {
      const { active } = findActiveOrNext(sessions, "A304", classrooms, simNow);
      if (active && active.instructorId !== teacherId) {
        const scheduledTeacher = teachers.find((x) => x.id === active.instructorId);
        const c = courses.find((x) => x.id === active.courseId);
        log("Schedule", `${t.name} recognized, but ${scheduledTeacher?.name ?? "another instructor"} is scheduled to teach ${c?.code ?? "this slot"} now`, "warn");
        setNotifications((prev) => [{
          id: crypto.randomUUID(), time: new Date().toLocaleString(), fromRole: "system", fromName: "Smart Classroom",
          toRole: "instructor", toId: teacherId,
          subject: "Slot already scheduled",
          body: `You were recognized in A304, but ${scheduledTeacher?.name ?? "another instructor"} is scheduled to teach ${c?.code ?? ""} ${c?.name ?? ""} during this time. Sharing & recording were not started.`,
        }, ...prev]);
        // Still record presence (face was seen) so lights/attendance respond, but do not start the session.
        setTeacherPresent(true);
        setCurrentTeacher(t.name);
        setCurrentTeacherId(t.id);
        return;
      }
      if (!active) {
        log("Schedule", `${t.name} recognized, but no session is scheduled right now`, "info");
      }
    }

    setTeacherPresent(true);
    setCurrentTeacher(t.name);
    setCurrentTeacherId(t.id);
    log("Face Recognition", `Teacher verified: ${t.name}`, "success");

    // Decide whether to auto-start the lecture.
    let startSession = true;
    if (scheduleMode === "schedule") {
      const { active } = findActiveOrNext(sessions, "A304", classrooms, simNow);
      startSession = !!active && active.instructorId === teacherId;
    }

    if (startSession) {
      const course = courses.find((c) => c.instructorId === teacherId);
      const sess = sessions.find((s) => s.instructorId === teacherId && s.material) ?? sessions.find((s) => s.instructorId === teacherId);
      setDevices((d) => ({ ...d, sharing: true, recording: true }));
      log("Smart Screen", sess?.material?.preloaded
        ? `Auto-loaded preloaded material: ${sess.material.title}`
        : `No preloaded material — share your screen to begin (recording armed)`, "success");
      log("Recording", `Lecture recording (screen + audio) auto-started for ${course?.name ?? "session"}`, "success");
    } else {
      log("Schedule", `Recognized ${t.name} — manual share available`, "info");
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
    log("Face Recognition", `Teacher ${currentTeacher} left — finalising attendance & stopping share/recording`, "info");
    setTeacherPresent(false);
    setCurrentTeacher(null);
    setCurrentTeacherId(null);
    setDevices((d) => ({ ...d, sharing: false, recording: false }));
    // Finalise the roll: anyone not present at sign-out stays absent for this session.
    setStudents((prev) => {
      const presentNow = prev.filter((s) => s.present);
      log("Attendance", `Session attendance recorded — ${presentNow.length} present / ${prev.length - presentNow.length} absent`, "success");
      return prev.map((s) => ({ ...s, present: false, checkInMethod: null, checkInTime: undefined, lateness: undefined }));
    });
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

  // Keep sim clock in sync with the real wall clock unless the lateness simulator has explicitly overridden it.
  useEffect(() => {
    if (simOverride) return;
    const t = setInterval(() => setSimNow(new Date()), 30000);
    return () => clearInterval(t);
  }, [simOverride]);

  // Auto-end a session when its end time passes (schedule mode, real-time driven).
  const endedSessionRef = useRef<string | null>(null);
  useEffect(() => {
    if (scheduleMode !== "schedule" || !teacherPresent || !schedule.active || !schedule.sessionId) return;
    const [eh, em] = schedule.end.split(":").map(Number);
    const nowMin = simNow.getHours() * 60 + simNow.getMinutes();
    if (nowMin >= eh * 60 + em && endedSessionRef.current !== schedule.sessionId) {
      endedSessionRef.current = schedule.sessionId;
      log("Schedule", `Course ${schedule.course} reached its end time — finalising attendance`, "info");
      checkOutTeacher();
    }
  }, [simNow, schedule.sessionId, schedule.end, schedule.active, scheduleMode, teacherPresent]);

  // Notify the active instructor whenever a student's attention drops below 50%
  // (especially important while the lecture is being recorded so they can react).
  const lowAttnRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!teacherPresent || !currentTeacherId) return;
    const low = students.filter((s) => s.present && (s.attention ?? 100) < 50);
    const recording = devices.recording;
    low.forEach((s) => {
      if (lowAttnRef.current.has(s.id)) return;
      lowAttnRef.current.add(s.id);
      const subject = recording ? "Low attention during recording" : "Low attention alert";
      setNotifications((prev) => [{
        id: crypto.randomUUID(), time: new Date().toLocaleString(), fromRole: "system", fromName: "Attention Monitor",
        toRole: "instructor", toId: currentTeacherId,
        subject,
        body: `${s.name} has dropped to ${Math.round(s.attention ?? 0)}% attention${recording ? " — the lecture is currently being recorded, consider a quick re-engagement." : "."}`,
      }, ...prev]);
      log("Attention", `Alert sent to ${currentTeacher}: ${s.name} attention ${Math.round(s.attention ?? 0)}%`, "warn");
    });
    // Reset the dedup set when the student recovers, so a new dip re-alerts.
    students.forEach((s) => {
      if ((s.attention ?? 100) >= 65) lowAttnRef.current.delete(s.id);
    });
  }, [students, teacherPresent, currentTeacherId, currentTeacher, devices.recording]);


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
      teacherPresent, currentTeacher, sensors, devices, schedule, scheduleMode, setScheduleMode,
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
