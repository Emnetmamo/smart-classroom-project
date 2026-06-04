import { useState } from "react";
import { LogIn, ArrowLeft } from "lucide-react";
import { useClassroom } from "@/lib/classroom-store";

type Role = "instructor" | "student" | "coordinator" | "admin";

const HINTS: Record<Role, { user: string; pass: string; help: string }> = {
  instructor: { user: "ayalew", pass: "Teacher@1234", help: "Try ayalew, dagmawi, mulugeta, solomon — password Teacher@1234" },
  student: { user: "abera", pass: "Abera@1234", help: "First name (lowercase) — password <Firstname>@1234, e.g. Abera@1234" },
  coordinator: { user: "coordinator", pass: "Coord@1234", help: "Class Coordinator · coordinator / Coord@1234" },
  admin: { user: "admin", pass: "Admin@1234", help: "General Admin · admin / Admin@1234" },
};

export function Login({ role, onSuccess, onBack }: {
  role: Role;
  onSuccess: (id: string) => void;
  onBack: () => void;
}) {
  const { login } = useClassroom();
  const hint = HINTS[role];
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(role, username, password);
    if (res.ok) onSuccess(res.id);
    else setErr(res.error);
  };

  return (
    <div className="min-h-screen grid place-items-center p-6 bg-background">
      <div className="w-full max-w-md">
        <button onClick={onBack} className="text-xs text-muted-foreground hover:text-foreground mb-4 inline-flex items-center gap-1">
          <ArrowLeft className="w-3.5 h-3.5" /> Back to portals
        </button>
        <form onSubmit={submit} className="bg-card/70 backdrop-blur border border-border rounded-2xl p-8 space-y-5">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted-foreground">{role} portal</div>
            <h1 className="text-2xl font-semibold mt-1">Sign in</h1>
          </div>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Username</div>
            <input value={username} onChange={(e) => setUsername(e.target.value)} autoFocus
              placeholder={hint.user}
              className="w-full px-3 py-2 rounded-md bg-input border border-border outline-none focus:border-primary text-sm" />
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Password</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={hint.pass}
              className="w-full px-3 py-2 rounded-md bg-input border border-border outline-none focus:border-primary text-sm" />
          </label>
          {err && <div className="text-xs text-destructive-foreground bg-destructive/20 border border-destructive/40 px-3 py-2 rounded">{err}</div>}
          <button type="submit" className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
