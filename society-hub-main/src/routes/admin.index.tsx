import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Users,
  Wrench,
  MessageSquareWarning,
  Bell,
  ShieldCheck,
  CalendarDays,
  ArrowRight,
  HardHat,
  Car,
  Home,
  CheckCircle2,
  Building,
  TrendingUp,
  AlertTriangle,
  BadgeDollarSign,
} from "lucide-react";
import { Panel, PageHeader, StatCard } from "@/components/AppShell";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend,
  CartesianGrid,
} from "recharts";
import { INR, MONTHS } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — SocietyOS" },
      { name: "description", content: "Society-wide analytics, statistics, and quick actions." },
    ],
  }),
  component: AdminPage,
});

function useAdminDashboardData() {
  return useQuery({
    queryKey: ["admin-dashboard-stats"],
    queryFn: async () => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const todayISO = today.toISOString();

      const [
        membersRes,
        visitorsRes,
        complaintsRes,
        billsRes,
        staffRes,
        parkingRes,
        bookingsRes,
        noticesRes,
        eventsRes,
        pendingBillsRes,
      ] = await Promise.all([
        supabase.from("profiles").select("id,flat_number,wing,full_name,created_at"),
        supabase.from("visitors").select("id,status,created_at"),
        supabase.from("complaints").select("id,status,category,created_at"),
        supabase.from("maintenance_bills").select("id,amount,status,month,year,paid_at"),
        (supabase as any).from("staff").select("id,active,role"),
        (supabase as any).from("parking_slots").select("id,status,vehicle_type"),
        supabase.from("facility_bookings").select("id,status,start_time,created_at"),
        supabase
          .from("notices")
          .select("id,title,category,pinned,created_at")
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("events")
          .select("id,title,event_date,location")
          .gte("event_date", todayISO)
          .order("event_date")
          .limit(5),
        supabase
          .from("maintenance_bills")
          .select("id,resident_id,flat_number,wing,amount,month,year,status")
          .neq("status", "paid")
          .order("amount", { ascending: false })
          .limit(50),
      ]);

      const members = membersRes.data ?? [];
      const visitors = visitorsRes.data ?? [];
      const complaints = complaintsRes.data ?? [];
      const bills = billsRes.data ?? [];
      const staff = staffRes.data ?? [];
      const parking = parkingRes.data ?? [];
      const bookings = bookingsRes.data ?? [];
      const pendingBills = pendingBillsRes.data ?? [];

      // Build a profile map for pending bills lookup
      const profileMap: Record<string, any> = {};
      members.forEach((m: any) => { profileMap[m.id] = m; });

      // Group pending bills by resident
      const duesByResident: Record<string, { name: string; flat: string; wing: string; total: number; count: number }> = {};
      pendingBills.forEach((b: any) => {
        const prof = profileMap[b.resident_id];
        if (!duesByResident[b.resident_id]) {
          duesByResident[b.resident_id] = {
            name: prof?.full_name || "Unknown Resident",
            flat: b.flat_number || prof?.flat_number || "—",
            wing: b.wing || prof?.wing || "—",
            total: 0,
            count: 0,
          };
        }
        duesByResident[b.resident_id].total += Number(b.amount);
        duesByResident[b.resident_id].count++;
      });
      const pendingDuesByResident = Object.entries(duesByResident)
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.total - a.total);

      const totalMembers = members.length;
      const uniqueFlats = new Set(members.map((m: any) => m.flat_number).filter(Boolean)).size;
      const visitorsToday = visitors.filter((v: any) => new Date(v.created_at) >= today).length;
      const pendingComplaints = complaints.filter(
        (c: any) => c.status !== "resolved" && c.status !== "closed",
      ).length;
      const resolvedComplaints = complaints.filter(
        (c: any) => c.status === "resolved" || c.status === "closed",
      ).length;

      const maintenanceCollected = bills
        .filter((b: any) => b.status === "paid")
        .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

      const pendingMaintenance = bills
        .filter((b: any) => b.status !== "paid")
        .reduce((sum: number, b: any) => sum + Number(b.amount || 0), 0);

      const staffCount = staff.length;
      const bookingsToday = bookings.filter((b: any) => new Date(b.start_time) >= today).length;
      const occupiedParking = parking.filter(
        (p: any) => p.status === "assigned" || p.status === "occupied",
      ).length;
      const availableParking = Math.max(0, parking.length - occupiedParking);

      const monthlyBillsMap: Record<number, { month: string; collected: number; pending: number }> =
        {};
      for (let i = 1; i <= 12; i++) {
        monthlyBillsMap[i] = { month: MONTHS[i - 1], collected: 0, pending: 0 };
      }
      bills.forEach((b: any) => {
        if (b.month >= 1 && b.month <= 12) {
          if (b.status === "paid") monthlyBillsMap[b.month].collected += Number(b.amount || 0);
          else monthlyBillsMap[b.month].pending += Number(b.amount || 0);
        }
      });
      const maintenanceChart = Object.values(monthlyBillsMap);

      const visitorMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(5, 10);
        visitorMap[dateStr] = 0;
      }
      visitors.forEach((v: any) => {
        const dStr = new Date(v.created_at).toISOString().slice(5, 10);
        if (visitorMap[dStr] !== undefined) visitorMap[dStr]++;
      });
      const visitorsChart = Object.entries(visitorMap).map(([day, count]) => ({ day, count }));

      const complaintStatusMap: Record<string, number> = {};
      complaints.forEach((c: any) => {
        const s = c.status || "open";
        complaintStatusMap[s] = (complaintStatusMap[s] || 0) + 1;
      });
      const complaintStatusChart = Object.entries(complaintStatusMap).map(([name, value]) => ({
        name,
        value,
      }));

      const categoryMap: Record<string, number> = {};
      complaints.forEach((c: any) => {
        const cat = c.category || "other";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
      const complaintCategoryChart = Object.entries(categoryMap).map(([category, count]) => ({
        category,
        count,
      }));

      const parkingOccupancyChart = [
        { name: "Occupied", value: occupiedParking },
        { name: "Available", value: availableParking },
      ];

      // Facility Booking Statistics — group by status
      const bookingStatusMap: Record<string, number> = {};
      bookings.forEach((b: any) => {
        const s = (b.status || "pending").charAt(0).toUpperCase() + (b.status || "pending").slice(1);
        bookingStatusMap[s] = (bookingStatusMap[s] || 0) + 1;
      });
      const facilityBookingChart = Object.entries(bookingStatusMap).map(([status, count]) => ({
        status,
        count,
      }));

      // Monthly Member Registrations — last 6 months
      const regMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const dt = new Date();
        dt.setMonth(dt.getMonth() - i);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        regMap[key] = 0;
      }
      members.forEach((m: any) => {
        if (m.created_at) {
          const dt = new Date(m.created_at);
          const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
          if (regMap[key] !== undefined) regMap[key]++;
        }
      });
      const memberRegistrationChart = Object.entries(regMap).map(([month, count]) => ({
        month,
        count,
      }));

      return {
        totalMembers,
        uniqueFlats,
        visitorsToday,
        pendingComplaints,
        resolvedComplaints,
        maintenanceCollected,
        pendingMaintenance,
        staffCount,
        bookingsToday,
        occupiedParking,
        availableParking,
        maintenanceChart,
        visitorsChart,
        complaintStatusChart,
        complaintCategoryChart,
        parkingOccupancyChart,
        facilityBookingChart,
        memberRegistrationChart,
        pendingDuesByResident,
        notices: noticesRes.data ?? [],
        events: eventsRes.data ?? [],
      };
    },
    refetchInterval: 15000,
  });
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-2xl border border-border/80 bg-background/95 p-3 shadow-xl backdrop-blur-md">
        <p className="text-xs font-semibold text-muted-foreground mb-1">{label}</p>
        <div className="space-y-1">
          {payload.map((p: any, idx: number) => (
            <p
              key={idx}
              className="text-xs font-medium flex items-center gap-1.5"
              style={{ color: p.color || p.stroke }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ backgroundColor: p.color || p.stroke }}
              />
              {p.name}: {typeof p.value === "number" ? p.value.toLocaleString() : p.value}
            </p>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

function AdminPage() {
  const { data } = useAdminDashboardData();
  const d = data;
  const pieColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  return (
    <>
      <PageHeader
        title="Executive Overview"
        description="Live operations & metrics across all society modules."
      />

      {/* 11 Summary Metrics Grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        <StatCard
          label="Total Members"
          value={d?.totalMembers ?? "—"}
          hint="Registered users"
          Icon={Users}
        />
        <StatCard
          label="Total Flats"
          value={d?.uniqueFlats ?? "—"}
          hint="Occupied flats"
          Icon={Building}
        />
        <StatCard
          label="Visitors Today"
          value={d?.visitorsToday ?? "—"}
          hint="Gate entries"
          Icon={ShieldCheck}
        />
        <StatCard
          label="Pending Complaints"
          value={d?.pendingComplaints ?? "—"}
          hint="Awaiting action"
          Icon={MessageSquareWarning}
        />
        <StatCard
          label="Resolved Complaints"
          value={d?.resolvedComplaints ?? "—"}
          hint="Resolved"
          Icon={CheckCircle2}
        />
        <StatCard
          label="Maintenance Paid"
          value={INR.format(d?.maintenanceCollected ?? 0)}
          hint="Collected total"
          Icon={Wrench}
        />
        <StatCard
          label="Pending Dues"
          value={INR.format(d?.pendingMaintenance ?? 0)}
          hint="Uncollected"
          Icon={TrendingUp}
        />
        <StatCard
          label="Staff Members"
          value={d?.staffCount ?? "—"}
          hint="On roster"
          Icon={HardHat}
        />
        <StatCard
          label="Bookings Today"
          value={d?.bookingsToday ?? "—"}
          hint="Amenity usage"
          Icon={Home}
        />
        <StatCard
          label="Occupied Parking"
          value={d?.occupiedParking ?? "—"}
          hint="Slots filled"
          Icon={Car}
        />
        <StatCard
          label="Available Parking"
          value={d?.availableParking ?? "—"}
          hint="Free slots"
          Icon={Car}
        />
        <StatCard
          label="Upcoming Events"
          value={d?.events?.length ?? "—"}
          hint="Next scheduled"
          Icon={CalendarDays}
        />
      </div>

      {/* === Dashboard Charts === */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {/* 1. Monthly Maintenance Collection (Line Chart) */}
        <Panel title="Monthly Maintenance Collection (Line Chart)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={d?.maintenanceChart ?? []}
                margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" width={50} />
                <Tooltip content={<CustomTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Line
                  type="monotone"
                  dataKey="collected"
                  name="Collected (₹)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10B981" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
                <Line
                  type="monotone"
                  dataKey="pending"
                  name="Pending (₹)"
                  stroke="#EF4444"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 4, fill: "#EF4444" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* 2. Daily Visitors (Bar Chart) */}
        <Panel title="Daily Visitors (Bar Chart)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={d?.visitorsChart ?? []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar
                  dataKey="count"
                  name="Visitors"
                  fill="#3B82F6"
                  radius={[4, 4, 0, 0]}
                  maxBarSize={32}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* 3. Complaint Status (Pie Chart) */}
        <Panel title="Complaint Status (Pie Chart)">
          {d?.complaintStatusChart && d.complaintStatusChart.length ? (
            <div className="h-72 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={d.complaintStatusChart}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
                    paddingAngle={4}
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {d.complaintStatusChart.map((_: any, idx: number) => (
                      <Cell key={idx} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend iconType="circle" layout="horizontal" verticalAlign="bottom" wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No complaints logged yet.</p>
          )}
        </Panel>

        {/* 4. Complaint Categories (Bar Chart) */}
        <Panel title="Complaint Categories (Bar Chart)">
          {d?.complaintCategoryChart && d.complaintCategoryChart.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={d.complaintCategoryChart}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="category" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Complaints" fill="#F59E0B" radius={[4, 4, 0, 0]} maxBarSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No complaints logged yet.</p>
          )}
        </Panel>

        {/* 5. Facility Booking Statistics (Bar Chart) */}
        <Panel title="Facility Booking Statistics (Bar Chart)">
          {d?.facilityBookingChart && d.facilityBookingChart.length ? (
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={d.facilityBookingChart}
                  margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                  <XAxis dataKey="status" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                  <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" allowDecimals={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="count" name="Bookings" fill="#8B5CF6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <p className="py-12 text-center text-sm text-muted-foreground">No facility bookings yet.</p>
          )}
        </Panel>

        {/* 6. Monthly Member Registrations (Line Chart) */}
        <Panel title="Monthly Member Registrations (Line Chart)">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={d?.memberRegistrationChart ?? []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" />
                <YAxis tick={{ fontSize: 10 }} stroke="rgba(255,255,255,0.3)" allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="New Members"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#10B981" }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      {/* Pending Dues by Resident — Admin Power Panel */}
      <div className="mt-6">
        <Panel
          title="⚠️ Pending Dues by Resident"
          action={
            <Link
              to="/admin/maintenance"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              Manage All Bills <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {d?.pendingDuesByResident && d.pendingDuesByResident.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2 px-3 text-muted-foreground font-semibold">Resident</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-semibold">Wing</th>
                    <th className="text-center py-2 px-3 text-muted-foreground font-semibold">Flat No.</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Bills</th>
                    <th className="text-right py-2 px-3 text-muted-foreground font-semibold">Total Pending</th>
                    <th className="py-2 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {d.pendingDuesByResident.map((r: any) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/30 hover:bg-muted/20 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div className="flex items-center gap-1.5">
                          <AlertTriangle className="h-3 w-3 text-amber-400 shrink-0" />
                          {r.name}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-blue-500/15 px-2.5 py-0.5 text-xs font-bold text-blue-400 min-w-[2rem]">
                          {r.wing !== "—" ? r.wing : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="inline-flex items-center justify-center rounded-full bg-violet-500/15 px-2.5 py-0.5 text-xs font-bold text-violet-400 min-w-[2.5rem]">
                          {r.flat !== "—" ? r.flat : "—"}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right text-muted-foreground">{r.count}</td>
                      <td className="py-2.5 px-3 text-right font-bold text-red-400">
                        {INR.format(r.total)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <Link
                          to="/admin/maintenance"
                          className="inline-flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-xs text-primary hover:bg-primary/20 transition-colors"
                        >
                          <BadgeDollarSign className="h-3 w-3" /> View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-center gap-2">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="text-sm font-semibold text-foreground">All dues are cleared!</p>
              <p className="text-xs text-muted-foreground">No pending maintenance bills across all residents.</p>
            </div>
          )}
        </Panel>
      </div>

      {/* Quick Module Navigation & Recent Feed */}
      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Panel title="Quick Module Access">
          <div className="grid grid-cols-2 gap-2">
            {[
              { to: "/admin/residents", Icon: Users, label: "Members" },
              { to: "/admin/visitors", Icon: ShieldCheck, label: "Visitors" },
              { to: "/admin/maintenance", Icon: Wrench, label: "Maintenance" },
              { to: "/admin/complaints", Icon: MessageSquareWarning, label: "Complaints" },
              { to: "/admin/notices", Icon: Bell, label: "Notices" },
              { to: "/admin/staff", Icon: HardHat, label: "Staff" },
              { to: "/admin/parking", Icon: Car, label: "Parking" },
              { to: "/admin/facilities", Icon: Home, label: "Facilities" },
              { to: "/admin/events", Icon: CalendarDays, label: "Events" },
              { to: "/admin/reports", Icon: TrendingUp, label: "Analytics & Reports" },
            ].map(({ to, Icon, label }) => (
              <Link
                key={to}
                to={to}
                className="flex items-center gap-2 rounded-xl border bg-card px-3 py-2.5 text-xs font-semibold hover:bg-accent transition-colors"
              >
                <Icon className="h-4 w-4 text-primary" /> {label}
              </Link>
            ))}
          </div>
        </Panel>

        <Panel
          title="Latest Announcements"
          action={
            <Link
              to="/admin/notices"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {d?.notices?.length ? (
            <ul className="space-y-2">
              {d.notices.map((n: any) => (
                <li key={n.id} className="rounded-xl border bg-muted/30 p-2.5 text-xs">
                  <div className="font-semibold text-foreground truncate">
                    {n.pinned ? "📌 " : ""}
                    {n.title}
                  </div>
                  <div className="text-muted-foreground mt-1 capitalize">
                    Category: {n.category} ·{" "}
                    {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No active notices.</p>
          )}
        </Panel>

        <Panel
          title="Upcoming Community Events"
          action={
            <Link
              to="/admin/events"
              className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
            >
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          }
        >
          {d?.events?.length ? (
            <ul className="space-y-2">
              {d.events.map((e: any) => (
                <li key={e.id} className="rounded-xl border bg-muted/30 p-2.5 text-xs">
                  <div className="font-semibold text-foreground truncate">{e.title}</div>
                  <div className="text-muted-foreground mt-1">
                    📅 {new Date(e.event_date).toLocaleString()}{" "}
                    {e.location ? `📍 ${e.location}` : ""}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">No upcoming events.</p>
          )}
        </Panel>
      </div>
    </>
  );
}
