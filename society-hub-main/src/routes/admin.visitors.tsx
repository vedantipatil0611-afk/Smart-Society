import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  Check,
  X,
  LogOut as LogOutIcon,
  Filter,
  Plus,
  Trash2,
  Edit,
  UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ImageUpload } from "@/components/ui/image-upload";
import { validateForm } from "@/lib/form-validation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
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
import { useProfileMap } from "@/lib/use-profile-map";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/visitors")({
  head: () => ({
    meta: [
      { title: "Visitors — SocietyOS Admin" },
      {
        name: "description",
        content: "All visitor entries, exits and approvals across the society.",
      },
    ],
  }),
  component: Page,
});

const defaultNewVisitor = {
  visitor_name: "",
  visitor_phone: "",
  visitor_type: "guest",
  purpose: "",
  flat_number: "",
  wing: "",
  vehicle_number: "",
  status: "approved",
  photo_url: null as string | null,
  host_resident_id: null as string | null,
};

function Page() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [newVisitor, setNewVisitor] = useState(defaultNewVisitor);

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-min-visitors"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id,full_name,flat_number,wing").order("full_name"))
        .data ?? [],
  });

  const { data } = useQuery({
    queryKey: ["admin-visitors", status],
    queryFn: async () => {
      let query = supabase
        .from("visitors")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (status !== "all") query = query.eq("status", status);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: pm } = useProfileMap(
    (data ?? []).map((v: any) => v.host_resident_id).filter(Boolean),
  );

  const rows = (data ?? []).filter((v: any) => {
    if (!q) return true;
    const l = q.toLowerCase();
    return (
      v.visitor_name?.toLowerCase().includes(l) ||
      v.visitor_phone?.includes(q) ||
      v.flat_number?.toLowerCase().includes(l) ||
      v.vehicle_number?.toLowerCase().includes(l)
    );
  });

  const setStat = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const patch: any = { status: s };
      if (s === "inside" || s === "approved")
        patch.entry_time = patch.entry_time || new Date().toISOString();
      if (s === "exited") patch.exit_time = new Date().toISOString();
      const { error } = await supabase.from("visitors").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor status updated.");
      qc.invalidateQueries({ queryKey: ["admin-visitors"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update visitor status."),
  });

  const createVisitor = useMutation({
    mutationFn: async (v: typeof defaultNewVisitor) => {
      const isValid = validateForm([
        { field: "visitor_name", value: v.visitor_name, required: true, label: "Visitor Name" },
        { field: "visitor_phone", value: v.visitor_phone, isPhone: true, label: "Mobile Number" },
        { field: "flat_number", value: v.flat_number, required: true, label: "Flat Number" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const entryTime = new Date().toISOString();
      const { error } = await supabase.from("visitors").insert([
        {
          visitor_name: v.visitor_name,
          visitor_phone: v.visitor_phone || null,
          visitor_type: v.visitor_type || "guest",
          purpose: v.purpose || null,
          flat_number: v.flat_number,
          wing: v.wing || null,
          vehicle_number: v.vehicle_number || null,
          status: v.status || "approved",
          entry_time: entryTime,
          photo_url: v.photo_url || null,
          host_resident_id: v.host_resident_id || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor entry registered successfully.");
      qc.invalidateQueries({ queryKey: ["admin-visitors"] });
      setAdding(false);
      setNewVisitor(defaultNewVisitor);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to add visitor.");
      }
    },
  });

  const saveVisitor = useMutation({
    mutationFn: async (v: any) => {
      const isValid = validateForm([
        { field: "visitor_name", value: v.visitor_name, required: true, label: "Visitor Name" },
        { field: "visitor_phone", value: v.visitor_phone, isPhone: true, label: "Mobile Number" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const { error } = await supabase
        .from("visitors")
        .update({
          visitor_name: v.visitor_name,
          visitor_phone: v.visitor_phone,
          purpose: v.purpose,
          flat_number: v.flat_number,
          wing: v.wing,
          vehicle_number: v.vehicle_number,
          status: v.status,
          photo_url: v.photo_url || null,
          host_resident_id: v.host_resident_id || null,
        })
        .eq("id", v.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor details updated.");
      qc.invalidateQueries({ queryKey: ["admin-visitors"] });
      setEditing(null);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to save visitor.");
      }
    },
  });

  const delVisitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("visitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor record deleted.");
      qc.invalidateQueries({ queryKey: ["admin-visitors"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete visitor.");
      setDeletingId(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Visitor Management"
        description="Track and manage visitor entries, approvals, and exits."
        action={
          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setAdding(true)} className="rounded-full shadow-sm">
              <Plus className="mr-1 h-4 w-4" /> Add Visitor
            </Button>
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search name/phone/flat/vehicle"
              className="w-56 rounded-full"
            />
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 rounded-full">
                <Filter className="mr-1 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="denied">Denied</SelectItem>
                <SelectItem value="inside">Inside</SelectItem>
                <SelectItem value="exited">Exited</SelectItem>
              </SelectContent>
            </Select>
          </div>
        }
      />

      <Panel title="Visitor Logs">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Visitor</TableHead>
                <TableHead>Host / Flat</TableHead>
                <TableHead>Purpose</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Entry Time</TableHead>
                <TableHead>Exit Time</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((v: any) => (
                <TableRow key={v.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={v.photo_url || ""} />
                        <AvatarFallback>{(v.visitor_name || "V")[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{v.visitor_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {v.visitor_type} · {v.visitor_phone || "—"}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">
                      {pm?.[v.host_resident_id]?.full_name || "Resident"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Flat {v.wing ? `${v.wing}-` : ""}
                      {v.flat_number || "—"}
                    </div>
                  </TableCell>
                  <TableCell>{v.purpose || "—"}</TableCell>
                  <TableCell>{v.vehicle_number || "—"}</TableCell>
                  <TableCell className="text-xs">
                    {v.entry_time ? format(new Date(v.entry_time), "MMM d, HH:mm") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {v.exit_time ? format(new Date(v.exit_time), "MMM d, HH:mm") : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        v.status === "inside" || v.status === "approved"
                          ? "default"
                          : v.status === "exited"
                            ? "secondary"
                            : v.status === "denied"
                              ? "destructive"
                              : "outline"
                      }
                      className="rounded-full capitalize"
                    >
                      {v.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {v.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Approve"
                            onClick={() => setStat.mutate({ id: v.id, s: "approved" })}
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Deny"
                            onClick={() => setStat.mutate({ id: v.id, s: "denied" })}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      {(v.status === "inside" || v.status === "approved") && (
                        <Button
                          size="sm"
                          variant="ghost"
                          title="Mark Exited"
                          onClick={() => setStat.mutate({ id: v.id, s: "exited" })}
                        >
                          <LogOutIcon className="h-4 w-4 text-blue-600" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setEditing(v)}>
                        <Edit className="h-4 w-4 text-muted-foreground" />
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => setDeletingId(v.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No visitor records found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Add Visitor Dialog */}
      <Dialog open={adding} onOpenChange={(o) => !o && setAdding(false)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Register New Visitor</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div className="col-span-2">
              <ImageUpload
                label="Visitor Photo"
                value={newVisitor.photo_url}
                onChange={(url) => setNewVisitor({ ...newVisitor, photo_url: url })}
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium text-foreground">Visiting Member *</Label>
              <Select
                value={newVisitor.host_resident_id || "none"}
                onValueChange={(val) => {
                  if (val === "none") {
                    setNewVisitor({
                      ...newVisitor,
                      host_resident_id: null,
                    });
                  } else {
                    const res = residents.find((r: any) => r.id === val);
                    if (res) {
                      setNewVisitor({
                        ...newVisitor,
                        host_resident_id: val,
                        flat_number: res.flat_number || "",
                        wing: res.wing || "",
                      });
                    }
                  }
                }}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Select member" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Manual Entry / None</SelectItem>
                  {residents.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.full_name} ({r.wing ? `${r.wing}-` : ""}
                      {r.flat_number})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Field
              label="Visitor Name *"
              value={newVisitor.visitor_name}
              onChange={(v) => setNewVisitor({ ...newVisitor, visitor_name: v })}
            />
            <Field
              label="Mobile Number *"
              value={newVisitor.visitor_phone}
              onChange={(v) => setNewVisitor({ ...newVisitor, visitor_phone: v })}
            />
            <Field
              label="Flat Number *"
              value={newVisitor.flat_number}
              onChange={(v) => setNewVisitor({ ...newVisitor, flat_number: v })}
            />
            <Field
              label="Wing"
              value={newVisitor.wing}
              onChange={(v) => setNewVisitor({ ...newVisitor, wing: v })}
            />
            <Field
              label="Purpose of Visit"
              value={newVisitor.purpose}
              onChange={(v) => setNewVisitor({ ...newVisitor, purpose: v })}
            />
            <Field
              label="Vehicle Number"
              value={newVisitor.vehicle_number}
              onChange={(v) => setNewVisitor({ ...newVisitor, vehicle_number: v })}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdding(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createVisitor.mutate(newVisitor)}
              disabled={createVisitor.isPending}
            >
              <UserCheck className="mr-1 h-4 w-4" /> Register Visitor
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Visitor Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit Visitor Details</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div className="col-span-2">
                <ImageUpload
                  label="Visitor Photo"
                  value={editing.photo_url}
                  onChange={(url) => setEditing({ ...editing, photo_url: url })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-medium text-foreground">Visiting Member</Label>
                <Select
                  value={editing.host_resident_id || "none"}
                  onValueChange={(val) => {
                    if (val === "none") {
                      setEditing({
                        ...editing,
                        host_resident_id: null,
                      });
                    } else {
                      const res = residents.find((r: any) => r.id === val);
                      if (res) {
                        setEditing({
                          ...editing,
                          host_resident_id: val,
                          flat_number: res.flat_number || "",
                          wing: res.wing || "",
                        });
                      }
                    }
                  }}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue placeholder="Select member" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Manual Entry / None</SelectItem>
                    {residents.map((r: any) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.full_name} ({r.wing ? `${r.wing}-` : ""}
                        {r.flat_number})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Field
                label="Visitor Name *"
                value={editing.visitor_name}
                onChange={(v) => setEditing({ ...editing, visitor_name: v })}
              />
              <Field
                label="Mobile Number"
                value={editing.visitor_phone}
                onChange={(v) => setEditing({ ...editing, visitor_phone: v })}
              />
              <Field
                label="Flat Number"
                value={editing.flat_number}
                onChange={(v) => setEditing({ ...editing, flat_number: v })}
              />
              <Field
                label="Wing"
                value={editing.wing}
                onChange={(v) => setEditing({ ...editing, wing: v })}
              />
              <Field
                label="Purpose"
                value={editing.purpose}
                onChange={(v) => setEditing({ ...editing, purpose: v })}
              />
              <Field
                label="Vehicle Number"
                value={editing.vehicle_number}
                onChange={(v) => setEditing({ ...editing, vehicle_number: v })}
              />
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => saveVisitor.mutate(editing)} disabled={saveVisitor.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Visitor Record?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove this visitor entry from the logs permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && delVisitor.mutate(deletingId)}
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
}: {
  label: string;
  value?: string | null;
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Input
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl mt-1"
      />
    </div>
  );
}
