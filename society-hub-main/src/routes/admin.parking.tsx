import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Car, Search, Filter } from "lucide-react";
import { AppShell, PageHeader, Panel, StatCard } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
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

export const Route = createFileRoute("/admin/parking")({
  head: () => ({
    meta: [
      { title: "Parking Slots — SocietyOS Admin" },
      { name: "description", content: "Assign, track and audit society parking slots." },
    ],
  }),
  component: Page,
});

const sb = supabase as any;
const VEHICLE_TYPES = ["car", "bike", "scooter", "ev", "other"];
const STATUSES = ["available", "assigned", "reserved", "blocked"];

function emptyForm() {
  return {
    id: undefined as string | undefined,
    slot_number: "",
    vehicle_type: "car",
    status: "available",
    vehicle_number: "",
    owner_name: "",
    flat_number: "",
    wing: "",
    notes: "",
    owner_id: null as string | null,
  };
}

function Page() {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data: slots = [] } = useQuery({
    queryKey: ["parking", search, statusFilter],
    queryFn: async () => {
      let q = sb.from("parking_slots").select("*").order("slot_number");
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search) {
        q = q.or(
          `slot_number.ilike.%${search}%,vehicle_number.ilike.%${search}%,owner_name.ilike.%${search}%,flat_number.ilike.%${search}%`,
        );
      }
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const { data: residents = [] } = useQuery({
    queryKey: ["residents-min"],
    queryFn: async () =>
      (await supabase.from("profiles").select("id,full_name,flat_number,wing").order("full_name"))
        .data ?? [],
  });

  const save = useMutation({
    mutationFn: async (values: typeof form) => {
      const isValid = validateForm([
        { field: "slot_number", value: values.slot_number, required: true, label: "Slot Number" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const payload = {
        slot_number: values.slot_number,
        vehicle_type: values.vehicle_type || "car",
        status: values.status || "available",
        vehicle_number: values.vehicle_number || null,
        owner_name: values.owner_name || null,
        flat_number: values.flat_number || null,
        wing: values.wing || null,
        notes: values.notes || null,
        owner_id: values.owner_id || null,
      };

      if (values.id) {
        const { error } = await sb.from("parking_slots").update(payload).eq("id", values.id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("parking_slots").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Parking slot saved.");
      setOpen(false);
      setForm(emptyForm());
      qc.invalidateQueries({ queryKey: ["parking"] });
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to save slot.");
      }
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await sb.from("parking_slots").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Parking slot deleted.");
      qc.invalidateQueries({ queryKey: ["parking"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete slot.");
      setDeletingId(null);
    },
  });

  const total = slots.length;
  const assigned = slots.filter(
    (s: any) => s.status === "assigned" || s.status === "occupied",
  ).length;
  const available = slots.filter((s: any) => s.status === "available").length;
  const occupancy = total ? Math.round((assigned / total) * 100) : 0;

  return (
    <>
      <PageHeader
        title="Parking Management"
        description="Slot allocation, vehicle records, and parking occupancy."
        action={
          <Button
            className="rounded-full shadow-sm"
            onClick={() => {
              setForm(emptyForm());
              setOpen(true);
            }}
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Parking Slot
          </Button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Slots" value={total} Icon={Car} />
        <StatCard label="Assigned / Occupied" value={assigned} hint={`${occupancy}% occupancy`} />
        <StatCard label="Available" value={available} />
        <StatCard
          label="Reserved / Blocked"
          value={slots.filter((s: any) => s.status === "reserved" || s.status === "blocked").length}
        />
      </div>

      <Panel
        title="Parking Slots"
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search slot, vehicle, flat..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-full pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 rounded-full">
                <Filter className="mr-1 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
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
                <TableHead>Slot #</TableHead>
                <TableHead>Vehicle Type</TableHead>
                <TableHead>Vehicle #</TableHead>
                <TableHead>Owner Name</TableHead>
                <TableHead>Flat</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {slots.map((s: any) => (
                <TableRow key={s.id}>
                  <TableCell className="font-semibold text-primary">{s.slot_number}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="rounded-full capitalize">
                      {s.vehicle_type}
                    </Badge>
                  </TableCell>
                  <TableCell>{s.vehicle_number || "—"}</TableCell>
                  <TableCell>{s.owner_name || "—"}</TableCell>
                  <TableCell>{[s.wing, s.flat_number].filter(Boolean).join("-") || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      className="rounded-full capitalize"
                      variant={s.status === "available" ? "outline" : "default"}
                    >
                      {s.status}
                    </Badge>
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
                      <Pencil className="h-4 w-4 text-muted-foreground" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => setDeletingId(s.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {!slots.length && (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
                    No parking slots found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Add/Edit Slot Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Edit Parking Slot" : "Add Parking Slot"}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs font-medium">Slot Number *</Label>
              <Input
                value={form.slot_number}
                onChange={(e) => setForm({ ...form, slot_number: e.target.value })}
                placeholder="e.g. B1-102"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Vehicle Type</Label>
              <Select
                value={form.vehicle_type}
                onValueChange={(v) => setForm({ ...form, vehicle_type: v })}
              >
                <SelectTrigger className="rounded-xl mt-1 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VEHICLE_TYPES.map((v) => (
                    <SelectItem key={v} value={v} className="capitalize">
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="rounded-xl mt-1 capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Vehicle Number</Label>
              <Input
                value={form.vehicle_number ?? ""}
                placeholder="e.g. MH12AB1234"
                onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium">Assign to Resident Profile</Label>
              <Select
                value={form.owner_id ?? "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    setForm({ ...form, owner_id: null });
                    return;
                  }
                  const r = residents.find((r: any) => r.id === v);
                  setForm({
                    ...form,
                    owner_id: v,
                    owner_name: r?.full_name ?? "",
                    flat_number: r?.flat_number ?? form.flat_number,
                    wing: r?.wing ?? form.wing,
                  });
                }}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue placeholder="Select Resident" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned / None —</SelectItem>
                  {residents.map((r: any) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.full_name || r.id}{" "}
                      {r.flat_number ? `(${r.wing || ""}-${r.flat_number})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Owner Name</Label>
              <Input
                value={form.owner_name ?? ""}
                onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Flat Number</Label>
              <Input
                value={form.flat_number ?? ""}
                onChange={(e) => setForm({ ...form, flat_number: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Wing</Label>
              <Input
                value={form.wing ?? ""}
                onChange={(e) => setForm({ ...form, wing: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="col-span-2">
              <Label className="text-xs font-medium">Notes</Label>
              <Input
                value={form.notes ?? ""}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(form)} disabled={save.isPending}>
              Save Slot
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Parking Slot?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete this parking slot record permanently.
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
