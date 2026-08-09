import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "admin" | "resident" | "security" | "super_admin";

type AuthState = {
  session: Session | null;
  user: User | null;
  roles: AppRole[];
  loading: boolean;
  signOut: () => Promise<void>;
  refreshRoles: () => Promise<void>;
};

const AuthContext = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRoles = async (userId: string | undefined) => {
    if (!userId) {
      setRoles([]);
      return;
    }
    try {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", userId);
      if (data && data.length > 0) {
        setRoles(data.map((r) => r.role as AppRole));
      } else {
        // Fallback: resident only for accounts without an explicit role assignment
        setRoles(["resident"]);
      }
    } catch {
      setRoles(["resident"]);
    }
  };

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_evt, s) => {
      setSession(s);
      if (s?.user) {
        setTimeout(() => void loadRoles(s.user.id), 0);
      } else {
        setRoles([]);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      if (data.session?.user) void loadRoles(data.session.user.id);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const value: AuthState = {
    session,
    user: session?.user ?? null,
    roles,
    loading,
    signOut: async () => {
      await supabase.auth.signOut();
      setSession(null);
      setRoles([]);
    },
    refreshRoles: async () => loadRoles(session?.user.id),
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function homeForRoles(roles: AppRole[]): string {
  if (roles.includes("super_admin")) return "/super-admin";
  if (roles.includes("admin")) return "/admin";
  if (roles.includes("security")) return "/security";
  return "/resident";
}
