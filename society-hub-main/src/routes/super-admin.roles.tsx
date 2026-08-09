import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Shield, ShieldCheck, Users, UserCog, Trash2, Search } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel, StatCard } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth-context";

export const Route = createFileRoute("/super-admin/roles")({
  head: () => ({
    meta: [
      { title: "Role Management — Super Admin — SocietyOS" },
      { name: "description", content: "View and manage all role assignments across the system." },
    ],
  }),
  component: RolesPage,
});

type RoleAssignment = {
  id: string;
  user_id: string;
  role: AppRole;
  created_at: string;
  user_email?: string;
  user_name?: string;
};

function RolesPage() {
  const [tab, setTab] = useState<string>("all");
  const [q, setQ] = useState("");
  const qc = useQueryClient();

  const { data: stats } = useQuery({
    queryKey: ["role-stats"],
    queryFn: async () => {
      const [admins, residents, security, superAdmins] = await Promise.all([
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
        admins: admins.count ?? 0,
        residents: residents.count ?? 0,
        security: security.count ?? 0,
        superAdmins: superAdmins.count ?? 0,
      };
    },
  });

  const { data: assignments } = useQuery({
    queryKey: ["role-assignments", tab],
    queryFn: async () => {
      let query = supabase.from("user_roles").select("*").order("created_at", { ascending: false });
      if (tab !== "all") {
        query = query.eq("role", tab as "admin" | "resident" | "security" | "super_admin");
      }
      const { data } = await query;

      // Fetch profiles for these users
      const userIds = [...new Set((data ?? []).map((r) => r.user_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .in("id", userIds);

      const profileMap: Record<string, { email: string | null; full_name: string | null }> = {};
      (profiles ?? []).forEach((p) => {
        profileMap[p.id] = { email: p.email, full_name: p.full_name };
      });

      return (data ?? []).map((r) => ({
        ...r,
        user_email: profileMap[r.user_id]?.email ?? "Unknown",
        user_name: profileMap[r.user_id]?.full_name ?? "",
      })) as RoleAssignment[];
    },
  });

  const removeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase
        .from("user_roles")
        .delete()
        .eq("user_id", userId)
        .eq("role", role);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role removed");
      qc.invalidateQueries({ queryKey: ["role-assignments"] });
      qc.invalidateQueries({ queryKey: ["role-stats"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const filtered = (assignments ?? []).filter((a) => {
    if (!q) return true;
    const search = q.toLowerCase();
    return (
      (a.user_email?.toLowerCase().includes(search) ?? false) ||
      (a.user_name?.toLowerCase().includes(search) ?? false)
    );
  });

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "super_admin":
        return "bg-red-100 text-red-800 border-red-200";
      case "admin":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "security":
        return "bg-blue-100 text-blue-800 border-blue-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  return (
    <RoleGate allow={["super_admin"]}>
      <AppShell role="SuperAdmin">
        <PageHeader
          title="Role Management"
          description="View and manage all role assignments in the system."
        />

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Super Admins"
            value={stats?.superAdmins ?? "—"}
            hint="Full system access"
            Icon={ShieldCheck}
          />
          <StatCard
            label="Admins"
            value={stats?.admins ?? "—"}
            hint="Society managers"
            Icon={Shield}
          />
          <StatCard
            label="Residents"
            value={stats?.residents ?? "—"}
            hint="Regular members"
            Icon={Users}
          />
          <StatCard
            label="Security"
            value={stats?.security ?? "—"}
            hint="Gate personnel"
            Icon={UserCog}
          />
        </div>

        <div className="mt-6">
          <Panel title="Role Assignments">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <Tabs value={tab} onValueChange={setTab}>
                <TabsList className="rounded-full bg-muted p-1">
                  <TabsTrigger value="all" className="rounded-full text-xs">
                    All
                  </TabsTrigger>
                  <TabsTrigger value="super_admin" className="rounded-full text-xs">
                    Super Admin
                  </TabsTrigger>
                  <TabsTrigger value="admin" className="rounded-full text-xs">
                    Admin
                  </TabsTrigger>
                  <TabsTrigger value="resident" className="rounded-full text-xs">
                    Resident
                  </TabsTrigger>
                  <TabsTrigger value="security" className="rounded-full text-xs">
                    Security
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                  placeholder="Search by name or email"
                  className="w-56 rounded-full pl-9"
                />
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Assigned On</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((a) => (
                    <TableRow key={a.id}>
                      <TableCell>
                        <div className="font-medium">{a.user_name || "—"}</div>
                        <div className="text-xs text-muted-foreground">{a.user_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-xs ${roleBadgeColor(a.role)}`}>
                          {a.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            confirm(
                              `Remove "${a.role}" role from ${a.user_name || a.user_email}?`,
                            ) && removeRole.mutate({ userId: a.user_id, role: a.role })
                          }
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!filtered.length && (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No role assignments found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Panel>
        </div>
      </AppShell>
    </RoleGate>
  );
}
