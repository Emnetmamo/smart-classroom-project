import { useState } from "react";
import { LogOut, Activity, ShieldCheck, Building } from "lucide-react";
import { CoordinatorWorkspace } from "./modules/CoordinatorWorkspace";
import { GeneralAdmin } from "./modules/GeneralAdmin";
import { useClassroom } from "@/lib/classroom-store";

export function AdminPortal({ adminId, onLogout }: { adminId: string; onLogout: () => void }) {
  const { adminUsers } = useClassroom();
  const me = adminUsers.find((u) => u.id === adminId);
  // If logged in as coordinator, only show coordinator workspace; admin sees both.
  const isAdmin = me?.role === "admin";
  const [tab, setTab] = useState<"coord" | "general">(isAdmin ? "general" : "coord");

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-30 bg-card/70 backdrop-blur-xl border-b border-border px-6 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-primary/20 grid place-items-center"><Activity className="w-4 h-4 text-primary" /></div>
        <div className="flex-1">
          <div className="text-sm font-medium">{isAdmin ? "Admin Portal" : "Coordinator Portal"}</div>
          <div className="text-xs text-muted-foreground">{me?.name} · {me?.role}</div>
        </div>
        {isAdmin && (
          <div className="hidden sm:flex gap-1">
            <button onClick={() => setTab("general")} className={`text-xs px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${tab==="general"?"bg-primary text-primary-foreground border-primary":"bg-secondary/40 border-border"}`}><Building className="w-3.5 h-3.5" /> General Admin</button>
            <button onClick={() => setTab("coord")} className={`text-xs px-3 py-1.5 rounded-md border inline-flex items-center gap-1.5 ${tab==="coord"?"bg-primary text-primary-foreground border-primary":"bg-secondary/40 border-border"}`}><ShieldCheck className="w-3.5 h-3.5" /> Class Coordinator</button>
          </div>
        )}
        <button onClick={onLogout} className="text-xs px-2.5 py-1.5 rounded-md border border-border inline-flex items-center gap-1.5"><LogOut className="w-3.5 h-3.5" /> Logout</button>
      </header>
      <div className="p-6 max-w-7xl mx-auto">
        {isAdmin && tab === "general" ? <GeneralAdmin /> : <CoordinatorWorkspace />}
      </div>
    </div>
  );
}
