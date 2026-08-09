import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Building2,
  LogOut,
  LayoutDashboard,
  Users,
  Wrench,
  MessageSquareWarning,
  ShieldCheck,
  Bell,
  CalendarDays,
  ClipboardList,
  BarChart3,
  User as UserIcon,
  LogIn,
  LogOut as LogOutIcon,
  History,
  Menu,
  X,
  Home,
  HardHat,
  Car,
} from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { NotificationBell } from "@/components/NotificationBell";
import { cn } from "@/lib/utils";

type Role = "Admin" | "Resident" | "Security" | "SuperAdmin";

const NAV: Record<Role, { to: string; label: string; Icon: any }[]> = {
  SuperAdmin: [
    { to: "/super-admin", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/super-admin/users", label: "Users", Icon: Users },
    { to: "/super-admin/roles", label: "Roles", Icon: ShieldCheck },
    { to: "/super-admin/settings", label: "Settings", Icon: BarChart3 },
    { to: "/admin", label: "Admin Panel", Icon: Home },
  ],
  Admin: [
    { to: "/admin", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/admin/residents", label: "Residents", Icon: Users },
    { to: "/admin/maintenance", label: "Maintenance", Icon: Wrench },
    { to: "/admin/complaints", label: "Complaints", Icon: MessageSquareWarning },
    { to: "/admin/visitors", label: "Visitors", Icon: ShieldCheck },
    { to: "/admin/notices", label: "Notices", Icon: Bell },
    { to: "/admin/facilities", label: "Facilities", Icon: Home },
    { to: "/admin/events", label: "Events", Icon: CalendarDays },
    { to: "/admin/staff", label: "Staff", Icon: HardHat },
    { to: "/admin/parking", label: "Parking", Icon: Car },
    { to: "/admin/reports", label: "Reports", Icon: BarChart3 },
  ],
  Resident: [
    { to: "/resident", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/resident/maintenance", label: "Maintenance", Icon: Wrench },
    { to: "/resident/complaints", label: "Complaints", Icon: MessageSquareWarning },
    { to: "/resident/visitors", label: "Visitors", Icon: ShieldCheck },
    { to: "/resident/facilities", label: "Book facilities", Icon: Home },
    { to: "/resident/notices", label: "Notices", Icon: Bell },
    { to: "/resident/events", label: "Events", Icon: CalendarDays },
    { to: "/resident/profile", label: "Profile", Icon: UserIcon },
  ],
  Security: [
    { to: "/security", label: "Dashboard", Icon: LayoutDashboard },
    { to: "/security/entry", label: "Visitor entry", Icon: LogIn },
    { to: "/security/exit", label: "Visitor exit", Icon: LogOutIcon },
    { to: "/security/history", label: "History", Icon: History },
  ],
};

export function AppShell({ role, children }: { role: Role; children: ReactNode }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const items = NAV[role];

  const Sidebar = (
    <aside className="flex h-full w-64 flex-col border-r bg-card">
      <Link to="/" className="flex items-center gap-2 px-6 py-5 border-b">
        <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary">
          <Building2 className="h-5 w-5 text-primary" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tracking-tight">SocietyOS</div>
          <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
            {role}
          </div>
        </div>
      </Link>
      <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
        {items.map(({ to, label, Icon }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              onClick={() => setOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-primary text-primary-foreground"
                  : "text-foreground/80 hover:bg-accent hover:text-accent-foreground",
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3">
        <div className="mb-2 px-2 text-xs">
          <div className="font-semibold truncate">
            {user?.user_metadata?.full_name || user?.email}
          </div>
          <div className="text-muted-foreground truncate">{user?.email}</div>
        </div>
        <Button
          size="sm"
          variant="outline"
          className="w-full rounded-full"
          onClick={async () => {
            await signOut();
            navigate({ to: "/auth", replace: true });
          }}
        >
          <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
        </Button>
      </div>
    </aside>
  );

  return (
    <div className="flex min-h-screen bg-background">
      <div className="hidden md:block">{Sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0">{Sidebar}</div>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-4 py-3 md:px-8">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="ghost" className="md:hidden" onClick={() => setOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>
            <div className="text-sm font-semibold">{role} portal</div>
          </div>
          <NotificationBell />
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 md:px-8 md:py-8">
          {children}
        </main>
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  Icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  Icon?: any;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </div>
      <div className="mt-2 text-3xl font-bold tracking-tight">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({
  title,
  children,
  action,
}: {
  title: ReactNode;
  children: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-3xl border bg-card p-6 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-semibold">{title}</h3>
        {action}
      </div>
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight md:text-3xl">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  );
}
