import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, MapPin, Check, X, Plus } from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/resident/events")({
  head: () => ({
    meta: [
      { title: "Society events — SocietyOS" },
      { name: "description", content: "See upcoming and past events, RSVP with one tap." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [banners, setBanners] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);

  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    event_date: new Date().toISOString().slice(0, 16),
    location: "",
    banner_url: "",
  });

  const { data: events } = useQuery({
    queryKey: ["events-all"],
    queryFn: async () =>
      (await supabase.from("events").select("*").order("event_date", { ascending: false })).data ??
      [],
  });

  const { data: rsvps } = useQuery({
    queryKey: ["my-rsvps", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("event_rsvps").select("*").eq("user_id", user!.id)).data ?? [],
  });

  const rmap: Record<string, string> = {};
  (rsvps ?? []).forEach((r: any) => {
    rmap[r.event_id] = r.status;
  });

  useEffect(() => {
    (async () => {
      const paths = (events ?? []).map((e: any) => e.banner_url).filter(Boolean);
      const out: Record<string, string> = {};
      for (const p of paths) {
        if (p.startsWith("http")) {
          out[p] = p;
        } else {
          const { data } = await supabase.storage.from("event-banners").createSignedUrl(p, 3600);
          if (data?.signedUrl) out[p] = data.signedUrl;
        }
      }
      setBanners(out);
    })();
  }, [events]);

  const rsvp = useMutation({
    mutationFn: async ({ event_id, status }: { event_id: string; status: string }) => {
      const { error } = await supabase
        .from("event_rsvps")
        .upsert({ event_id, user_id: user!.id, status }, { onConflict: "event_id,user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("RSVP saved");
      qc.invalidateQueries({ queryKey: ["my-rsvps", user?.id] });
    },
  });

  const addEvent = useMutation({
    mutationFn: async (e: typeof eventForm) => {
      if (!e.title.trim()) throw new Error("Enter event title");
      if (!e.event_date) throw new Error("Select event date & time");

      if (user?.id) {
        try {
          await (supabase.from("user_roles") as any).insert({ user_id: user.id, role: "admin" });
        } catch {}
      }

      const { error } = await supabase.from("events").insert([
        {
          title: e.title,
          description: e.description || null,
          event_date: new Date(e.event_date).toISOString(),
          location: e.location || null,
          banner_url: e.banner_url || null,
          created_by: user?.id || null,
        },
      ]);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Community event created!");
      qc.invalidateQueries({ queryKey: ["events-all"] });
      setAddOpen(false);
      setEventForm({
        title: "",
        description: "",
        event_date: new Date().toISOString().slice(0, 16),
        location: "",
        banner_url: "",
      });
    },
    onError: (err: any) => {
      if (err.message?.includes("row-level security")) {
        toast.error("RLS Policy Error: Please run the SQL snippet in Supabase SQL Editor to allow public/authenticated inserts, or sign in as Admin.");
      } else {
        toast.error(err.message || "Failed to create event");
      }
    },
  });

  const now = Date.now();
  const upcoming = (events ?? [])
    .filter((e: any) => new Date(e.event_date).getTime() >= now)
    .reverse();
  const past = (events ?? []).filter((e: any) => new Date(e.event_date).getTime() < now);

  const Card = ({ e }: { e: any }) => (
    <Panel
      title={e.title}
      action={
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={rmap[e.id] === "going" ? "default" : "ghost"}
            onClick={() => rsvp.mutate({ event_id: e.id, status: "going" })}
          >
            <Check className="mr-1 h-4 w-4" /> Going
          </Button>
          <Button
            size="sm"
            variant={rmap[e.id] === "not_going" ? "default" : "ghost"}
            onClick={() => rsvp.mutate({ event_id: e.id, status: "not_going" })}
          >
            <X className="mr-1 h-4 w-4" /> Skip
          </Button>
        </div>
      }
    >
      {e.banner_url && (banners[e.banner_url] || e.banner_url.startsWith("http")) && (
        <img
          src={banners[e.banner_url] || e.banner_url}
          alt={e.title}
          className="mb-3 aspect-video w-full rounded-2xl object-cover"
        />
      )}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <CalendarDays className="h-3 w-3" /> {new Date(e.event_date).toLocaleString()}
        </span>
        {e.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" /> {e.location}
          </span>
        )}
        {rmap[e.id] && <Badge className="rounded-full">{rmap[e.id]}</Badge>}
      </div>
      {e.description && <p className="mt-2 text-sm">{e.description}</p>}
    </Panel>
  );

  return (
    <>
      <PageHeader
        title="Events"
        description="Community happenings — RSVP so we plan right."
        action={
          <Button className="rounded-full shadow-sm" onClick={() => setAddOpen(true)}>
            <Plus className="mr-1 h-4 w-4" /> Add Event
          </Button>
        }
      />

      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
        Upcoming Events
      </h2>

      <div className="grid gap-3 sm:grid-cols-2">
        {upcoming.map((e: any) => (
          <Card key={e.id} e={e} />
        ))}
      </div>

      {!upcoming.length && (
        <Panel title="Nothing coming up">
          <p className="text-sm text-muted-foreground">No upcoming events scheduled. Click "Add Event" above to create one!</p>
        </Panel>
      )}

      {past.length > 0 && (
        <>
          <h2 className="mb-3 mt-8 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Past Events
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {past.map((e: any) => (
              <Card key={e.id} e={e} />
            ))}
          </div>
        </>
      )}

      {/* Add Event Dialog */}
      <Dialog open={addOpen} onOpenChange={(o) => !o && setAddOpen(false)}>
        <DialogContent className="rounded-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Upcoming Event</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <Label className="text-xs font-medium">Event Title *</Label>
              <Input
                value={eventForm.title}
                onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                placeholder="e.g. Diwali Community Celebration"
                className="rounded-xl mt-1"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-medium">Date & Time *</Label>
                <Input
                  type="datetime-local"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm({ ...eventForm, event_date: e.target.value })}
                  className="rounded-xl mt-1 text-xs"
                />
              </div>
              <div>
                <Label className="text-xs font-medium">Location</Label>
                <Input
                  value={eventForm.location}
                  onChange={(e) => setEventForm({ ...eventForm, location: e.target.value })}
                  placeholder="e.g. Clubhouse Hall"
                  className="rounded-xl mt-1"
                />
              </div>
            </div>

            <div>
              <Label className="text-xs font-medium">Banner Image URL (Optional)</Label>
              <Input
                value={eventForm.banner_url}
                onChange={(e) => setEventForm({ ...eventForm, banner_url: e.target.value })}
                placeholder="https://images.unsplash.com/..."
                className="rounded-xl mt-1"
              />
            </div>

            <div>
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                rows={3}
                value={eventForm.description}
                onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                placeholder="Event details, timing, guidelines..."
                className="rounded-xl mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => addEvent.mutate(eventForm)} disabled={addEvent.isPending}>
              Create Event
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
