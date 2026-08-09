import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader, Panel } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/resident/profile")({
  head: () => ({
    meta: [
      { title: "My profile — SocietyOS" },
      { name: "description", content: "Update your contact, flat and emergency details." },
    ],
  }),
  component: Page,
});

function Page() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [form, setForm] = useState<any>({});

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () =>
      (await supabase.from("profiles").select("*").eq("id", user!.id).maybeSingle()).data,
  });
  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  const save = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: form.full_name,
          phone: form.phone,
          flat_number: form.flat_number,
          wing: form.wing,
          vehicle_number: form.vehicle_number,
          emergency_contact: form.emergency_contact,
          occupation: form.occupation,
        })
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <>
      <PageHeader title="Profile" description="Keep your details up to date." />
      <Panel title="Personal information">
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <Label className="text-xs">Full name</Label>
            <Input
              value={form.full_name ?? ""}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Email</Label>
            <Input value={form.email ?? ""} disabled className="rounded-xl" />
          </div>
          <div>
            <Label className="text-xs">Phone</Label>
            <Input
              value={form.phone ?? ""}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Occupation</Label>
            <Input
              value={form.occupation ?? ""}
              onChange={(e) => setForm({ ...form, occupation: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Wing</Label>
            <Input
              value={form.wing ?? ""}
              onChange={(e) => setForm({ ...form, wing: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Flat number</Label>
            <Input
              value={form.flat_number ?? ""}
              onChange={(e) => setForm({ ...form, flat_number: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Vehicle number</Label>
            <Input
              value={form.vehicle_number ?? ""}
              onChange={(e) => setForm({ ...form, vehicle_number: e.target.value })}
              className="rounded-xl"
            />
          </div>
          <div>
            <Label className="text-xs">Emergency contact</Label>
            <Input
              value={form.emergency_contact ?? ""}
              onChange={(e) => setForm({ ...form, emergency_contact: e.target.value })}
              className="rounded-xl"
            />
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button className="rounded-full" onClick={() => save.mutate()} disabled={save.isPending}>
            Save changes
          </Button>
        </div>
      </Panel>
    </>
  );
}
