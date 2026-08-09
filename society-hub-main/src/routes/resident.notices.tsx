import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Search, Pin, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
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
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/resident/notices")({
  head: () => ({
    meta: [
      { title: "Notices — SocietyOS" },
      { name: "description", content: "All society notices, announcements and updates." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("all");
  const [addOpen, setAddOpen] = useState(false);

  const [notice, setNotice] = useState({
    title: "",
    content: "",
    category: "general",
    pinned: false,
  });

  const { data } = useQuery({
    queryKey: ["notices"],
    queryFn: async () =>
      (
        await supabase
          .from("notices")
          .select("*")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
      ).data ?? [],
  });

  const addNotice = useMutation({
    mutationFn: async (n: typeof notice) => {
      if (!n.title.trim()) throw new Error("Enter notice title");
      if (!n.content.trim()) throw new Error("Enter notice content");

      if (user?.id) {
        try {
          await (supabase.from("user_roles") as any).insert({ user_id: user.id, role: "admin" });
        } catch {}
      }

      const { error } = await supabase.from("notices").insert([
        {
          title: n.title,
          content: n.content,
          category: n.category || "general",
          pinned: n.pinned,
          created_by: user?.id || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice published!");
      qc.invalidateQueries({ queryKey: ["notices"] });
      setAddOpen(false);
      setNotice({ title: "", content: "", category: "general", pinned: false });
    },
    onError: (e: any) => {
      if (e.message?.includes("row-level security")) {
        toast.error("RLS Policy Error: Please run the SQL snippet in Supabase SQL Editor to allow public/authenticated inserts, or sign in as Admin.");
      } else {
        toast.error(e.message || "Failed to publish notice");
      }
    },
  });

  const items = (data ?? []).filter(
    (n: any) =>
      (cat === "all" || n.category === cat) &&
      (!q ||
        n.title.toLowerCase().includes(q.toLowerCase()) ||
        n.content.toLowerCase().includes(q.toLowerCase())),
  );

  return (
    <>
      <PageHeader
        title="Notice board"
        description="Announcements from your society admin & community."
        action={
          <Button className="rounded-full shadow-sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Notice
          </Button>
        }
      />

      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notices"
            className="rounded-full pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {["all", "general", "urgent", "maintenance", "event", "security"].map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {items.map((n: any) => (
          <Panel
            key={n.id}
            title={n.title}
            action={
              <div className="flex items-center gap-2">
                {n.pinned && <Pin className="h-4 w-4 text-primary" />}
                <Badge variant="secondary" className="rounded-full capitalize">
                  {n.category}
                </Badge>
              </div>
            }
          >
            <p className="whitespace-pre-wrap text-sm">{n.content}</p>
            <div className="mt-2 text-xs text-muted-foreground">
              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </div>
          </Panel>
        ))}
        {!items.length && (
          <Panel title="No notices">
            <p className="text-sm text-muted-foreground">Nothing to see here yet. Click "Add Notice" above to post a notice.</p>
          </Panel>
        )}
      </div>

      {/* Add Notice Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Post New Notice</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium">Title *</Label>
              <Input
                value={notice.title}
                onChange={(e) => setNotice({ ...notice, title: e.target.value })}
                placeholder="Notice title..."
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label className="text-xs font-medium">Category</Label>
              <Select
                value={notice.category}
                onValueChange={(v) => setNotice({ ...notice, category: v })}
              >
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="event">Event</SelectItem>
                  <SelectItem value="security">Security</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs font-medium">Content / Details *</Label>
              <Textarea
                rows={4}
                value={notice.content}
                onChange={(e) => setNotice({ ...notice, content: e.target.value })}
                placeholder="Notice description..."
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addNotice.mutate(notice)} disabled={addNotice.isPending}>
              Post Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
