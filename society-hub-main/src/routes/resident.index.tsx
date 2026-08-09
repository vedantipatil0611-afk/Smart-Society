import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CreditCard, MessageSquareWarning, CalendarDays, Bell, ShieldCheck, LayoutDashboard } from "lucide-react";
import { Panel, StatCard, PageHeader } from "@/components/AppShell";
import { useAuth } from "@/lib/auth-context";
import { supabase } from "@/integrations/supabase/client";
import { INR, monthLabel, MONTHS } from "@/lib/format";
import { formatDistanceToNow } from "date-fns";
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

export const Route = createFileRoute("/resident/")({
  head: () => ({
    meta: [
      { title: "My home — SocietyOS" },
      {
        name: "description",
        content: "Your maintenance, complaints, notices, events and society statistics.",
      },
    ],
  }),
  component: Page,
});

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

function Page() {
  const { user, roles } = useAuth();
  const name = user?.user_metadata?.full_name || user?.email?.split("@")[0];
  const pieColors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6"];

  const { data } = useQuery({
    queryKey: ["resident-dash", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const uid = user!.id;
      const [
        billsRes,
        complaintsRes,
        visitorsRes,
        noticesRes,
        eventsRes,
        allBillsRes,
        allVisitorsRes,
        allComplaintsRes,
        allBookingsRes,
        allProfilesRes,
      ] = await Promise.all([
        supabase
          .from("maintenance_bills")
          .select("*")
          .eq("resident_id", uid)
          .order("year", { ascending: false })
          .order("month", { ascending: false })
          .limit(6),
        supabase
          .from("complaints")
          .select("*")
          .eq("resident_id", uid)
          .order("created_at", { ascending: false })
          .limit(5),
        supabase
          .from("visitors")
          .select("*")
          .eq("host_resident_id", uid)
          .eq("status", "pending")
          .order("created_at", { ascending: false }),
        supabase
          .from("notices")
          .select("*")
          .order("pinned", { ascending: false })
          .order("created_at", { ascending: false })
          .limit(4),
        supabase
          .from("events")
          .select("*")
          .gte("event_date", new Date().toISOString())
          .order("event_date")
          .limit(4),
        supabase.from("maintenance_bills").select("id,amount,status,month,year"),
        supabase.from("visitors").select("id,status,created_at"),
        supabase.from("complaints").select("id,status,category,created_at"),
        supabase.from("facility_bookings").select("id,status,start_time,created_at"),
        supabase.from("profiles").select("id,created_at"),
      ]);

      const allBills = allBillsRes.data ?? [];
      const allVisitors = allVisitorsRes.data ?? [];
      const allComplaints = allComplaintsRes.data ?? [];
      const allBookings = allBookingsRes.data ?? [];
      const allProfiles = allProfilesRes.data ?? [];

      // 1. Monthly Maintenance Collection (Line Chart)
      const monthlyBillsMap: Record<number, { month: string; collected: number; pending: number }> = {};
      for (let i = 1; i <= 12; i++) {
        monthlyBillsMap[i] = { month: MONTHS[i - 1], collected: 0, pending: 0 };
      }
      allBills.forEach((b: any) => {
        if (b.month >= 1 && b.month <= 12) {
          if (b.status === "paid") monthlyBillsMap[b.month].collected += Number(b.amount || 0);
          else monthlyBillsMap[b.month].pending += Number(b.amount || 0);
        }
      });
      const maintenanceChart = Object.values(monthlyBillsMap);

      // 2. Daily Visitors (Bar Chart)
      const visitorMap: Record<string, number> = {};
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().slice(5, 10);
        visitorMap[dateStr] = 0;
      }
      allVisitors.forEach((v: any) => {
        const dStr = new Date(v.created_at).toISOString().slice(5, 10);
        if (visitorMap[dStr] !== undefined) visitorMap[dStr]++;
      });
      const visitorsChart = Object.entries(visitorMap).map(([day, count]) => ({ day, count }));

      // 3. Complaint Status (Pie Chart)
      const complaintStatusMap: Record<string, number> = {};
      allComplaints.forEach((c: any) => {
        const s = c.status || "open";
        complaintStatusMap[s] = (complaintStatusMap[s] || 0) + 1;
      });
      const complaintStatusChart = Object.entries(complaintStatusMap).map(([name, value]) => ({
        name,
        value,
      }));

      // 4. Complaint Categories (Bar Chart)
      const categoryMap: Record<string, number> = {};
      allComplaints.forEach((c: any) => {
        const cat = c.category || "other";
        categoryMap[cat] = (categoryMap[cat] || 0) + 1;
      });
      const complaintCategoryChart = Object.entries(categoryMap).map(([category, count]) => ({
        category,
        count,
      }));

      // 5. Facility Booking Statistics (Bar Chart)
      const bookingStatusMap: Record<string, number> = {};
      allBookings.forEach((b: any) => {
        const s = (b.status || "pending").charAt(0).toUpperCase() + (b.status || "pending").slice(1);
        bookingStatusMap[s] = (bookingStatusMap[s] || 0) + 1;
      });
      const facilityBookingChart = Object.entries(bookingStatusMap).map(([status, count]) => ({
        status,
        count,
      }));

      // 6. Monthly Member Registrations (Line Chart)
      const regMap: Record<string, number> = {};
      for (let i = 5; i >= 0; i--) {
        const dt = new Date();
        dt.setMonth(dt.getMonth() - i);
        const key = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}`;
        regMap[key] = 0;
      }
      allProfiles.forEach((m: any) => {
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
        bills: billsRes.data ?? [],
        complaints: complaintsRes.data ?? [],
        pendingVisitors: visitorsRes.data ?? [],
        notices: noticesRes.data ?? [],
        events: eventsRes.data ?? [],
        maintenanceChart,
        visitorsChart,
        complaintStatusChart,
        complaintCategoryChart,
        facilityBookingChart,
        memberRegistrationChart,
      };
    },
  });

  const dues = (data?.bills ?? [])
    .filter((b: any) => b.status !== "paid")
    .reduce((a: number, b: any) => a + Number(b.amount), 0);
  const openComplaints = (data?.complaints ?? []).filter(
    (c: any) => c.status !== "resolved" && c.status !== "closed",
  ).length;

  const isAdmin = roles.includes("admin") || roles.includes("super_admin");

  return (
    <>
      <PageHeader
        title={`Welcome${name ? `, ${name}` : ""}.`}
        description="Everything about your flat and society statistics, in one place."
        action={
          isAdmin ? (
            <Link
              to="/admin"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 transition-colors shadow-md"
            >
              <LayoutDashboard className="h-4 w-4" /> Open Admin Portal
            </Link>
          ) : undefined
        }
      />

      {/* Summary Stat Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Dues" value={INR.format(dues)} hint="Outstanding" Icon={CreditCard} />
        <StatCard label="Open complaints" value={openComplaints} Icon={MessageSquareWarning} />
        <StatCard
          label="Pending visitors"
          value={data?.pendingVisitors.length ?? 0}
          Icon={ShieldCheck}
        />
        <StatCard label="Upcoming events" value={data?.events.length ?? 0} Icon={CalendarDays} />
      </div>

      {/* Quick Resident Panels */}
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Panel
          title="Latest bills"
          action={
            <Link to="/resident/maintenance" className="text-xs text-primary underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y">
            {(data?.bills ?? []).slice(0, 4).map((b: any) => (
              <li key={b.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">{monthLabel(b.month, b.year)}</div>
                  <div className="text-xs text-muted-foreground">{b.status}</div>
                </div>
                <div className="font-semibold">{INR.format(b.amount)}</div>
              </li>
            ))}
            {!data?.bills.length && (
              <li className="py-4 text-sm text-muted-foreground">No bills yet.</li>
            )}
          </ul>
        </Panel>

        <Panel
          title="Your complaints"
          action={
            <Link to="/resident/complaints" className="text-xs text-primary underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y">
            {(data?.complaints ?? []).slice(0, 4).map((c: any) => (
              <li key={c.id} className="py-2 text-sm">
                <div className="font-medium">{c.title}</div>
                <div className="text-xs text-muted-foreground">
                  {c.status} · {formatDistanceToNow(new Date(c.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
            {!data?.complaints.length && (
              <li className="py-4 text-sm text-muted-foreground">
                You haven't raised any complaints.
              </li>
            )}
          </ul>
        </Panel>

        <Panel
          title="Notices"
          action={
            <Link to="/resident/notices" className="text-xs text-primary underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y">
            {(data?.notices ?? []).map((n: any) => (
              <li key={n.id} className="py-2 text-sm">
                <div className="font-medium">
                  {n.pinned ? "📌 " : ""}
                  {n.title}
                </div>
                <div className="text-xs text-muted-foreground">
                  {n.category} · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                </div>
              </li>
            ))}
            {!data?.notices.length && (
              <li className="py-4 text-sm text-muted-foreground">
                Nothing new. <Bell className="inline h-3 w-3" />
              </li>
            )}
          </ul>
        </Panel>

        <Panel
          title="Upcoming events"
          action={
            <Link to="/resident/events" className="text-xs text-primary underline">
              View all
            </Link>
          }
        >
          <ul className="divide-y">
            {(data?.events ?? []).map((e: any) => (
              <li key={e.id} className="py-2 text-sm">
                <div className="font-medium">{e.title}</div>
                <div className="text-xs text-muted-foreground">
                  {new Date(e.event_date).toLocaleString()} {e.location ? `· ${e.location}` : ""}
                </div>
              </li>
            ))}
            {!data?.events.length && (
              <li className="py-4 text-sm text-muted-foreground">Nothing scheduled.</li>
            )}
          </ul>
        </Panel>
      </div>

      {/* === Society Analytics Graphs (6 Requested Charts) === */}
      <div className="mt-8">
        <h3 className="text-lg font-bold text-foreground mb-1">Society Statistics & Analytics</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Real-time charts across maintenance, traffic, complaints, and bookings.
        </p>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* 1. Monthly Maintenance Collection (Line Chart) */}
          <Panel title="Monthly Maintenance Collection (Line Chart)">
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={data?.maintenanceChart ?? []}
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
                  data={data?.visitorsChart ?? []}
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
            {data?.complaintStatusChart && data.complaintStatusChart.length ? (
              <div className="h-72 flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={data.complaintStatusChart}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={4}
                      label={({ name, value }) => `${name}: ${value}`}
                    >
                      {data.complaintStatusChart.map((_: any, idx: number) => (
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
            {data?.complaintCategoryChart && data.complaintCategoryChart.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.complaintCategoryChart}
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
            {data?.facilityBookingChart && data.facilityBookingChart.length ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.facilityBookingChart}
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
                  data={data?.memberRegistrationChart ?? []}
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
      </div>
    </>
  );
}
