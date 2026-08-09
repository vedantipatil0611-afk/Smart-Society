import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/resident")({
  component: ResidentLayout,
});

function ResidentLayout() {
  return (
    <RoleGate allow={["resident", "admin"]}>
      <AppShell role="Resident">
        <Outlet />
      </AppShell>
    </RoleGate>
  );
}
