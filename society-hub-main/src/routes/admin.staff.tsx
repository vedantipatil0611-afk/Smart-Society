import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Search, Filter } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ImageUpload } from "@/components/ui/image-upload";
import { validateForm } from "@/lib/form-validation";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/staff")({
  head: () => ({
    meta: [
      { title: "Staff Roster — SocietyOS Admin" },
      {
        name: "description",
        content: "Manage society staff: guards, cleaners, maintenance and more.",
      },
    ],
  }),
  component: Page,
});

const sb = supabase as any;

const STAFF_ROLES = [
  "security",
  "cleaner",
  "gardener",
  "electrician",
  "plumber",
  "manager",
  "other",
];

function emptyForm() {
  return {
    id: undefined as string | undefined,
    name: "",
    role: "security",
    phone: "",
    address: "",
    shift: "Morning (6am - 2pm)",
    salary: null as number | null,
    active: true,
    photo_url: null as string | null,
  };
}

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: staff = [] } = useQuery({
    queryKey: ["staff", search, roleFilter],
    queryFn: async () => {
      let q = sb.from("staff").select("*").order("created_at", { ascending: false });
      if (roleFilter !== "all") q = q.eq("role", roleFilter);
      if (search) q = q.or(`name.ilike.%${search}%,phone.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (values: typeof form) => {
      const isValid = validateForm([
        { field: "name", value: values.name, required: true, label: "Staff Name" },
        { field: "phone", value: values.phone, isPhone: true, label: "Phone Number" },
        { field: "salary", value: values.salary, isNumeric: true, min: 0, label: "Salary" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const payload = {
        name: values.name,
        role: values.role,
        phone: values.phone || null,
        address: values.address || null,
        shift: values.shift || null,
        salary: values.salary != null ? Number(values.salary) : null,
        active: values.active,
        photo_url: values.photo_url || null,
      };

      if (values.id) {
        const { error } = await sb.from("staff").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("staff").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Staff details saved successfully.");
      setOpen(false);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ["staff"] });
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to save staff.");
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("staff").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Staff member deleted.");
      qc.invalidateQueries({ queryKey: ["staff"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete staff member.");
      setDeletingId(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Staff Management"
        description="Society staff roster, duty shifts, contact details, and salaries."
        action={
          <Button
            className="rounded-full shadow-sm"
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Staff Member
          </Button>
        }
      />

      <Panel
        title="Staff Roster"
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search name or phone..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-52 rounded-full pl-9"
              />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-36 rounded-full">
                <Filter className="mr-1 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                {STAFF_ROLES.map((r) => (
                  <SelectItem key={r} value={r} className="capitalize">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      >
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Photo</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell>
                    {s.photo_url ? (
                      <img
                        src={s.photo_url}
                        alt={s.name}
                        className="h-10 w-10 rounded-full object-cover border"
                      />
                    ) : (
                      <div className="h-10 w-10 rounded-full bg-muted grid place-items-center text-xs font-semibold">
                        {(s.name || "S")[0]}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full capitalize">
                      {s.role}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.phone || "—"}</TableCell>
                  <TableCell>{s.shift || "—"}</TableCell>
                  <TableCell>{s.salary != null ? `₹${s.salary}` : "—"}</TableCell>
                  <TableCell>
                    {s.active ? (
                      <Badge className="rounded-full bg-emerald-600 hover:bg-emerald-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="rounded-full">
                        Inactive
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => {
                        setForm({ ...s });
                        setOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeletingId(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!staff.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No staff members found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Add/Edit Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Staff Details" : "Add New Staff Member"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <ImageUpload
              label="Profile Photo"
              value={form.photo_url}
              onChange={(url) => setForm({ ...form, photo_url: url })}
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Name *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Role</Label>
                <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
                  <SelectTrigger className="rounded-xl mt-1 capitalize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STAFF_ROLES.map((r) => (
                      <SelectItem key={r} value={r} className="capitalize">
                        {r}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Phone Number</Label>
                <Input
                  value={form.phone ?? ""}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Shift</Label>
                <Input
                  value={form.shift ?? ""}
                  placeholder="e.g. 6am–2pm"
                  onChange={(e) => setForm({ ...form, shift: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Monthly Salary (₹)</Label>
                <Input
                  type="number"
                  value={form.salary ?? ""}
                  onChange={(e) =>
                    setForm({ ...form, salary: e.target.value ? Number(e.target.value) : null })
                  }
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={String(form.active)}
                  onValueChange={(v) => setForm({ ...form, active: v === "true" })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">Active</SelectItem>
                    <SelectItem value="false">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs font-medium">Address</Label>
              <Textarea
                rows={2}
                value={form.address ?? ""}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              Save Staff
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Staff Member?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove this staff member from the society roster permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && remove.mutate(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
