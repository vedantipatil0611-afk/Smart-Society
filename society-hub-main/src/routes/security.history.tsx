import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Search } from "lucide-react";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";

export const Route = createFileRoute("/security/history")({
  head: () => ({
    meta: [
      { title: "Visitor history — Security" },
      { name: "description", content: "Search past visitor logs by name, phone or flat." },
    ],
  }),
  component: Page,
});

function Page() {
  const [q, setQ] = useState("");
  const { data } = useQuery({
    queryKey: ["visitor-history"],
    queryFn: async () =>
      (
        await supabase
          .from("visitors")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(500)
      ).data ?? [],
  });
  const rows = (data ?? []).filter((v: any) => {
    if (!q) return true;
    const l = q.toLowerCase();
    return (
      v.visitor_name?.toLowerCase().includes(l) ||
      v.visitor_phone?.includes(q) ||
      v.flat_number?.toLowerCase().includes(l)
    );
  });

  return (
    <RoleGate allow={["security", "admin"]}>
      <AppShell role="Security">
        <PageHeader
          title="Visitor history"
          description="Last 500 visitors — searchable."
          action={
            <div className="relative w-64">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search name, phone, flat"
                className="rounded-full pl-9"
              />
            </div>
          }
        />
        <Panel title="Log">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Visitor</TableHead>
                  <TableHead>Flat</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Entry</TableHead>
                  <TableHead>Exit</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((v: any) => (
                  <TableRow key={v.id}>
                    <TableCell>
                      <div className="font-medium">{v.visitor_name}</div>
                      <div className="text-xs text-muted-foreground">{v.visitor_phone || "—"}</div>
                    </TableCell>
                    <TableCell>
                      {v.wing ? `${v.wing}-` : ""}
                      {v.flat_number}
                    </TableCell>
                    <TableCell className="text-xs">{v.visitor_type}</TableCell>
                    <TableCell className="text-xs">
                      {v.entry_time ? format(new Date(v.entry_time), "MMM d HH:mm") : "—"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {v.exit_time ? format(new Date(v.exit_time), "MMM d HH:mm") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge className="rounded-full">{v.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
                {!rows.length && (
                  <TableRow>
                    <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                      No matches.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Panel>
      </AppShell>
    </RoleGate>
  );
}
