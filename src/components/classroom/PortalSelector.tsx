import { Activity, ShieldCheck, GraduationCap, BookOpen } from "lucide-react";

export type Portal = "system" | "instructor" | "student";

export function PortalSelector({ onPick }: { onPick: (p: Portal) => void }) {
  const cards: { id: Portal; title: string; desc: string; icon: typeof Activity; tone: string }[] = [
    { id: "system", title: "System Portal", desc: "Attendance, environment, screen sharing, recording, attention monitoring and the Coordinator/Admin workspace.", icon: ShieldCheck, tone: "from-primary/30 to-accent/20" },
    { id: "instructor", title: "Instructor Portal", desc: "Login required. View your classes, teaching hours, reschedule sessions, and message your students.", icon: GraduationCap, tone: "from-emerald-500/30 to-primary/20" },
    { id: "student", title: "Student Portal", desc: "Login required. See your schedule, slides, and recorded lectures organised by course.", icon: BookOpen, tone: "from-amber-500/30 to-pink-500/20" },
  ];

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 -z-10 opacity-30">
        <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-primary/30 blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 rounded-full bg-accent/30 blur-3xl" />
      </div>
      <div className="w-full max-w-5xl">
        <div className="flex items-center gap-3 justify-center mb-3">
          <div className="w-10 h-10 rounded-lg bg-primary/20 grid place-items-center glow-primary">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div className="text-center">
            <div className="text-2xl font-semibold gradient-text">Smart Classroom</div>
            <div className="text-xs text-muted-foreground">AAU CS · Room A319 · Integrated Control Suite</div>
          </div>
        </div>
        <p className="text-center text-sm text-muted-foreground mb-10">Choose a portal to continue.</p>

        <div className="grid md:grid-cols-3 gap-5">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <button key={c.id} onClick={() => onPick(c.id)}
                className={`text-left group relative rounded-2xl p-6 bg-card/60 border border-border hover:border-primary/50 backdrop-blur transition-all hover:-translate-y-1`}>
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition bg-gradient-to-br ${c.tone} -z-10`} />
                <Icon className="w-9 h-9 text-primary mb-4" />
                <div className="text-lg font-semibold">{c.title}</div>
                <div className="text-sm text-muted-foreground mt-2 leading-relaxed">{c.desc}</div>
                <div className="text-xs text-primary mt-5 inline-flex items-center gap-1">
                  Enter →
                </div>
              </button>
            );
          })}
        </div>
        <div className="mt-10 text-center text-xs text-muted-foreground">
          Demo credentials · Instructors: <code>ayalew / Teacher@1234</code> · Students: <code>abera / Abera@1234</code>
        </div>
      </div>
    </div>
  );
}
