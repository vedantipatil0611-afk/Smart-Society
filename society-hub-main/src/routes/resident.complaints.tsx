import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
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
import { ComplaintDetail } from "@/components/ComplaintDetail";
import { formatDistanceToNow } from "date-fns";

const CATEGORIES = [
  "plumbing",
  "electrical",
  "housekeeping",
  "security",
  "parking",
  "elevator",
  "other",
];
const PRIORITIES = ["low", "medium", "high", "urgent"];

export const Route = createFileRoute("/resident/complaints")({
  head: () => ({
    meta: [
      { title: "My complaints — SocietyOS" },
      {
        name: "description",
        content: "Raise complaints and track resolution with photos and comments.",
      },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "plumbing",
    priority: "medium",
  });
  const [files, setFiles] = useState<File[]>([]);

  const { data } = useQuery({
    queryKey: ["my-complaints", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (
        await supabase
          .from("complaints")
          .select("*")
          .eq("resident_id", user!.id)
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const submit = useMutation({
    mutationFn: async () => {
      const paths: string[] = [];
      for (const f of files) {
        const p = `${user!.id}/${Date.now()}-${f.name}`;
        const { error } = await supabase.storage.from("complaint-images").upload(p, f);
        if (error) throw error;
        paths.push(p);
      }
      const { error } = await supabase
        .from("complaints")
        .insert({ ...form, resident_id: user!.id, images: paths });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Complaint raised");
      setOpen(false);
      setForm({ title: "", description: "", category: "plumbing", priority: "medium" });
      setFiles([]);
      qc.invalidateQueries({ queryKey: ["my-complaints", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader
        title="Complaints"
        description="Track everything you've reported."
        action={
          <Button className="rounded-full" onClick={() => setOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Raise complaint
          </Button>
        }
      />
      <div className="grid gap-3">
        {(data ?? []).map((c: any) => (
          <Panel
            key={c.id}
            title={c.title}
            action={
              <Button variant="ghost" size="sm" onClick={() => setSelected(c.id)}>
                Open
              </Button>
            }
          >
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="secondary" className="rounded-full">
                {c.category}
              </Badge>
              <Badge variant="secondary" className="rounded-full">
                {c.priority}
              </Badge>
              <Badge className="rounded-full">{c.status}</Badge>
              <span className="text-muted-foreground">
                {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{c.description}</p>
          </Panel>
        ))}
        {!data?.length && (
          <Panel title="No complaints">
            <p className="text-sm text-muted-foreground">Raise one whenever you need help.</p>
          </Panel>
        )}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Raise a complaint</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label className="text-xs">Title</Label>
              <Input
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Priority</Label>
                <Select
                  value={form.priority}
                  onValueChange={(v) => setForm({ ...form, priority: v })}
                >
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label className="text-xs">Description</Label>
              <Textarea
                rows={4}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="rounded-xl"
              />
            </div>
            <div>
              <Label className="text-xs">Photos</Label>
              <Input
                type="file"
                multiple
                accept="image/*"
                onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                className="rounded-xl"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => submit.mutate()}
              disabled={!form.title || !form.description || submit.isPending}
            >
              Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ComplaintDetail id={selected} onClose={() => setSelected(null)} />
    </>
  );
}
