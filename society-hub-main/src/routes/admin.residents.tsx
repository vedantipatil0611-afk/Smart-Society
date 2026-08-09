import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Trash2, Save, ChevronLeft, ChevronRight, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/admin/residents")({
  head: () => ({
    meta: [
      { title: "Residents — SocietyOS Admin" },
      { name: "description", content: "Search, edit, add and manage resident profiles." },
    ],
  }),
  component: Page,
});

const PAGE_SIZE = 10;

const defaultNewMember = {
  full_name: "",
  email: "",
  phone: "",
  flat_number: "",
  wing: "",
  occupation: "",
  emergency_contact: "",
  vehicle_number: "",
  avatar_url: null as string | null,
  family_members: "",
};

function Page() {
  const [q, setQ] = useState("");
  const [page, setPage] = useState(0);
  const [wing, setWing] = useState("");
  const [editing, setEditing] = useState<any | null>(null);
  const [adding, setAdding] = useState(false);
  const [newMember, setNewMember] = useState(defaultNewMember);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["admin-residents", q, page, wing],
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
      if (wing) {
        query = query.eq("wing", wing);
      }

      const from = page * PAGE_SIZE;
      const { data, count } = await query.range(from, from + PAGE_SIZE - 1);
      return { rows: data ?? [], total: count ?? 0 };
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("profiles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resident profile deleted.");
      qc.invalidateQueries({ queryKey: ["admin-residents"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete resident.");
      setDeletingId(null);
    },
  });

  const save = useMutation({
    mutationFn: async (r: any) => {
      const isValid = validateForm([
        { field: "full_name", value: r.full_name, required: true, label: "Full Name" },
        { field: "phone", value: r.phone, isPhone: true, label: "Phone Number" },
        { field: "email", value: r.email, isEmail: true, label: "Email" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: r.full_name,
          phone: r.phone,
          flat_number: r.flat_number,
          wing: r.wing,
          vehicle_number: r.vehicle_number,
          emergency_contact: r.emergency_contact,
          occupation: r.occupation,
          avatar_url: r.avatar_url,
          family_members: r.family_members || null,
        })
        .eq("id", r.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Resident updated successfully.");
      qc.invalidateQueries({ queryKey: ["admin-residents"] });
      setEditing(null);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to update resident.");
      }
    },
  });

  const createMember = useMutation({
    mutationFn: async (m: typeof defaultNewMember) => {
      const isValid = validateForm([
        { field: "full_name", value: m.full_name, required: true, label: "Full Name" },
        { field: "flat_number", value: m.flat_number, required: true, label: "Flat Number" },
        { field: "phone", value: m.phone, isPhone: true, label: "Phone Number" },
        { field: "email", value: m.email, isEmail: true, label: "Email" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      // Generate a mock unique id for profile if created directly by admin
      const id = crypto.randomUUID();
      const { error } = await supabase.from("profiles").insert([
        {
          id,
          full_name: m.full_name,
          email: m.email || null,
          phone: m.phone || null,
          flat_number: m.flat_number,
          wing: m.wing || null,
          occupation: m.occupation || null,
          emergency_contact: m.emergency_contact || null,
          vehicle_number: m.vehicle_number || null,
          avatar_url: m.avatar_url || null,
          family_members: m.family_members || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("New member added successfully.");
      qc.invalidateQueries({ queryKey: ["admin-residents"] });
      setAdding(false);
      setNewMember(defaultNewMember);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to add member.");
      }
    },
  });

  const total = data?.total ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <PageHeader
        title="Members & Residents"
        description={`${total} registered profile${total === 1 ? "" : "s"}.`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Button onClick={() => setAdding(true)} className="rounded-full shadow-sm">
              <UserPlus className="mr-2 h-4 w-4" /> Add Member
            </Button>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setPage(0);
                }}
                placeholder="Search name, flat, phone"
                className="w-56 rounded-full pl-9"
              />
            </div>
            <Input
              value={wing}
              onChange={(e) => {
                setWing(e.target.value);
                setPage(0);
              }}
              placeholder="Wing"
              className="w-20 rounded-full"
            />
          </div>
        }
      />

      <Panel title="All Members">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Member</TableHead>
                <TableHead>Flat / Wing</TableHead>
                <TableHead>Contact</TableHead>
                <TableHead>Family Members</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Occupation</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(data?.rows ?? []).map((r: any) => (
                <TableRow key={r.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarImage src={r.avatar_url || ""} />
                        <AvatarFallback>{(r.full_name || "M")[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{r.full_name || "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">{r.email || "No email"}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {r.wing ? `${r.wing}-` : ""}
                    {r.flat_number || "—"}
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">{r.phone || "—"}</div>
                    {r.emergency_contact && (
                      <div className="text-xs text-muted-foreground">
                        Emergency: {r.emergency_contact}
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="text-sm max-w-xs truncate">
                    {r.family_members || "—"}
                  </TableCell>
                  <TableCell>{r.vehicle_number || "—"}</TableCell>
                  <TableCell>{r.occupation || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" onClick={() => setEditing(r)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setDeletingId(r.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!data?.rows.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No members match your criteria.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            Page {page + 1} of {pages} ({total} total)
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

      {/* Add Member Dialog */}
      <Dialog open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Member</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <ImageUpload
                label="Profile Photo"
                value={newMember.avatar_url}
                onChange={(url) => setNewMember({ ...newMember, avatar_url: url })}
              />
            </div>
            <Field
              label="Full Name *"
              value={newMember.full_name}
              onChange={(v) => setNewMember({ ...newMember, full_name: v })}
            />
            <Field
              label="Phone Number"
              value={newMember.phone}
              onChange={(v) => setNewMember({ ...newMember, phone: v })}
            />
            <Field
              label="Flat Number *"
              value={newMember.flat_number}
              onChange={(v) => setNewMember({ ...newMember, flat_number: v })}
            />
            <Field
              label="Wing"
              value={newMember.wing}
              onChange={(v) => setNewMember({ ...newMember, wing: v })}
            />
            <Field
              label="Email"
              value={newMember.email}
              onChange={(v) => setNewMember({ ...newMember, email: v })}
            />
            <Field
              label="Occupation"
              value={newMember.occupation}
              onChange={(v) => setNewMember({ ...newMember, occupation: v })}
            />
            <Field
              label="Vehicle Number"
              value={newMember.vehicle_number}
              onChange={(v) => setNewMember({ ...newMember, vehicle_number: v })}
            />
            <Field
              label="Emergency Contact"
              value={newMember.emergency_contact}
              onChange={(v) => setNewMember({ ...newMember, emergency_contact: v })}
            />
            <div className="col-span-2">
              <Label className="text-xs font-medium text-foreground">
                Family Members (Comma-separated)
              </Label>
              <Input
                value={newMember.family_members}
                onChange={(e) => setNewMember({ ...newMember, family_members: e.target.value })}
                placeholder="e.g. John Doe (Spouse), Jane Doe (Daughter)"
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMember.mutate(newMember)}
              disabled={createMember.isPending}
            >
              <Save className="mr-1 h-4 w-4" /> Save Member
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Member Profile</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <ImageUpload
                  label="Profile Photo"
                  value={editing.avatar_url}
                  onChange={(url) => setEditing({ ...editing, avatar_url: url })}
                />
              </div>
              <Field
                label="Full Name *"
                value={editing.full_name}
                onChange={(v) => setEditing({ ...editing, full_name: v })}
              />
              <Field
                label="Phone"
                value={editing.phone}
                onChange={(v) => setEditing({ ...editing, phone: v })}
              />
              <Field
                label="Wing"
                value={editing.wing}
                onChange={(v) => setEditing({ ...editing, wing: v })}
              />
              <Field
                label="Flat Number"
                value={editing.flat_number}
                onChange={(v) => setEditing({ ...editing, flat_number: v })}
              />
              <Field
                label="Vehicle Number"
                value={editing.vehicle_number}
                onChange={(v) => setEditing({ ...editing, vehicle_number: v })}
              />
              <Field
                label="Emergency Contact"
                value={editing.emergency_contact}
                onChange={(v) => setEditing({ ...editing, emergency_contact: v })}
              />
              <Field
                label="Occupation"
                value={editing.occupation}
                onChange={(v) => setEditing({ ...editing, occupation: v })}
                full
              />
              <div className="col-span-2">
                <Label className="text-xs font-medium text-foreground">
                  Family Members (Comma-separated)
                </Label>
                <Input
                  value={editing.family_members || ""}
                  onChange={(e) => setEditing({ ...editing, family_members: e.target.value })}
                  placeholder="e.g. John Doe (Spouse), Jane Doe (Daughter)"
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>
              <Save className="mr-1 h-4 w-4" /> Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resident Profile?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this member profile. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && del.mutate(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function Field({
  label,
  value,
  onChange,
  full,
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
  full?: boolean;
}) {
  return (
    <div className={full ? "col-span-2" : ""}>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl mt-1"
      />
    </div>
  );
}
