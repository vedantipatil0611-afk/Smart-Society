// Dynamic string links; use plain anchor for arbitrary paths
import { Bell, Check } from "lucide-react";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

type N = {
  id: string;
  type: string;
  title: string;
  message: string | null;
  link: string | null;
  read: boolean;
  created_at: string;
};

export function NotificationBell() {
  const { user } = useAuth();
  const [items, setItems] = useState<N[]>([]);

  const load = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("notifications")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    setItems((data ?? []) as N[]);
  };

  useEffect(() => {
    if (!user) return;
    void load();
    const ch = supabase
      .channel("notif-" + user.id)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${user.id}` },
        () => void load(),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const unread = items.filter((n) => !n.read).length;

  const markAll = async () => {
    if (!user) return;
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("user_id", user.id)
      .eq("read", false);
    void load();
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full">
          <Bell className="h-5 w-5" />
          {unread > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
              {unread > 9 ? "9+" : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-96 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b p-4">
          <div>
            <div className="font-semibold">Notifications</div>
            <div className="text-xs text-muted-foreground">
              {unread ? `${unread} unread` : "You're all caught up"}
            </div>
          </div>
          {unread > 0 && (
            <Button size="sm" variant="ghost" onClick={markAll}>
              <Check className="mr-1 h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </div>
        <div className="max-h-96 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              No notifications yet.
            </div>
          ) : (
            items.map((n) => {
              const body = (
                <div
                  className={`flex gap-3 border-b px-4 py-3 last:border-b-0 ${
                    n.read ? "bg-transparent" : "bg-accent/40"
                  }`}
                >
                  <div className="mt-1 h-2 w-2 flex-none rounded-full bg-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{n.title}</div>
                    {n.message && (
                      <div className="text-xs text-muted-foreground line-clamp-2">{n.message}</div>
                    )}
                    <div className="mt-1 text-[10px] uppercase tracking-wider text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                    </div>
                  </div>
                </div>
              );
              return n.link ? (
                <a key={n.id} href={n.link} className="block hover:bg-accent/60">
                  {body}
                </a>
              ) : (
                <div key={n.id}>{body}</div>
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
