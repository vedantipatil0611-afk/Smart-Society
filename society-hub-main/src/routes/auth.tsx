import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { Building2, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth, homeForRoles, type AppRole } from "@/lib/auth-context";

const authSearchSchema = z.object({
  mode: z.enum(["signin", "signup"]).optional(),
});

export const Route = createFileRoute("/auth")({
  validateSearch: authSearchSchema,
  head: () => ({
    meta: [
      { title: "Sign in — SocietyOS" },
      { name: "description", content: "Sign in or create your SocietyOS account." },
    ],
  }),
  component: AuthPage,
});

const emailSchema = z.string().trim().email("Enter a valid email").max(255);
const passwordSchema = z.string().min(8, "At least 8 characters").max(72, "Password too long");
const nameSchema = z.string().trim().min(1, "Enter your name").max(100);

function AuthPage() {
  const search = Route.useSearch();
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<"signin" | "signup">(search.mode ?? "signin");

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: homeForRoles(roles), replace: true });
    }
  }, [user, roles, loading, navigate]);

  return (
    <div className="min-h-screen bg-secondary text-secondary-foreground">
      <div className="mx-auto grid min-h-screen max-w-6xl grid-cols-1 md:grid-cols-2">
        <div className="hidden flex-col justify-between p-12 md:flex">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">SocietyOS</span>
          </Link>
          <div>
            <h2 className="text-4xl font-bold leading-tight">
              Your society,
              <br />
              <span className="bg-primary text-primary-foreground px-2 py-0.5 rounded-xl inline-block mt-2">
                simplified.
              </span>
            </h2>
            <p className="mt-4 max-w-sm text-sm text-secondary-foreground/70">
              Residents, visitors, maintenance, complaints and events — beautifully unified.
            </p>
          </div>
          <p className="text-xs text-secondary-foreground/50">
            © {new Date().getFullYear()} SocietyOS
          </p>
        </div>

        <div className="flex items-center justify-center bg-background p-6 text-foreground md:rounded-l-[2rem]">
          <div className="w-full max-w-md">
            <div className="mb-8 flex items-center gap-2 md:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary">
                <Building2 className="h-5 w-5 text-primary" />
              </div>
              <span className="text-lg font-bold tracking-tight">SocietyOS</span>
            </div>

            <Tabs value={tab} onValueChange={(v) => setTab(v as "signin" | "signup")}>
              <TabsList className="grid w-full grid-cols-2 rounded-full bg-muted p-1">
                <TabsTrigger value="signin" className="rounded-full">
                  Sign in
                </TabsTrigger>
                <TabsTrigger value="signup" className="rounded-full">
                  Sign up
                </TabsTrigger>
              </TabsList>

              <TabsContent value="signin" className="mt-6">
                <SignInForm />
              </TabsContent>
              <TabsContent value="signup" className="mt-6">
                <SignUpForm onDone={() => setTab("signin")} />
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
}

function GoogleButton() {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      className="w-full rounded-full"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        const result = await lovable.auth.signInWithOAuth("google", {
          redirect_uri: window.location.origin,
        });
        if (result.error) {
          setBusy(false);
          toast.error(result.error.message || "Google sign-in failed");
        }
      }}
    >
      {busy ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
          />
        </svg>
      )}
      Continue with Google
    </Button>
  );
}

function SignInForm() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("resident");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const emailR = emailSchema.safeParse(email);
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    if (!password) return toast.error("Enter your password");
    setBusy(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: emailR.data, password });
    if (error) {
      setBusy(false);
      if (error.message === "Invalid login credentials" || error.message === "Email not confirmed") {
        toast.error("Invalid email or password.");
      } else {
        toast.error(error.message);
      }
    } else {
      if (data.user) {
        // Ensure chosen position/role exists in user_roles
        const { data: existingRoles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", data.user.id);

        const hasRole = existingRoles?.some((r) => r.role === role);
        if (!hasRole) {
          try {
            await (supabase.from("user_roles") as any).insert({ user_id: data.user.id, role });
          } catch {}
        }
      }
      setBusy(false);
      const roleLabel =
        role === "admin"
          ? "Administrator"
          : role === "security"
            ? "Security Guard"
            : role === "super_admin"
              ? "Super Admin"
              : "Resident";
      toast.success(`Signed in as ${roleLabel}`);
      navigate({ to: homeForRoles([role]), replace: true });
    }
  };

  return (
    <div className="space-y-4">
      <GoogleButton />
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            or continue with email
          </span>
        </div>
      </div>

      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="si-role">Select Position / Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger id="si-role" className="rounded-xl">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resident">🏠 Resident</SelectItem>
              <SelectItem value="admin">🛡️ Society Administrator</SelectItem>
              <SelectItem value="security">👮 Security Guard</SelectItem>
              <SelectItem value="super_admin">⚡ Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="si-email">Email</Label>
          <Input
            id="si-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="si-pass">Password</Label>
            <Link
              to="/forgot-password"
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Forgot?
            </Link>
          </div>
          <Input
            id="si-pass"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-secondary text-secondary-foreground hover:bg-secondary/90"
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Sign in
        </Button>
      </form>
    </div>
  );
}

function SignUpForm({ onDone }: { onDone: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AppRole>("resident");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const nameR = nameSchema.safeParse(name);
    if (!nameR.success) return toast.error(nameR.error.issues[0].message);
    const emailR = emailSchema.safeParse(email);
    if (!emailR.success) return toast.error(emailR.error.issues[0].message);
    const passR = passwordSchema.safeParse(password);
    if (!passR.success) return toast.error(passR.error.issues[0].message);
    setBusy(true);
    const { data, error } = await supabase.auth.signUp({
      email: emailR.data,
      password: passR.data,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: nameR.data, role },
      },
    });

    if (error) {
      setBusy(false);
      toast.error(error.message);
    } else {
      if (data.user?.id) {
        try {
          await (supabase.from("user_roles") as any).insert({ user_id: data.user.id, role });
        } catch {}
      }

      if (data.session) {
        setBusy(false);
        toast.success("Account created — you're signed in.");
        navigate({ to: homeForRoles([role]), replace: true });
      } else {
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
          email: emailR.data,
          password: passR.data,
        });
        if (signInData?.user?.id) {
          try {
            await (supabase.from("user_roles") as any).insert({ user_id: signInData.user.id, role });
          } catch {}
        }
        setBusy(false);
        if (!signInError) {
          toast.success("Account created — you're signed in.");
          navigate({ to: homeForRoles([role]), replace: true });
        } else {
          toast.success("Account created successfully! You can now sign in.");
          onDone();
        }
      }
    }
  };

  return (
    <div className="space-y-4">
      <GoogleButton />
      <div className="relative py-2">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-background px-3 text-xs text-muted-foreground">
            or sign up with email
          </span>
        </div>
      </div>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="su-role">Select Position / Role</Label>
          <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
            <SelectTrigger id="su-role" className="rounded-xl">
              <SelectValue placeholder="Select position" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="resident">🏠 Resident</SelectItem>
              <SelectItem value="admin">🛡️ Society Administrator</SelectItem>
              <SelectItem value="security">👮 Security Guard</SelectItem>
              <SelectItem value="super_admin">⚡ Super Admin</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-name">Full name</Label>
          <Input
            id="su-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-email">Email</Label>
          <Input
            id="su-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-xl"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="su-pass">Password</Label>
          <Input
            id="su-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-xl"
          />
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>

        <Button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
        >
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Create account
        </Button>
      </form>
    </div>
  );
}
