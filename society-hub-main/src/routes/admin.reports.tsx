import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Download, BarChart3, TrendingUp, PieChart as PieChartIcon } from "lucide-react";
import { AppShell, PageHeader, Panel, StatCard } from "@/components/AppShell";
import { RoleGate } from "@/components/RoleGate";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { downloadCsv, INR, monthLabel, MONTHS } from "@/lib/format";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

export const Route = createFileRoute("/admin/reports")({
  head: () => ({
    meta: [
      { title: "Reports & Analytics — SocietyOS Admin" },
      {
        name: "description",
        content:
          "Analytics and exportable reports for maintenance, complaints, visitors, bookings, parking and residents.",
      },
    ],
  }),
  component: Page,
});

async function fetchAll(table: string) {
  const { data } = await supabase
    .from(table as any)
    .select("*")
    .limit(5000);
  return data ?? [];
}

function Page() {
  const { data } = useQuery({
    queryKey: ["reports-analytics"],
    queryFn: async () => {
      const [bills, complaints, visitors, bookings, profiles, staff, parking] = await Promise.all([
        fetchAll("maintenance_bills"),
        fetchAll("complaints"),
        fetchAll("visitors"),
        fetchAll("facility_bookings"),
        fetchAll("profiles"),
        fetchAll("staff"),
        fetchAll("parking_slots"),
      ]);
      return { bills, complaints, visitors, bookings, profiles, staff, parking };
    },
  });

  // Chart 1: Maintenance Collection Bar Chart
  const collectedByMonth: any[] = [];
  if (data?.bills) {
    const map: Record<string, number> = {};
    data.bills
      .filter((b: any) => b.status === "paid")
      .forEach((b: any) => {
        const k = monthLabel(b.month, b.year);
        map[k] = (map[k] ?? 0) + Number(b.amount);
      });
    Object.entries(map).forEach(([k, v]) => collectedByMonth.push({ period: k, collected: v }));
  }

  // Chart 2: Daily Visitors Line Chart
  const visitorsByDay: any[] = [];
  if (data?.visitors) {
    const map: Record<string, number> = {};
    data.visitors.forEach((v: any) => {
      const d = new Date(v.created_at).toISOString().slice(0, 10);
      map[d] = (map[d] ?? 0) + 1;
    });
    Object.entries(map)
      .sort()
      .slice(-30)
      .forEach(([d, c]) => visitorsByDay.push({ day: d.slice(5), count: c }));
  }

  // Chart 3: Complaint Categories Bar Chart
  const complaintCats: any[] = [];
  if (data?.complaints) {
    const map: Record<string, number> = {};
    data.complaints.forEach((c: any) => {
      const cat = c.category || "other";
      map[cat] = (map[cat] ?? 0) + 1;
    });
    Object.entries(map).forEach(([cat, count]) => complaintCats.push({ category: cat, count }));
  }

  // Chart 4: Monthly Member Registrations Line Chart
  const registrationsByMonth: any[] = [];
  if (data?.profiles) {
    const map: Record<string, number> = {};
    data.profiles.forEach((p: any) => {
      const d = new Date(p.created_at || Date.now());
      const k = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
      map[k] = (map[k] ?? 0) + 1;
    });
    Object.entries(map).forEach(([month, count]) => registrationsByMonth.push({ month, count }));
  }

  // CSV Exporters
  const exportBills = () =>
    data &&
    downloadCsv(
      "maintenance-report.csv",
      data.bills.map((b: any) => ({
        id: b.id,
        flat: b.flat_number,
        wing: b.wing,
        month: b.month,
        year: b.year,
        amount: b.amount,
        status: b.status,
        paid_at: b.paid_at,
        receipt: b.receipt_no,
      })),
    );

  const exportComplaints = () =>
    data &&
    downloadCsv(
      "complaints-report.csv",
      data.complaints.map((c: any) => ({
        id: c.id,
        title: c.title,
        category: c.category,
        priority: c.priority,
        status: c.status,
        created_at: c.created_at,
      })),
    );

  const exportVisitors = () =>
    data &&
    downloadCsv(
      "visitors-report.csv",
      data.visitors.map((v: any) => ({
        id: v.id,
        name: v.visitor_name,
        phone: v.visitor_phone,
        type: v.visitor_type,
        purpose: v.purpose,
        flat: v.flat_number,
        wing: v.wing,
        status: v.status,
        entry: v.entry_time,
        exit: v.exit_time,
      })),
    );

  const exportBookings = () =>
    data &&
    downloadCsv(
      "bookings-report.csv",
      data.bookings.map((b: any) => ({
        id: b.id,
        facility: b.facility_id,
        resident: b.resident_id,
        start: b.start_time,
        end: b.end_time,
        status: b.status,
      })),
    );

  const exportResidents = () =>
    data &&
    downloadCsv(
      "residents-report.csv",
      data.profiles.map((p: any) => ({
        id: p.id,
        name: p.full_name,
        email: p.email,
        phone: p.phone,
        flat: p.flat_number,
        wing: p.wing,
        vehicle: p.vehicle_number,
        occupation: p.occupation,
      })),
    );

  const paid = (data?.bills ?? [])
    .filter((b: any) => b.status === "paid")
    .reduce((a: number, b: any) => a + Number(b.amount), 0);
  const pending = (data?.bills ?? [])
    .filter((b: any) => b.status !== "paid")
    .reduce((a: number, b: any) => a + Number(b.amount), 0);
  const openComplaints = (data?.complaints ?? []).filter(
    (c: any) => c.status !== "resolved" && c.status !== "closed",
  ).length;

  return (
    <>
      <PageHeader
        title="Reports & Analytics"
        description="Interactive charts, statistics, and downloadable CSV reports for all society data."
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-4">
        <StatCard label="Total Residents" value={data?.profiles.length ?? "—"} Icon={BarChart3} />
        <StatCard label="Total Maintenance Paid" value={INR.format(paid)} Icon={TrendingUp} />
        <StatCard label="Pending Dues" value={INR.format(pending)} Icon={BarChart3} />
        <StatCard label="Open Complaints" value={openComplaints} Icon={PieChartIcon} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Chart 1 */}
        <Panel title="Monthly Maintenance Collection (Bar Chart)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={collectedByMonth}>
                <XAxis dataKey="period" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={50} />
                <Tooltip />
                <Bar
                  dataKey="collected"
                  name="Collection (₹)"
                  fill="#10B981"
                  radius={[6, 6, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Chart 2 */}
        <Panel title="Daily Visitor Traffic (Line Chart)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorsByDay}>
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="Visitors"
                  stroke="#3B82F6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Chart 3 */}
        <Panel title="Complaints by Category (Bar Chart)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={complaintCats}>
                <XAxis dataKey="category" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Bar dataKey="count" name="Count" fill="#F59E0B" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        {/* Chart 4 */}
        <Panel title="Monthly Member Registrations (Line Chart)">
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={registrationsByMonth}>
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} width={30} />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="count"
                  name="New Registrations"
                  stroke="#8B5CF6"
                  strokeWidth={2.5}
                  dot={{ r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4">
        <Panel title="Exportable Spreadsheet Reports">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" className="rounded-full" onClick={exportBills}>
              <Download className="mr-1 h-4 w-4" /> Maintenance CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={exportComplaints}>
              <Download className="mr-1 h-4 w-4" /> Complaints CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={exportVisitors}>
              <Download className="mr-1 h-4 w-4" /> Visitors CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={exportBookings}>
              <Download className="mr-1 h-4 w-4" /> Bookings CSV
            </Button>
            <Button variant="outline" className="rounded-full" onClick={exportResidents}>
              <Download className="mr-1 h-4 w-4" /> Residents CSV
            </Button>
          </div>
        </Panel>
      </div>
    </>
  );
}
