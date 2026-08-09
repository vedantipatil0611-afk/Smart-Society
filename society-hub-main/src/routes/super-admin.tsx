import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
  return (
    <RoleGate allow={["super_admin"]}>
      <AppShell role="SuperAdmin">
        <Outlet />
      </AppShell>
    </RoleGate>
  );
}
