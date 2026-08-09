import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Trash2, Save, ChevronLeft, ChevronRight, UserPlus, Shield } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/auth-context";

export const Route = createFileRoute("/super-admin/users")({
  head: () => ({
    meta: [
      { title: "User Management — Super Admin — SocietyOS" },
      { name: "description", content: "Manage all users, edit profiles, and assign roles." },
    ],
  }),
  component: UsersPage,
});

const PAGE = 10;

type UserWithRoles = {
  id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  flat_number: string | null;
  wing: string | null;
  created_at: string;
  roles: AppRole[];
};

function UsersPage() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [editing, setEditing] = useState<UserWithRoles | null>(null);
  const [addRoleDialog, setAddRoleDialog] = useState<UserWithRoles | null>(null);
  const [newRole, setNewRole] = useState<AppRole>("resident");
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["super-admin-users", q, page],
    queryFn: async () => {
      let query = supabase
        .from("profiles")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false });

      if (q) {
        query = query.or(
          `full_name.ilike.%${q}%,email.ilike.%${q}%,flat_number.ilike.%${q}%,phone.ilike.%${q}%`,
        );
      }

      const from = page * PAGE;
      const { data: profiles, count } = await query.range(from, from + PAGE - 1);

      // Fetch roles for these users
      const userIds = (profiles ?? []).map((p) => p.id);
      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role")
        .in("user_id", userIds);

      const roleMap: Record<string, AppRole[]> = {};
      (roles ?? []).forEach((r) => {
        if (!roleMap[r.user_id]) roleMap[r.user_id] = [];
        roleMap[r.user_id].push(r.role as AppRole);
      });

      const users: UserWithRoles[] = (profiles ?? []).map((p) => ({
        id: p.id,
        email: p.email,
        full_name: p.full_name,
        phone: p.phone,
        flat_number: p.flat_number,
        wing: p.wing,
        created_at: p.created_at,
        roles: roleMap[p.id] ?? [],
      }));

      return { rows: users, total: count ?? 0 };
    },
  });

  const deleteUser = useMutation({
    mutationFn: async (id: string) => {
      // Delete profile (cascade will handle user_roles)
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const saveProfile = useMutation({
    mutationFn: async (user: UserWithRoles) => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: user.full_name,
          phone: user.phone,
          flat_number: user.flat_number,
          wing: user.wing,
        })
        .eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["super-admin-users"] });
      setEditing(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Role assigned");
      qc.invalidateQueries({ queryKey: ["super-admin-users"] });
      setAddRoleDialog(null);
    },
    onError: (e: any) => toast.error(e.message),
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
      qc.invalidateQueries({ queryKey: ["super-admin-users"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const roleBadgeColor = (role: AppRole) => {
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
          title="User Management"
          description={`${total} total user${total === 1 ? "" : "s"} in the system.`}
          action={
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search name, email, flat, phone"
                className="w-72 rounded-full pl-9"
              />
            </div>
          }
        />

        <Panel title="All Users">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Flat</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Roles</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(data?.rows ?? []).map((user) => (
                  <TableRow key={user.id}>
                    <TableCell>
                      <div className="font-medium">{user.full_name || "—"}</div>
                      <div className="text-xs text-muted-foreground">{user.email}</div>
                    </TableCell>
                    <TableCell>
                      {user.wing ? `${user.wing}-` : ""}
                      {user.flat_number || "—"}
                    </TableCell>
                    <TableCell>{user.phone || "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map((role) => (
                          <Badge
                            key={role}
                            variant="outline"
                            className={`text-xs cursor-pointer ${roleBadgeColor(role)}`}
                            onClick={() => {
                              if (confirm(`Remove "${role}" role from this user?`)) {
                                removeRole.mutate({ userId: user.id, role });
                              }
                            }}
                          >
                            {role} ×
                          </Badge>
                        ))}
                        <Badge
                          variant="outline"
                          className="text-xs cursor-pointer bg-gray-50 hover:bg-gray-100"
                          onClick={() => {
                            setAddRoleDialog(user);
                            setNewRole("resident");
                          }}
                        >
                          <UserPlus className="h-3 w-3 mr-0.5" /> Add
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(user.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setEditing(user)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          confirm("Delete this user permanently?") && deleteUser.mutate(user.id)
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {!data?.rows.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Page {page + 1} of {pages}
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={page + 1 >= pages}
                onClick={() => setPage((p) => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </Panel>

        {/* Edit Profile Dialog */}
        <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
          <DialogContent className="rounded-3xl sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Edit User Profile</DialogTitle>
            </DialogHeader>
            {editing && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <Input
                    value={editing.full_name ?? ""}
                    onChange={(e) => setEditing({ ...editing, full_name: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Phone</Label>
                  <Input
                    value={editing.phone ?? ""}
                    onChange={(e) => setEditing({ ...editing, phone: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Wing</Label>
                  <Input
                    value={editing.wing ?? ""}
                    onChange={(e) => setEditing({ ...editing, wing: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
                <div>
                  <Label className="text-xs">Flat Number</Label>
                  <Input
                    value={editing.flat_number ?? ""}
                    onChange={(e) => setEditing({ ...editing, flat_number: e.target.value })}
                    className="rounded-xl"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" onClick={() => setEditing(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => editing && saveProfile.mutate(editing)}
                disabled={saveProfile.isPending}
              >
                <Save className="mr-1 h-4 w-4" /> Save
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Add Role Dialog */}
        <Dialog open={!!addRoleDialog} onOpenChange={(o) => !o && setAddRoleDialog(null)}>
          <DialogContent className="rounded-3xl sm:max-w-md">
            <DialogHeader>
              <DialogTitle>
                <Shield className="inline h-5 w-5 mr-2" />
                Assign Role to {addRoleDialog?.full_name || addRoleDialog?.email}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label className="text-xs">Select Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="resident">Resident</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="security">Security</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {addRoleDialog && addRoleDialog.roles.includes(newRole) && (
                <p className="text-xs text-amber-600">This user already has this role.</p>
              )}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setAddRoleDialog(null)}>
                Cancel
              </Button>
              <Button
                onClick={() =>
                  addRoleDialog && addRole.mutate({ userId: addRoleDialog.id, role: newRole })
                }
                disabled={addRole.isPending || (addRoleDialog?.roles.includes(newRole) ?? false)}
              >
                <Shield className="mr-1 h-4 w-4" /> Assign Role
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </AppShell>
    </RoleGate>
  );
}
