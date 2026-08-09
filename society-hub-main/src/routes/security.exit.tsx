import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut } from "lucide-react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/security/exit")({
  head: () => ({
    meta: [
      { title: "Visitor exit — Security" },
      { name: "description", content: "Mark visitors as exited when they leave." },
    ],
  }),
  component: Page,
});

function Page() {
  const qc = useQueryClient();
  const { data } = useQuery({
    queryKey: ["visitors-inside"],
    queryFn: async () =>
      (
        await supabase
          .from("visitors")
          .select("*")
          .eq("status", "inside")
          .order("entry_time", { ascending: false })
      ).data ?? [],
  });
  const exit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("visitors")
        .update({ status: "exited", exit_time: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Exit logged");
      qc.invalidateQueries({ queryKey: ["visitors-inside"] });
      qc.invalidateQueries({ queryKey: ["security-today"] });
    },
  });

  return (
    <RoleGate allow={["security", "admin"]}>
      <AppShell role="Security">
        <PageHeader title="Log exit" description="Everyone currently inside the society." />
        <Panel title="Inside now">
          <ul className="divide-y">
            {(data ?? []).map((v: any) => (
              <li key={v.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div>
                  <div className="font-medium">{v.visitor_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {v.wing ? `${v.wing}-` : ""}
                    {v.flat_number} · {v.visitor_type} · in{" "}
                    {v.entry_time ? format(new Date(v.entry_time), "HH:mm") : "—"}
                  </div>
                </div>
                <Button size="sm" className="rounded-full" onClick={() => exit.mutate(v.id)}>
                  <LogOut className="mr-1 h-4 w-4" /> Log exit
                </Button>
              </li>
            ))}
            {!data?.length && (
              <li className="py-6 text-center text-sm text-muted-foreground">
                No one currently inside.
              </li>
            )}
          </ul>
        </Panel>
      </AppShell>
    </RoleGate>
  );
}
