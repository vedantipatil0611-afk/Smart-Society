import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Settings, Database, Shield, Users, Building2, Info } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/super-admin/settings")({
  head: () => ({
    meta: [
      { title: "System Settings — Super Admin — SocietyOS" },
      { name: "description", content: "System settings and configuration overview." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { data: systemInfo } = useQuery({
    queryKey: ["system-info"],
    queryFn: async () => {
      const [profiles, roles, complaints, notices, visitors, bills, events, staff, parking] =
        await Promise.all([
          supabase.from("profiles").select("id", { count: "exact", head: true }),
          supabase.from("user_roles").select("id", { count: "exact", head: true }),
          supabase.from("complaints").select("id", { count: "exact", head: true }),
          supabase.from("notices").select("id", { count: "exact", head: true }),
          supabase.from("visitors").select("id", { count: "exact", head: true }),
          supabase.from("maintenance_bills").select("id", { count: "exact", head: true }),
          supabase.from("events").select("id", { count: "exact", head: true }),
          supabase.from("staff").select("id", { count: "exact", head: true }),
          supabase.from("parking_slots").select("id", { count: "exact", head: true }),
        ]);
      return {
        profiles: profiles.count ?? 0,
        roles: roles.count ?? 0,
        complaints: complaints.count ?? 0,
        notices: notices.count ?? 0,
        visitors: visitors.count ?? 0,
        bills: bills.count ?? 0,
        events: events.count ?? 0,
        staff: staff.count ?? 0,
        parking: parking.count ?? 0,
      };
    },
  });

  return (
    <RoleGate allow={["super_admin"]}>
      <AppShell role="SuperAdmin">
        <PageHeader
          title="System Settings"
          description="System configuration and database overview."
        />

        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="System Information">
            <div className="space-y-3">
              <InfoRow
                label="Application"
                value="SocietyOS"
                icon={<Building2 className="h-4 w-4" />}
              />
              <InfoRow label="Backend" value="Supabase" icon={<Database className="h-4 w-4" />} />
              <InfoRow label="Deployment" value="Vercel" icon={<Settings className="h-4 w-4" />} />
              <InfoRow
                label="Auth Provider"
                value="Supabase Auth (Email + Google OAuth)"
                icon={<Shield className="h-4 w-4" />}
              />
              <InfoRow
                label="Roles"
                value="super_admin, admin, resident, security"
                icon={<Users className="h-4 w-4" />}
              />
            </div>
          </Panel>

          <Panel title="Database Statistics">
            <div className="space-y-2">
              {[
                { label: "User Profiles", count: systemInfo?.profiles ?? 0 },
                { label: "Role Assignments", count: systemInfo?.roles ?? 0 },
                { label: "Complaints", count: systemInfo?.complaints ?? 0 },
                { label: "Notices", count: systemInfo?.notices ?? 0 },
                { label: "Visitor Records", count: systemInfo?.visitors ?? 0 },
                { label: "Maintenance Bills", count: systemInfo?.bills ?? 0 },
                { label: "Events", count: systemInfo?.events ?? 0 },
                { label: "Staff Members", count: systemInfo?.staff ?? 0 },
                { label: "Parking Slots", count: systemInfo?.parking ?? 0 },
              ].map(({ label, count }) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5"
                >
                  <span className="text-sm">{label}</span>
                  <Badge variant="secondary" className="font-mono">
                    {count}
                  </Badge>
                </div>
              ))}
            </div>
          </Panel>

          <Panel title="Security Configuration">
            <div className="space-y-3">
              <div className="rounded-xl bg-muted p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Row Level Security (RLS)</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      All tables have RLS enabled. Users can only access data according to their
                      assigned roles. Super admins bypass all restrictions.
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <div className="flex items-start gap-3">
                  <Shield className="h-5 w-5 text-green-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium">Role Hierarchy</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      <strong>Super Admin</strong> → Full system access, user management, role
                      assignment
                      <br />
                      <strong>Admin</strong> → Society management, resident oversight
                      <br />
                      <strong>Security</strong> → Visitor management, entry/exit logging
                      <br />
                      <strong>Resident</strong> → Personal dashboard, complaints, bookings
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Panel>

          <Panel title="Deployment Notes">
            <div className="space-y-3">
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-amber-500 mt-0.5" />
                  <div>
                    <h4 className="text-sm font-medium text-amber-800">
                      Environment Variables Required
                    </h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Ensure the following are set in your Vercel deployment:
                      <br />• <code className="bg-amber-100 px-1 rounded">VITE_SUPABASE_URL</code>
                      <br />•{" "}
                      <code className="bg-amber-100 px-1 rounded">
                        VITE_SUPABASE_PUBLISHABLE_KEY
                      </code>
                      <br />•{" "}
                      <code className="bg-amber-100 px-1 rounded">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
                      (server-side only)
                    </p>
                  </div>
                </div>
              </div>
              <div className="rounded-xl bg-muted p-4">
                <h4 className="text-sm font-medium">First Super Admin Setup</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  To assign the first super_admin role, run this SQL in your Supabase SQL editor:
                  <br />
                  <code className="mt-2 block bg-background border rounded-lg p-2 text-xs">
                    INSERT INTO public.user_roles (user_id, role)
                    <br />
                    VALUES ('YOUR_USER_UUID', 'super_admin');
                  </code>
                </p>
              </div>
            </div>
          </Panel>
        </div>
      </AppShell>
    </RoleGate>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between rounded-xl bg-muted px-4 py-2.5">
      <div className="flex items-center gap-2 text-sm">
        {icon}
        <span>{label}</span>
      </div>
      <span className="text-sm font-medium">{value}</span>
    </div>
  );
}
