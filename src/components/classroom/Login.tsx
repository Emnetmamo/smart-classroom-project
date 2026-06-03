import { useState } from "react";
import { LogIn, ArrowLeft } from "lucide-react";
import { useClassroom } from "@/lib/classroom-store";

export function Login({ role, onSuccess, onBack }: {
  role: "instructor" | "student";
  onSuccess: (id: string) => void;
  onBack: () => void;
}) {
  const { login } = useClassroom();
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
              placeholder={role === "instructor" ? "ayalew" : "abera"}
              className="w-full px-3 py-2 rounded-md bg-input border border-border outline-none focus:border-primary text-sm" />
          </label>
          <label className="block">
            <div className="text-xs text-muted-foreground mb-1">Password</div>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)}
              placeholder={role === "instructor" ? "Teacher@1234" : "Abera@1234"}
              className="w-full px-3 py-2 rounded-md bg-input border border-border outline-none focus:border-primary text-sm" />
          </label>
          {err && <div className="text-xs text-destructive-foreground bg-destructive/20 border border-destructive/40 px-3 py-2 rounded">{err}</div>}
          <button type="submit" className="w-full px-4 py-2.5 rounded-md bg-primary text-primary-foreground inline-flex items-center justify-center gap-2">
            <LogIn className="w-4 h-4" /> Sign in
          </button>
          <div className="text-xs text-muted-foreground leading-relaxed border-t border-border pt-4">
            {role === "instructor"
              ? <>Try <code>ayalew</code>, <code>dagmawi</code>, <code>mulugeta</code>, <code>solomon</code> · password <code>Teacher@1234</code></>
              : <>Use your first name (lowercase) as username · password is <code>&lt;Firstname&gt;@1234</code> e.g. <code>Abera@1234</code></>}
          </div>
        </form>
      </div>
    </div>
  );
}
