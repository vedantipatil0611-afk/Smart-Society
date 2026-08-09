import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
});

function AdminLayout() {
  return (
    <RoleGate allow={["admin"]}>
      <AppShell role="Admin">
        <Outlet />
      </AppShell>
    </RoleGate>
  );
}
