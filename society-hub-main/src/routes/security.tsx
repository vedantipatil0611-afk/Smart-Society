import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";

export const Route = createFileRoute("/security")({
  component: SecurityLayout,
});

function SecurityLayout() {
  return (
    <RoleGate allow={["security", "admin"]}>
      <AppShell role="Security">
        <Outlet />
      </AppShell>
    </RoleGate>
  );
}
