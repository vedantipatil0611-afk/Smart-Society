import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { z } from "zod";
import { Building2, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Reset password — SocietyOS" },
      { name: "description", content: "Reset your SocietyOS account password." },
    ],
  }),
  component: ForgotPage,
});

function ForgotPage() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = z.string().trim().email().safeParse(email);
    if (!parsed.success) return toast.error("Enter a valid email");
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else {
      setSent(true);
      toast.success("Check your inbox for a reset link");
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
        <h1 className="text-2xl font-bold">Forgot your password?</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we'll send you a reset link.
        </p>

        {sent ? (
          <div className="mt-6 rounded-2xl bg-muted p-4 text-sm">
            If an account exists for <strong>{email}</strong>, you'll receive an email shortly.
          </div>
        ) : (
          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="fp-email">Email</Label>
              <Input
                id="fp-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl"
              />
            </div>
            <Button
              type="submit"
              disabled={busy}
              className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send reset link
            </Button>
          </form>
        )}

        <Link
          to="/auth"
          className="mt-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
        </Link>
      </div>
    </div>
  );
}
