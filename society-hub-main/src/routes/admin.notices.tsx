import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Pin, Trash2, Plus, Search, PinOff, Edit } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { ImageUpload } from "@/components/ui/image-upload";
import { validateForm } from "@/lib/form-validation";
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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/notices")({
  head: () => ({
    meta: [
      { title: "Notices — SocietyOS Admin" },
      { name: "description", content: "Publish, pin, edit and remove society-wide notices." },
    ],
  }),
  component: Page,
});

const CATS = ["general", "maintenance", "event", "security", "urgent"];

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState<string>("all");
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-notices", q, cat],
    queryFn: async () => {
      let query = supabase
        .from("notices")
        .select("*")
        .order("pinned", { ascending: false })
        .order("created_at", { ascending: false });
      if (q) query = query.or(`title.ilike.%${q}%,content.ilike.%${q}%`);
      if (cat !== "all") query = query.eq("category", cat);
      const { data } = await query;
      return data ?? [];
    },
  });

  const save = useMutation({
    mutationFn: async (n: any) => {
      const isValid = validateForm([
        { field: "title", value: n.title, required: true, label: "Notice Title" },
        { field: "content", value: n.content, required: true, label: "Description / Content" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      if (n.id) {
        const { error } = await supabase
          .from("notices")
          .update({ title: n.title, content: n.content, category: n.category, pinned: n.pinned })
          .eq("id", n.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("notices").insert({
          title: n.title,
          content: n.content,
          category: n.category || "general",
          pinned: !!n.pinned,
          created_by: user?.id,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Notice saved successfully.");
      qc.invalidateQueries({ queryKey: ["admin-notices"] });
      setEditing(null);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to save notice.");
      }
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("notices").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice deleted.");
      qc.invalidateQueries({ queryKey: ["admin-notices"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete notice.");
      setDeletingId(null);
    },
  });

  const togglePin = useMutation({
    mutationFn: async (n: any) => {
      const { error } = await supabase.from("notices").update({ pinned: !n.pinned }).eq("id", n.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Notice pin status updated.");
      qc.invalidateQueries({ queryKey: ["admin-notices"] });
    },
    onError: (e: any) => toast.error(e.message || "Failed to toggle pin."),
  });

  return (
    <>
      <PageHeader
        title="Notice Board"
        description="Post society announcements, maintenance reminders, and security alerts."
        action={
          <Button
            className="rounded-full shadow-sm"
            onClick={() =>
              setEditing({ title: "", content: "", category: "general", pinned: false })
            }
          >
            <Plus className="mr-1 h-4 w-4" /> New Notice
          </Button>
        }
      />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-56">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search notice titles or content..."
            className="rounded-full pl-9"
          />
        </div>
        <Select value={cat} onValueChange={setCat}>
          <SelectTrigger className="w-44 rounded-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {CATS.map((c) => (
              <SelectItem key={c} value={c} className="capitalize">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-3">
        {(data ?? []).map((n: any) => (
          <Panel
            key={n.id}
            title={n.title}
            action={
              <div className="flex items-center gap-1">
                <Badge variant="secondary" className="rounded-full capitalize">
                  {n.category}
                </Badge>
                <Button
                  size="icon"
                  variant="ghost"
                  title={n.pinned ? "Unpin Notice" : "Pin Notice"}
                  onClick={() => togglePin.mutate(n)}
                >
                  {n.pinned ? (
                    <PinOff className="h-4 w-4 text-primary" />
                  ) : (
                    <Pin className="h-4 w-4 text-muted-foreground" />
                  )}
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setEditing(n)}>
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeletingId(n.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            }
          >
            <div className="text-xs text-muted-foreground mb-2">
              {n.pinned && "📌 Pinned · "}
              Published {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
            </div>
            <p className="text-sm whitespace-pre-wrap text-foreground/90">{n.content}</p>
          </Panel>
        ))}
        {!data?.length && (
          <Panel title="No Notices">
            <p className="text-sm text-muted-foreground">
              No notices published yet. Post your first notice above.
            </p>
          </Panel>
        )}
      </div>

      {/* Create / Edit Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Edit Notice" : "Create New Notice"}</DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 py-2">
              <div>
                <Label className="text-xs font-medium">Notice Title *</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Notice Content *</Label>
                <Textarea
                  rows={4}
                  value={editing.content}
                  onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label className="text-xs font-medium">Category</Label>
                  <Select
                    value={editing.category || "general"}
                    onValueChange={(v) => setEditing({ ...editing, category: v })}
                  >
                    <SelectTrigger className="rounded-xl mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CATS.map((c) => (
                        <SelectItem key={c} value={c} className="capitalize">
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <label className="flex items-center gap-2 pt-5 text-sm cursor-pointer">
                  <input
                    type="checkbox"
                    checked={!!editing.pinned}
                    onChange={(e) => setEditing({ ...editing, pinned: e.target.checked })}
                    className="rounded border-border"
                  />
                  Pin Notice
                </label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>
              Save Notice
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notice?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will remove this notice permanently from the notice board.
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
