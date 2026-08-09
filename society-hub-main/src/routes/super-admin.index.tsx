import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Shield,
  ShieldCheck,
  UserCog,
  LayoutDashboard,
  Settings,
  ArrowRight,
} from "lucide-react";
import { Panel, PageHeader, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/super-admin/")({
  head: () => ({
    meta: [
      { title: "Super Admin — SocietyOS" },
      { name: "description", content: "Super admin dashboard with full system control." },
    ],
  }),
  component: SuperAdminPage,
});

function useSuperAdminStats() {
  return useQuery({
    queryKey: ["super-admin-stats"],
    queryFn: async () => {
      const [totalUsers, adminRoles, residentRoles, securityRoles, superAdminRoles] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase
            .from("user_roles")
            .select("id", { count: "exact", head: true })
            .eq("role", "admin"),
          supabase
            .from("user_roles")
            .select("id", { count: "exact", head: true })
            .eq("role", "resident"),
          supabase
            .from("user_roles")
            .select("id", { count: "exact", head: true })
            .eq("role", "security"),
          supabase
            .from("user_roles")
            .select("id", { count: "exact", head: true })
            .eq("role", "super_admin"),
        ]);
      return {
        totalUsers: totalUsers.count ?? 0,
        admins: adminRoles.count ?? 0,
        residents: residentRoles.count ?? 0,
        security: securityRoles.count ?? 0,
        superAdmins: superAdminRoles.count ?? 0,
      };
    },
    refetchInterval: 30000,
  });
}

function SuperAdminPage() {
  const { data } = useSuperAdminStats();

  return (
    <>
      <PageHeader
        title="Super Admin Dashboard"
        description="Full system control — manage users, roles, and system settings."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Users"
          value={data?.totalUsers ?? "—"}
          hint="All registered users"
          Icon={Users}
        />
        <StatCard
          label="Super Admins"
          value={data?.superAdmins ?? "—"}
          hint="Highest privilege"
          Icon={ShieldCheck}
        />
        <StatCard
          label="Admins"
          value={data?.admins ?? "—"}
          hint="Society managers"
          Icon={Shield}
        />
        <StatCard
          label="Residents"
          value={data?.residents ?? "—"}
          hint="Regular members"
          Icon={UserCog}
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel title="Quick Actions">
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: "/super-admin/users", Icon: Users, label: "Manage Users" },
              { to: "/super-admin/roles", Icon: Shield, label: "Manage Roles" },
              { to: "/super-admin/settings", Icon: Settings, label: "System Settings" },
              { to: "/admin", Icon: LayoutDashboard, label: "Admin Panel" },
            ].map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-2xl border bg-background px-3 py-2.5 text-sm font-medium hover:bg-accent"
              >
                <Icon className="h-4 w-4" /> {label}
              </Link>
            ))}
          </div>
        </Panel>

        <Panel title="System Overview">
          <div className="space-y-3">
            <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
              <div>
                <div className="text-sm font-medium">User Management</div>
                <div className="text-xs text-muted-foreground">
                  Create, edit, delete users and assign roles
                </div>
              </div>
              <Link
                to="/super-admin/users"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Go <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
              <div>
                <div className="text-sm font-medium">Role Management</div>
                <div className="text-xs text-muted-foreground">
                  Assign and revoke roles for any user
                </div>
              </div>
              <Link
                to="/super-admin/roles"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Go <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3">
              <div>
                <div className="text-sm font-medium">Security Roles</div>
                <div className="text-xs text-muted-foreground">
                  {data?.security ?? 0} security personnel assigned
                </div>
              </div>
              <Link
                to="/super-admin/roles"
                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
              >
                Go <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </div>
        </Panel>
      </div>
    </>
  );
}
