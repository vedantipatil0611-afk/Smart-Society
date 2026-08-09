import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";

export const Route = createFileRoute("/resident/facilities")({
  head: () => ({
    meta: [
      { title: "Book facilities — SocietyOS" },
      { name: "description", content: "Reserve clubhouse, gym, pool and other shared amenities." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    facility_id: "",
    start_time: "",
    end_time: "",
    notes: "",
  });

  const { data: facilities } = useQuery({
    queryKey: ["facilities"],
    queryFn: async () =>
      (await supabase.from("facilities").select("*").eq("active", true).order("name")).data ?? [],
  });

  const { data: bookings } = useQuery({
    queryKey: ["my-bookings", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("facility_bookings")
          .select("*")
          .eq("resident_id", user!.id)
          .order("start_time", { ascending: false })
      ).data ?? [],
  });
  const fmap: Record<string, any> = {};
  (facilities ?? []).forEach((f: any) => {
    fmap[f.id] = f;
  });

  const book = useMutation({
    mutationFn: async () => {
      if (!form.facility_id || !form.start_time || !form.end_time)
        throw new Error("Fill all fields");
      const { error } = await supabase.from("facility_bookings").insert({
        resident_id: user!.id,
        facility_id: form.facility_id,
        start_time: new Date(form.start_time).toISOString(),
        end_time: new Date(form.end_time).toISOString(),
        notes: form.notes,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Booking requested");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-bookings", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const cancel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("facility_bookings")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-bookings", user?.id] }),
  });

  return (
    <>
      <PageHeader
        title="Book facilities"
        description="Reserve shared spaces in advance."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> New booking
          </Button>
        }
      />
      <div className="mb-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(facilities ?? []).map((f: any) => (
          <Panel key={f.id} title={f.name}>
            {f.description && <p className="text-sm text-muted-foreground">{f.description}</p>}
            {f.capacity && <div className="mt-2 text-xs">Capacity: {f.capacity}</div>}
          </Panel>
        ))}
      </div>
      <Panel title="Your bookings">
        <ul className="divide-y">
          {(bookings ?? []).map((b: any) => (
            <li key={b.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <div>
                <div className="font-medium">{fmap[b.facility_id]?.name || "Facility"}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(b.start_time), "MMM d, HH:mm")} →{" "}
                  {format(new Date(b.end_time), "HH:mm")}
                </div>
                {b.notes && <div className="text-xs text-muted-foreground">{b.notes}</div>}
              </div>
              <div className="flex items-center gap-2">
                <Badge className="rounded-full">{b.status}</Badge>
                {b.status === "pending" && (
                  <Button size="sm" variant="ghost" onClick={() => cancel.mutate(b.id)}>
                    Cancel
                  </Button>
                )}
              </div>
            </li>
          ))}
          {!bookings?.length && (
            <li className="py-6 text-center text-sm text-muted-foreground">No bookings yet.</li>
          )}
        </ul>
      </Panel>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>New booking</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Facility</Label>
              <Select
                value={form.facility_id}
                onValueChange={(v) => setForm({ ...form, facility_id: v })}
              >
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {(facilities ?? []).map((f: any) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">From</Label>
                <Input
                  type="datetime-local"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">To</Label>
                <Input
                  type="datetime-local"
                  value={form.end_time}
                  onChange={(e) => setForm({ ...form, end_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs">Notes</Label>
              <Textarea
                rows={3}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => book.mutate()} disabled={book.isPending}>
              Request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
