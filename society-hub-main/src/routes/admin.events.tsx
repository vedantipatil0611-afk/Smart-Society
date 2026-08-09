import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Trash2, Edit, ImageIcon, Users, Search } from "lucide-react";
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
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/admin/events")({
  head: () => ({
    meta: [
      { title: "Community Events — SocietyOS Admin" },
      { name: "description", content: "Create and manage community events and celebrations." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState<any | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [q, setQ] = useState("");

  const { data } = useQuery({
    queryKey: ["admin-events"],
    queryFn: async () =>
      (await supabase.from("events").select("*").order("event_date", { ascending: false })).data ??
      [],
  });

  const { data: rsvpCounts } = useQuery({
    queryKey: ["admin-rsvp-counts"],
    queryFn: async () => {
      const { data } = await supabase.from("event_rsvps").select("event_id,status");
      const map: Record<string, number> = {};
      (data ?? []).forEach((r: any) => {
        if (r.status === "going") map[r.event_id] = (map[r.event_id] ?? 0) + 1;
      });
      return map;
    },
  });

  const events = (data ?? []).filter((e: any) => {
    if (!q) return true;
    const l = q.toLowerCase();
    return (
      e.title?.toLowerCase().includes(l) ||
      e.location?.toLowerCase().includes(l) ||
      e.description?.toLowerCase().includes(l)
    );
  });

  const save = useMutation({
    mutationFn: async (e: any) => {
      const isValid = validateForm([
        { field: "title", value: e.title, required: true, label: "Event Title" },
        { field: "event_date", value: e.event_date, required: true, label: "Event Date" },
      ]);
      if (!isValid) throw new Error("Validation failed");

      const payload = {
        title: e.title,
        description: e.description || null,
        event_date: e.event_date,
        location: e.location || null,
        banner_url: e.banner_url || null,
      };

      if (e.id) {
        const { error } = await supabase.from("events").update(payload).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("events")
          .insert({ ...payload, created_by: user?.id });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Event saved successfully.");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setEditing(null);
    },
    onError: (e: any) => {
      if (e.message !== "Validation failed") {
        toast.error(e.message || "Failed to save event.");
      }
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("events").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Event deleted.");
      qc.invalidateQueries({ queryKey: ["admin-events"] });
      setDeletingId(null);
    },
    onError: (e: any) => {
      toast.error(e.message || "Failed to delete event.");
      setDeletingId(null);
    },
  });

  return (
    <>
      <PageHeader
        title="Community Events"
        description="Plan society gatherings, festivals, and track member RSVPs."
        action={
          <div className="flex gap-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search events..."
                className="w-52 rounded-full pl-9"
              />
            </div>
            <Button
              className="rounded-full shadow-sm"
              onClick={() =>
                setEditing({
                  title: "",
                  description: "",
                  event_date: new Date().toISOString().slice(0, 16),
                  location: "",
                  banner_url: null,
                })
              }
            >
              <Plus className="mr-1 h-4 w-4" /> New Event
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {events.map((e: any) => (
          <Panel
            key={e.id}
            title={e.title}
            action={
              <div className="flex gap-1">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() =>
                    setEditing({
                      ...e,
                      event_date: e.event_date
                        ? new Date(e.event_date).toISOString().slice(0, 16)
                        : "",
                    })
                  }
                >
                  <Edit className="h-4 w-4 text-muted-foreground" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => setDeletingId(e.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            }
          >
            {e.banner_url ? (
              <img
                src={e.banner_url}
                alt={e.title}
                className="mb-3 aspect-video w-full rounded-2xl object-cover border"
              />
            ) : (
              <div className="mb-3 flex aspect-video w-full items-center justify-center rounded-2xl bg-muted/40 border">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
              </div>
            )}
            <div className="text-xs text-muted-foreground">
              {e.event_date ? new Date(e.event_date).toLocaleString() : "Date TBD"}{" "}
              {e.location ? `· ${e.location}` : ""}
            </div>
            {e.description && (
              <p className="mt-2 text-sm line-clamp-3 text-foreground/90">{e.description}</p>
            )}
            <div className="mt-3 flex items-center gap-1 text-xs font-medium text-primary">
              <Users className="h-3.5 w-3.5" /> {rsvpCounts?.[e.id] ?? 0} members attending
            </div>
          </Panel>
        ))}
        {!events.length && (
          <Panel title="No Events Found">
            <p className="text-sm text-muted-foreground">
              Create your first community event above.
            </p>
          </Panel>
        )}
      </div>

      {/* Add/Edit Event Dialog */}
      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="rounded-2xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editing?.id ? "Edit Event Details" : "Create Community Event"}
            </DialogTitle>
          </DialogHeader>
          {editing && (
            <div className="grid gap-3 py-2">
              <ImageUpload
                label="Banner Image"
                value={editing.banner_url}
                onChange={(url) => setEditing({ ...editing, banner_url: url })}
              />
              <div>
                <Label className="text-xs font-medium">Event Title *</Label>
                <Input
                  value={editing.title}
                  onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <Label className="text-xs font-medium">Date & Time *</Label>
                  <Input
                    type="datetime-local"
                    value={editing.event_date}
                    onChange={(e) => setEditing({ ...editing, event_date: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium">Location</Label>
                  <Input
                    value={editing.location ?? ""}
                    placeholder="e.g. Clubhouse Lawn"
                    onChange={(e) => setEditing({ ...editing, location: e.target.value })}
                    className="rounded-xl mt-1"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-medium">Description</Label>
                <Textarea
                  rows={3}
                  value={editing.description ?? ""}
                  onChange={(e) => setEditing({ ...editing, description: e.target.value })}
                  className="rounded-xl mt-1"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button onClick={() => save.mutate(editing)} disabled={save.isPending}>
              Save Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Alert */}
      <AlertDialog open={!!deletingId} onOpenChange={(o) => !o && setDeletingId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Community Event?</AlertDialogTitle>
            <AlertDialogDescription>
              This action will delete this event and all RSVPs permanently.
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
