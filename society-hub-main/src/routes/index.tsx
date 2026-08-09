import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { Building2, Shield, Users, ArrowRight, Sparkles, BarChart3, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth, homeForRoles } from "@/lib/auth-context";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "SocietyOS — All-in-one society management" },
      {
        name: "description",
        content:
          "Premium society management: residents, visitors, maintenance, complaints, facilities, events — beautifully unified.",
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate({ to: homeForRoles(roles), replace: true });
    }
  }, [user, roles, loading, navigate]);

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-secondary">
            <Building2 className="h-5 w-5 text-primary" />
          </div>
          <span className="text-lg font-bold tracking-tight">SocietyOS</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/auth">
            <Button variant="ghost" className="rounded-full">
              Sign in
            </Button>
          </Link>
          <Link to="/auth" search={{ mode: "signup" } as never}>
            <Button className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90">
              Get started
            </Button>
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-6 pb-24 pt-16 md:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-4 py-1.5 text-xs font-medium text-secondary-foreground">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Built for modern housing societies
          </div>
          <h1 className="mt-6 text-5xl font-bold tracking-tight md:text-7xl">
            Run your society,{" "}
            <span className="bg-primary px-3 py-1 rounded-2xl">effortlessly.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground">
            One elegant platform for residents, visitors, maintenance, complaints, facilities and
            events — with role-based access for Admins, Residents and Security.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
            <Link to="/auth" search={{ mode: "signup" } as never}>
              <Button
                size="lg"
                className="rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Create your account
                <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/auth">
              <Button size="lg" variant="outline" className="rounded-full">
                Sign in
              </Button>
            </Link>
          </div>
        </div>

        <div className="mx-auto mt-24 grid max-w-5xl gap-6 md:grid-cols-3">
          {[
            {
              Icon: Users,
              title: "Residents",
              body: "Manage profiles, vehicles, family and contacts with search and filters.",
            },
            {
              Icon: Shield,
              title: "Security",
              body: "Visitor entry & exit, verification, approvals and today's overview.",
            },
            {
              Icon: BarChart3,
              title: "Insights",
              body: "Dashboards, notices, complaints and maintenance at a glance.",
            },
          ].map(({ Icon, title, body }) => (
            <div
              key={title}
              className="rounded-3xl border bg-card p-6 shadow-soft transition hover:-translate-y-0.5 hover:shadow-elevated"
            >
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary">
                <Icon className="h-5 w-5 text-primary-foreground" />
              </div>
              <h3 className="mt-4 text-lg font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} SocietyOS</span>
          <span className="flex items-center gap-1.5">
            <Bell className="h-3.5 w-3.5" /> Premium, modern, elegant.
          </span>
        </div>
      </footer>
    </div>
  );
}
