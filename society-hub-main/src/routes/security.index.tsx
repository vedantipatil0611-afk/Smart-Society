import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { LogIn, LogOut, Clock, Users } from "lucide-react";
import { PageHeader, Panel, StatCard } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/security/")({
  head: () => ({
    meta: [
      { title: "Security portal — SocietyOS" },
      { name: "description", content: "Log visitor entries, exits and verify approvals." },
    ],
  }),
  component: Page,
});

function Page() {
  const { data } = useQuery({
    queryKey: ["security-today"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const iso = today.toISOString();
      const { data } = await supabase
        .from("visitors")
        .select("*")
        .gte("created_at", iso)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  const inside = (data ?? []).filter((v: any) => v.status === "inside").length;
  const exited = (data ?? []).filter((v: any) => v.status === "exited").length;
  const pending = (data ?? []).filter(
    (v: any) => v.status === "pending" || v.status === "approved",
  ).length;

  return (
    <>
      <PageHeader
        title="Security desk"
        description="Today at the gate."
        action={
          <div className="flex gap-2">
            <Button asChild className="rounded-full">
              <Link to="/security/entry">
                <LogIn className="mr-1 h-4 w-4" /> New entry
              </Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link to="/security/exit">
                <LogOut className="mr-1 h-4 w-4" /> Log exit
              </Link>
            </Button>
          </div>
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Currently inside" value={inside} Icon={Users} />
        <StatCard label="Awaiting" value={pending} Icon={Clock} />
        <StatCard label="Exited today" value={exited} Icon={LogOut} />
      </div>
      <div className="mt-6">
        <Panel title="Today's visitors">
          <ul className="divide-y">
            {(data ?? []).map((v: any) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{v.visitor_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.visitor_type} · {v.wing ? `${v.wing}-` : ""}
                    {v.flat_number} · {v.visitor_phone || "—"}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-xs text-muted-foreground">
                    {v.entry_time && `in ${format(new Date(v.entry_time), "HH:mm")}`}
                    {v.exit_time && ` · out ${format(new Date(v.exit_time), "HH:mm")}`}
                  </div>
                  <Badge className="rounded-full">{v.status}</Badge>
                </div>
              </li>
            ))}
            {!data?.length && (
              <li className="py-6 text-center text-sm text-muted-foreground">No visitors today.</li>
            )}
          </ul>
        </Panel>
      </div>
    </>
  );
}
