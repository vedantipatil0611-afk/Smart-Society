import { useEffect, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth, homeForRoles, type AppRole } from "@/lib/auth-context";

export function RoleGate({ allow, children }: { allow: AppRole[]; children: ReactNode }) {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate({ to: "/auth", replace: true });
      return;
    }
    // super_admin can access everything
    const hasAccess = roles.includes("super_admin") || allow.some((r) => roles.includes(r));
    if (roles.length && !hasAccess) {
      navigate({ to: homeForRoles(roles), replace: true });
    }
  }, [user, roles, loading, allow, navigate]);

  const hasAccess = roles.includes("super_admin") || allow.some((r) => roles.includes(r));
  if (loading || !user || (roles.length && !hasAccess)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
