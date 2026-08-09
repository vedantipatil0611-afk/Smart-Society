import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Trash2, Edit, Filter } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useProfileMap } from "@/lib/use-profile-map";
import { formatDistanceToNow } from "date-fns";
import { ComplaintDetail } from "@/components/ComplaintDetail";

export const Route = createFileRoute("/admin/complaints")({
  head: () => ({
    meta: [
      { title: "Complaints — SocietyOS Admin" },
      { name: "description", content: "Triage and resolve complaints raised by residents." },
    ],
  }),
  component: Page,
});

const STATUSES = ["open", "in_progress", "resolved", "closed"];
const PRIORITIES = ["low", "medium", "high", "urgent"];

function Page() {
  const qc = useQueryClient();
  const [status, setStatus] = useState("all");
  const [priority, setPriority] = useState("all");
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-complaints", status, priority],
    queryFn: async () => {
      let query = supabase.from("complaints").select("*").order("created_at", { ascending: false });
      if (status !== "all") query = query.eq("status", status);
      if (priority !== "all") query = query.eq("priority", priority);
      const { data } = await query;
      return data ?? [];
    },
  });

  const { data: pm } = useProfileMap((data ?? []).map((c: any) => c.resident_id));

  const complaints = (data ?? []).filter((c: any) => {
    if (!q) return true;
    const l = q.toLowerCase();
    const p = pm?.[c.resident_id];
    return (
      c.title?.toLowerCase().includes(l) ||
      c.description?.toLowerCase().includes(l) ||
      c.category?.toLowerCase().includes(l) ||
      p?.full_name?.toLowerCase().includes(l) ||
      p?.flat_number?.toLowerCase().includes(l)
    );
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.from("complaints").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint status updated.");
      qc.invalidateQueries({ queryKey: ["admin-complaints"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to update complaint."),
  });

  const delComplaint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("complaints").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint deleted.");
      qc.invalidateQueries({ queryKey: ["admin-complaints"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete complaint.");
      setDeletingId(null);
    },
  });

  const priColor: Record<string, string> = {
    low: "bg-muted text-foreground",
    medium: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300",
    high: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300",
    urgent: "bg-destructive text-destructive-foreground",
  };
  const statusColor: Record<string, string> = {
    open: "bg-orange-100 text-orange-900 dark:bg-orange-900/40 dark:text-orange-300",
    in_progress: "bg-blue-100 text-blue-900 dark:bg-blue-900/40 dark:text-blue-300",
    resolved: "bg-emerald-100 text-emerald-900 dark:bg-emerald-900/40 dark:text-emerald-300",
    closed: "bg-muted text-muted-foreground",
  };

  return (
    <>
      <PageHeader
        title="Complaints Management"
        description="Track and resolve resident complaints across all categories."
        action={
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search complaints..."
                className="w-56 rounded-full pl-9"
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-36 rounded-full">
                <Filter className="mr-1 h-4 w-4" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s.replace("_", " ")}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-36 rounded-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
                {PRIORITIES.map((s) => (
                  <SelectItem key={s} value={s} className="capitalize">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      <div className="grid gap-3">
        {complaints.map((c: any) => (
          <Panel
            key={c.id}
            title={c.title}
            action={
              <div className="flex items-center gap-2">
                <Badge className={`rounded-full capitalize ${priColor[c.priority] ?? ""}`}>
                  {c.priority}
                </Badge>
                <Select
                  value={c.status}
                  onValueChange={(v) => updateStatus.mutate({ id: c.id, s: v })}
                >
                  <SelectTrigger
                    className={`w-36 rounded-full capitalize ${statusColor[c.status] ?? ""}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s} className="capitalize">
                        {s.replace("_", " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-full"
                  onClick={() => setSelected(c.id)}
                >
                  Details
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDeletingId(c.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            }
          >
            <div className="text-xs text-muted-foreground mb-2">
              By {pm?.[c.resident_id]?.full_name || "Resident"} (Flat{" "}
              {pm?.[c.resident_id]?.flat_number || "—"}) · Category:{" "}
              <span className="font-medium text-foreground capitalize">{c.category}</span> ·{" "}
              {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
            </div>
            <p className="text-sm line-clamp-2 text-foreground/90">{c.description}</p>
            {c.images?.length ? (
              <div className="mt-2 flex gap-2 overflow-x-auto">
                {c.images.map((img: string, idx: number) => (
                  <img
                    key={idx}
                    src={img}
                    alt="Attachment"
                    className="h-16 w-16 object-cover rounded-lg border"
                  />
                ))}
              </div>
            ) : null}
          </Panel>
        ))}
        {!complaints.length && (
          <Panel title="No Complaints Found">
            <p className="text-sm text-muted-foreground">No complaints match your criteria.</p>
          </Panel>
        )}
      </div>

      <ComplaintDetail id={selected} onClose={() => setSelected(null)} />

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Complaint?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will permanently delete this complaint and its comment history.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deletingId && delComplaint.mutate(deletingId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
