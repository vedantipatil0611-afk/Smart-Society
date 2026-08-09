import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set new password — SocietyOS" },
      { name: "description", content: "Choose a new password for your SocietyOS account." },
    ],
  }),
  component: ResetPage,
});

function ResetPage() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().min(8, "At least 8 characters").max(72).safeParse(password);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (password !== confirm) return toast.error("Passwords don't match");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Password updated");
      navigate({ to: "/auth", replace: true });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary px-6">
      <div className="w-full max-w-md rounded-3xl bg-background p-8 shadow-elevated">
        <div className="mb-6 flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">SocietyOS</span>
        </div>
        <h1 className="text-2xl font-bold">Set a new password</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Choose something strong you'll remember.
        </p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rp-pass">New password</Label>
            <Input
              id="rp-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="rp-confirm">Confirm password</Label>
            <Input
              id="rp-confirm"
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="rounded-xl"
            />
          </div>
          <Button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Update password
          </Button>
        </form>
      </div>
    </div>
  );
}
