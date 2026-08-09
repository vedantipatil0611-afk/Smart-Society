import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Check, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { ImageUpload } from "@/components/ui/image-upload";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { format } from "date-fns";

export const Route = createFileRoute("/resident/visitors")({
  head: () => ({
    meta: [
      { title: "My visitors — SocietyOS" },
      { name: "description", content: "Pre-approve expected visitors and see who's at your door." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({
    visitor_name: "",
    visitor_phone: "",
    visitor_type: "guest",
    purpose: "",
    vehicle_number: "",
    expected_time: "",
    photo_url: null as string | null,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });

  const { data: visitors } = useQuery({
    queryKey: ["my-visitors", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("visitors")
          .select("*")
          .eq("host_resident_id", user!.id)
          .order("created_at", { ascending: false })
          .limit(50)
      ).data ?? [],
  });

  const preApprove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("visitors").insert({
        ...form,
        host_resident_id: user!.id,
        flat_number: profile?.flat_number,
        wing: profile?.wing,
        status: "approved",
        expected_time: form.expected_time ? new Date(form.expected_time).toISOString() : null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor pre-approved");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["my-visitors", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async ({ id, s }: { id: string; s: string }) => {
      const { error } = await supabase.from("visitors").update({ status: s }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["my-visitors", user?.id] }),
  });

  return (
    <>
      <PageHeader
        title="Visitors"
        description="Approvals, expected guests and history."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Pre-approve visitor
          </Button>
        }
      />

      <div className="grid gap-3">
        {(visitors ?? []).map((v: any) => (
          <Panel
            key={v.id}
            title={
              <div className="flex items-center gap-3">
                {v.photo_url && (
                  <img src={v.photo_url} alt="" className="h-8 w-8 rounded-full object-cover" />
                )}
                <span>{v.visitor_name}</span>
              </div>
            }
            action={
              v.status === "pending" ? (
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => decide.mutate({ id: v.id, s: "approved" })}
                  >
                    <Check className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => decide.mutate({ id: v.id, s: "denied" })}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Badge className="rounded-full">{v.status}</Badge>
              )
            }
          >
            <div className="text-xs text-muted-foreground">
              {v.visitor_type} · {v.visitor_phone || "—"}{" "}
              {v.vehicle_number ? `· 🚗 ${v.vehicle_number}` : ""}
              {v.expected_time && ` · expected ${format(new Date(v.expected_time), "MMM d HH:mm")}`}
              {v.entry_time && ` · in ${format(new Date(v.entry_time), "MMM d HH:mm")}`}
              {v.exit_time && ` · out ${format(new Date(v.exit_time), "HH:mm")}`}
            </div>
            {v.purpose && <p className="mt-2 text-sm">{v.purpose}</p>}
          </Panel>
        ))}
        {!visitors?.length && (
          <Panel title="No visitors yet">
            <p className="text-sm text-muted-foreground">
              Pre-approve someone so security lets them in quickly.
            </p>
          </Panel>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Pre-approve visitor</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="col-span-2">
              <ImageUpload
                label="Visitor Photo"
                value={form.photo_url}
                onChange={(url) => setForm({ ...form, photo_url: url })}
              />
            </div>
            <div>
              <Label className="text-xs">Name</Label>
              <Input
                value={form.visitor_name}
                onChange={(e) => setForm({ ...form, visitor_name: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Phone</Label>
                <Input
                  value={form.visitor_phone}
                  onChange={(e) => setForm({ ...form, visitor_phone: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Type</Label>
                <Select
                  value={form.visitor_type}
                  onValueChange={(v) => setForm({ ...form, visitor_type: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["guest", "delivery", "cab", "service", "other"].map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Purpose</Label>
              <Input
                value={form.purpose}
                onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Vehicle no.</Label>
                <Input
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <div>
                <Label className="text-xs">Expected at</Label>
                <Input
                  type="datetime-local"
                  value={form.expected_time}
                  onChange={(e) => setForm({ ...form, expected_time: e.target.value })}
                  className="rounded-xl"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => preApprove.mutate()}
              disabled={!form.visitor_name || preApprove.isPending}
            >
              Pre-approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
