import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";
import { ImageUpload } from "@/components/ui/image-upload";

export const Route = createFileRoute("/security/entry")({
  head: () => ({
    meta: [
      { title: "Visitor entry — Security" },
      { name: "description", content: "Log a new visitor at the gate and notify the host." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [flat, setFlat] = useState<any>(null);
  const [form, setForm] = useState<any>({
    visitor_name: "",
    visitor_phone: "",
    visitor_type: "guest",
    purpose: "",
    vehicle_number: "",
    photo_url: null as string | null,
  });

  const search = useMutation({
    mutationFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id,full_name,flat_number,wing,phone")
        .or(`flat_number.ilike.%${q}%,full_name.ilike.%${q}%`)
        .limit(8);
      return data ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async () => {
      if (!flat) throw new Error("Pick host flat");
      const status = "inside";
      const { error } = await supabase.from("visitors").insert({
        ...form,
        host_resident_id: flat.id,
        flat_number: flat.flat_number,
        wing: flat.wing,
        status,
        entry_time: new Date().toISOString(),
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Visitor logged inside");
      setForm({
        visitor_name: "",
        visitor_phone: "",
        visitor_type: "guest",
        purpose: "",
        vehicle_number: "",
        photo_url: null as string | null,
      });
      setFlat(null);
      setQ("");
      qc.invalidateQueries({ queryKey: ["security-today"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <RoleGate allow={["security", "admin"]}>
      <AppShell role="Security">
        <PageHeader title="Log entry" description="Record a visitor at the gate." />
        <div className="grid gap-4 lg:grid-cols-2">
          <Panel title="Host flat">
            <div className="flex gap-2">
              <Input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Flat no. or resident name"
                className="rounded-full"
              />
              <Button className="rounded-full" onClick={() => search.mutate()}>
                Search
              </Button>
            </div>
            <ul className="mt-3 divide-y">
              {(search.data ?? []).map((p: any) => (
                <li key={p.id}>
                  <button
                    className={`w-full rounded-2xl px-3 py-2 text-left text-sm hover:bg-muted ${flat?.id === p.id ? "bg-muted" : ""}`}
                    onClick={() => setFlat(p)}
                  >
                    <div className="font-medium">
                      {p.wing ? `${p.wing}-` : ""}
                      {p.flat_number || "—"} · {p.full_name}
                    </div>
                    <div className="text-xs text-muted-foreground">{p.phone || "no phone"}</div>
                  </button>
                </li>
              ))}
            </ul>
            {flat && (
              <div className="mt-3 rounded-2xl bg-primary/10 p-3 text-sm">
                Selected: {flat.wing ? `${flat.wing}-` : ""}
                {flat.flat_number} · {flat.full_name}
              </div>
            )}
          </Panel>

          <Panel title="Visitor details">
            <div className="grid gap-3">
              <div>
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
              <div>
                <Label className="text-xs">Vehicle no.</Label>
                <Input
                  value={form.vehicle_number}
                  onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
                  className="rounded-xl"
                />
              </div>
              <Button
                className="rounded-full"
                onClick={() => create.mutate()}
                disabled={!form.visitor_name || !flat || create.isPending}
              >
                Log entry
              </Button>
            </div>
          </Panel>
        </div>
      </AppShell>
    </RoleGate>
  );
}
