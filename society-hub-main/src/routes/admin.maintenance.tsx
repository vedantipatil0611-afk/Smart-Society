import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Search, CheckCircle2, Filter, Trash2, Edit, Receipt } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel, StatCard } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useProfileMap } from "@/lib/use-profile-map";
import { INR, monthLabel, MONTHS } from "@/lib/format";

export const Route = createFileRoute("/admin/maintenance")({
  head: () => ({
    meta: [
      { title: "Maintenance Bills — SocietyOS Admin" },
      { name: "description", content: "Generate monthly bills, track payments and dues." },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [genOpen, setGenOpen] = useState(false);
  const [addBillOpen, setAddBillOpen] = useState(false);
  const [editingBill, setEditingBill] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const now = new Date();
  const [gen, setGen] = useState({
    amount: "2500",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });

  const [singleBill, setSingleBill] = useState({
    flat_number: "",
    wing: "",
    amount: "2500",
    month: now.getMonth() + 1,
    year: now.getFullYear(),
    status: "pending",
    receipt_no: "",
    receipt_url: null as string | null,
  });

  const { data: bills } = useQuery({
    queryKey: ["admin-bills", status],
    queryFn: async () => {
      let query = supabase
        .from("maintenance_bills")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (status !== "all") query = query.eq("status", status);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: pm } = useProfileMap((bills ?? []).map((b: any) => b.resident_id).filter(Boolean));

  const rows = (bills ?? []).filter((b: any) => {
    if (!q) return true;
    const p = pm?.[b.resident_id];
    const l = q.toLowerCase();
    return (
      (p?.full_name || "").toLowerCase().includes(l) ||
      (p?.email || "").toLowerCase().includes(l) ||
      (b.flat_number || "").toLowerCase().includes(l) ||
      (b.receipt_no || "").toLowerCase().includes(l)
    );
  });

  const { data: summary } = useQuery({
    queryKey: ["admin-bills-summary"],
    queryFn: async () => {
      const { data } = await supabase.from("maintenance_bills").select("amount,status");
      let pending = 0,
        paid = 0,
        count = 0;
      (data ?? []).forEach((r: any) => {
        count++;
        if (r.status === "paid") paid += Number(r.amount);
        else pending += Number(r.amount);
      });
      return { pending, paid, count };
    },
  });

  const generateBatch = useMutation({
    mutationFn: async () => {
      const isValid = validateForm([
        {
          field: "amount",
          value: gen.amount,
          required: true,
          isNumeric: true,
          min: 1,
          label: "Amount",
        },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const { data: residents, error } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "resident");
      if (error) throw error;
      const ids = (residents ?? []).map((r: any) => r.user_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,flat_number,wing")
        .in("id", ids);

      const pmap: Record<string, any> = {};
      (profs ?? []).forEach((p: any) => {
        pmap[p.id] = p;
      });

      const insert = ids.map((id) => ({
        resident_id: id,
        flat_number: pmap[id]?.flat_number,
        wing: pmap[id]?.wing,
        amount: Number(gen.amount),
        month: Number(gen.month),
        year: Number(gen.year),
        status: "pending",
      }));

      if (!insert.length) throw new Error("No residents found to bill");

      const { error: e2 } = await supabase
        .from("maintenance_bills")
        .upsert(insert, { onConflict: "resident_id,month,year", ignoreDuplicates: true });
      if (e2) throw e2;
      return insert.length;
    },
    onSuccess: (n) => {
      toast.success(`Generated ${n} maintenance bills.`);
      qc.invalidateQueries({ queryKey: ["admin-bills"] });
      qc.invalidateQueries({ queryKey: ["admin-bills-summary"] });
      setGenOpen(false);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to generate bills.");
      }
    },
  });

  const addSingleBill = useMutation({
    mutationFn: async (b: typeof singleBill) => {
      const isValid = validateForm([
        { field: "flat_number", value: b.flat_number, required: true, label: "Flat Number" },
        {
          field: "amount",
          value: b.amount,
          required: true,
          isNumeric: true,
          min: 1,
          label: "Amount",
        },
      ]);
      if (!isValid) throw new Error("Validation failed");

      // Find resident for flat if any to prevent foreign key constraint violations
      let query = supabase.from("profiles").select("id").eq("flat_number", b.flat_number);

      if (b.wing) {
        query = query.eq("wing", b.wing);
      } else {
        query = query.is("wing", null);
      }

      const { data: prof } = await query.maybeSingle();
      const residentId = prof?.id || null;

      const { error } = await supabase.from("maintenance_bills").insert([
        {
          resident_id: residentId,
          flat_number: b.flat_number,
          wing: b.wing || null,
          amount: Number(b.amount),
          month: Number(b.month),
          year: Number(b.year),
          status: b.status,
          receipt_no: b.status === "paid" ? `RC-${Date.now()}` : null,
          paid_at: b.status === "paid" ? new Date().toISOString() : null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Maintenance bill created.");
      qc.invalidateQueries({ queryKey: ["admin-bills"] });
      qc.invalidateQueries({ queryKey: ["admin-bills-summary"] });
      setAddBillOpen(false);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to add bill.");
      }
    },
  });

  const updateBill = useMutation({
    mutationFn: async (b: any) => {
      const isValid = validateForm([
        {
          field: "amount",
          value: b.amount,
          required: true,
          isNumeric: true,
          min: 1,
          label: "Amount",
        },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const patch: any = {
        amount: Number(b.amount),
        flat_number: b.flat_number,
        wing: b.wing,
        status: b.status,
      };
      if (b.status === "paid" && !b.paid_at) {
        patch.paid_at = new Date().toISOString();
        patch.receipt_no = b.receipt_no || `RC-${Date.now()}`;
      }

      const { error } = await supabase.from("maintenance_bills").update(patch).eq("id", b.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bill updated successfully.");
      qc.invalidateQueries({ queryKey: ["admin-bills"] });
      qc.invalidateQueries({ queryKey: ["admin-bills-summary"] });
      setEditingBill(null);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to update bill.");
      }
    },
  });

  const markPaid = useMutation({
    mutationFn: async (id: string) => {
      const receiptNo = `RC-${Date.now()}`;
      const { error } = await supabase
        .from("maintenance_bills")
        .update({ status: "paid", paid_at: new Date().toISOString(), receipt_no: receiptNo })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Marked bill as paid.");
      qc.invalidateQueries({ queryKey: ["admin-bills"] });
      qc.invalidateQueries({ queryKey: ["admin-bills-summary"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to mark bill as paid."),
  });

  const delBill = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("maintenance_bills").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Bill record deleted.");
      qc.invalidateQueries({ queryKey: ["admin-bills"] });
      qc.invalidateQueries({ queryKey: ["admin-bills-summary"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete bill.");
      setDeletingId(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Maintenance Management"
        description="Monthly maintenance billing, collection tracking, and receipts."
        action={
          <div className="flex gap-2">
            <Button variant="outline" className="rounded-full" onClick={() => setAddBillOpen(true)}>
              <Plus className="mr-1 h-4 w-4" /> Add Bill
            </Button>
            <Button className="rounded-full shadow-sm" onClick={() => setGenOpen(true)}>
              <Receipt className="mr-1 h-4 w-4" /> Batch Generate
            </Button>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-3">
        <StatCard label="Bills Issued" value={summary?.count ?? "—"} />
        <StatCard
          label="Total Collected"
          value={INR.format(summary?.paid ?? 0)}
          hint="All time paid"
        />
        <StatCard label="Pending Dues" value={INR.format(summary?.pending ?? 0)} />
      </div>

      <div className="mb-3 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search resident, flat, or receipt #"
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
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Panel title="Maintenance Bills">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Resident</TableHead>
                <TableHead>Wing</TableHead>
                <TableHead>Flat No.</TableHead>
                <TableHead>Billing Month</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Paid Details</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((b: any) => {
                const p = pm?.[b.resident_id];
                return (
                  <TableRow key={b.id}>
                    <TableCell>
                      <div className="font-medium">
                        {p?.full_name || "Unknown Resident"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p?.email || ""}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
                        {b.wing || p?.wing || "—"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center rounded-full bg-accent px-2 py-0.5 text-xs font-semibold">
                        {b.flat_number || p?.flat_number || "—"}
                      </span>
                    </TableCell>
                    <TableCell>{monthLabel(b.month, b.year)}</TableCell>
                    <TableCell className="font-semibold">{INR.format(b.amount)}</TableCell>
                    <TableCell>
                      <Badge
                        variant={b.status === "paid" ? "default" : "secondary"}
                        className="rounded-full capitalize"
                      >
                        {b.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {b.paid_at ? new Date(b.paid_at).toLocaleDateString() : "Not paid"}
                      {b.receipt_no && <div className="font-mono text-primary">{b.receipt_no}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {b.status !== "paid" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            title="Mark Paid"
                            onClick={() => markPaid.mutate(b.id)}
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" onClick={() => setEditingBill(b)}>
                          <Edit className="h-4 w-4 text-muted-foreground" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setDeletingId(b.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {!rows.length && (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No maintenance bills found.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Panel>

      {/* Batch Generate Dialog */}
      <Dialog open={genOpen} onOpenChange={(o) => !o && setGenOpen(false)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Generate Monthly Maintenance Bills</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 py-2">
            <div>
              <Label className="text-xs font-medium">Monthly Amount (₹) *</Label>
              <Input
                type="number"
                value={gen.amount}
                onChange={(e) => setGen({ ...gen, amount: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs font-medium">Month</Label>
                <Select
                  value={String(gen.month)}
                  onValueChange={(v) => setGen({ ...gen, month: Number(v) })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTHS.map((m, idx) => (
                      <SelectItem key={m} value={String(idx + 1)}>
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs font-medium">Year</Label>
                <Input
                  type="number"
                  value={gen.year}
                  onChange={(e) => setGen({ ...gen, year: Number(e.target.value) })}
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGenOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => generateBatch.mutate()} disabled={generateBatch.isPending}>
              Generate All Bills
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Single Bill Dialog */}
      <Dialog open={addBillOpen} onOpenChange={(o) => !o && setAddBillOpen(false)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Individual Maintenance Bill</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-3 py-2">
            <div>
              <Label className="text-xs font-medium">Flat Number *</Label>
              <Input
                value={singleBill.flat_number}
                onChange={(e) => setSingleBill({ ...singleBill, flat_number: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Wing</Label>
              <Input
                value={singleBill.wing}
                onChange={(e) => setSingleBill({ ...singleBill, wing: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Amount (₹) *</Label>
              <Input
                type="number"
                value={singleBill.amount}
                onChange={(e) => setSingleBill({ ...singleBill, amount: e.target.value })}
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Status</Label>
              <Select
                value={singleBill.status}
                onValueChange={(v) => setSingleBill({ ...singleBill, status: v })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddBillOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => addSingleBill.mutate(singleBill)}
              disabled={addSingleBill.isPending}
            >
              Save Bill
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Bill Dialog */}
      <Dialog open={!!editingBill} onOpenChange={(o) => !o && setEditingBill(null)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Maintenance Bill</DialogTitle>
          </DialogHeader>
          {editingBill && (
            <div className="grid grid-cols-2 gap-3 py-2">
              <div>
                <Label className="text-xs font-medium">Amount (₹) *</Label>
                <Input
                  type="number"
                  value={editingBill.amount}
                  onChange={(e) => setEditingBill({ ...editingBill, amount: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Status</Label>
                <Select
                  value={editingBill.status}
                  onValueChange={(v) => setEditingBill({ ...editingBill, status: v })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingBill(null)}>
              Cancel
            </Button>
            <Button onClick={() => updateBill.mutate(editingBill)} disabled={updateBill.isPending}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Maintenance Bill?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete this bill entry. It cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && delBill.mutate(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
