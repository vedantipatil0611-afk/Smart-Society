import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Plus, Check, X, Trash2, Search, Filter, Building2 } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { validateForm } from "@/lib/form-validation";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
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
import { useProfileMap } from "@/lib/use-profile-map";
import { format } from "date-fns";

export const Route = createFileRoute("/admin/facilities")({
  head: () => ({
    meta: [
      { title: "Facility Bookings — SocietyOS Admin" },
      {
        name: "description",
        content: "Manage facilities and approve or reject resident booking requests.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [addFacOpen, setAddFacOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newFac, setNewFac] = useState({
    name: "",
    capacity: "50",
    description: "",
    active: true,
  });

  const { data: fac } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () => (await supabase.from("facilities").select("*").order("name")).data ?? [],
  });

  const { data: bookings } = useQuery({
    queryKey: ["admin-bookings", status],
    queryFn: async () => {
      let query = supabase
        .from("facility_bookings")
        .select("*")
        .order("start_time", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      return (await query).data ?? [];
    },
  });

  const { data: pm } = useProfileMap(
    (bookings ?? []).map((b: any) => b.resident_id).filter(Boolean),
  );
  const fmap: Record<string, any> = {};
  (fac ?? []).forEach((f: any) => {
    fmap[f.id] = f;
  });

  const filteredBookings = (bookings ?? []).filter((b: any) => {
    if (!q) return true;
    const l = q.toLowerCase();
    const p = pm?.[b.resident_id];
    const fName = fmap[b.facility_id]?.name || "";
    return (
      fName.toLowerCase().includes(l) ||
      (p?.full_name || "").toLowerCase().includes(l) ||
      (b.notes || "").toLowerCase().includes(l)
    );
  });

  const setStat = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.from("facility_bookings").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking status updated.");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update booking."),
  });

  const addFacility = useMutation({
    mutationFn: async (f: typeof newFac) => {
      const isValid = validateForm([
        { field: "name", value: f.name, required: true, label: "Facility Name" },
        { field: "capacity", value: f.capacity, isNumeric: true, min: 1, label: "Capacity" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const { error } = await supabase.from("facilities").insert([
        {
          name: f.name,
          capacity: Number(f.capacity),
          description: f.description || null,
          active: f.active,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("New facility added.");
      qc.invalidateQueries({ queryKey: ["facilities"] });
      setAddFacOpen(false);
      setNewFac({ name: "", capacity: "50", description: "", active: true });
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to add facility.");
      }
    },
  });

  const delBooking = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("facility_bookings").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking deleted.");
      qc.invalidateQueries({ queryKey: ["admin-bookings"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete booking.");
      setDeletingId(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Facility Bookings"
        description="Manage shared society amenities and review resident booking requests."
        action={
          <div className="flex gap-2">
            <Button onClick={() => setAddFacOpen(true)} className="rounded-full shadow-sm">
              <Building2 className="mr-1 h-4 w-4" /> Add Facility
            </Button>
          </div>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by resident name, facility..."
            className="rounded-full pl-9"
          />
        </div>
        <Select value={status} onValueChange={setStatus}>
          <SelectTrigger className="w-40 rounded-full">
            <Filter className="mr-1 h-4 w-4" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel title="Facility Booking Requests">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Facility</TableHead>
                <TableHead>Time Slot</TableHead>
                <TableHead>Notes</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredBookings.map((b: any) => (
                <TableRow key={b.id}>
                  <TableCell>
                    <div className="font-medium">
                      {pm?.[b.resident_id]?.full_name || "Resident"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {pm?.[b.resident_id]?.email ||
                        `Flat ${pm?.[b.resident_id]?.flat_number || ""}`}
                    </div>
                  </TableCell>
                  <TableCell className="font-semibold text-primary">
                    {fmap[b.facility_id]?.name || "Facility"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {format(new Date(b.start_time), "MMM d, HH:mm")} →{" "}
                    {format(new Date(b.end_time), "HH:mm")}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground max-w-xs truncate">
                    {b.notes || "—"}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        b.status === "approved"
                          ? "default"
                          : b.status === "rejected"
                            ? "destructive"
                            : "secondary"
                      }
                      className="rounded-full capitalize"
                    >
                      {b.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      {b.status === "pending" && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Approve"
                            onClick={() => setStat.mutate({ id: b.id, s: "approved" })}
                          >
                            <Check className="h-4 w-4 text-emerald-600" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Reject"
                            onClick={() => setStat.mutate({ id: b.id, s: "rejected" })}
                          >
                            <X className="h-4 w-4 text-destructive" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => setDeletingId(b.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {!filteredBookings.length && (
                <TableRow>
                  <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                    No facility booking requests found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Add Facility Dialog */}
      <Dialog open={addFacOpen} onOpenChange={(o) => !o && setAddFacOpen(false)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Society Facility</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs font-medium">Facility Name *</Label>
              <Input
                value={newFac.name}
                placeholder="e.g. Clubhouse, Tennis Court, Swimming Pool"
                onChange={(e) => setNewFac({ ...newFac, name: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Max Capacity *</Label>
              <Input
                type="number"
                value={newFac.capacity}
                onChange={(e) => setNewFac({ ...newFac, capacity: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Description</Label>
              <Input
                value={newFac.description}
                placeholder="Operational hours or usage rules"
                onChange={(e) => setNewFac({ ...newFac, description: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddFacOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addFacility.mutate(newFac)} disabled={addFacility.isPending}>
              Save Facility
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Facility Booking?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete this booking record permanently.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && delBooking.mutate(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
