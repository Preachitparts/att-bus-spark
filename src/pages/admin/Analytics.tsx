import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";

interface AnalyticsData {
  totalRevenue: number;
  monthlyRevenue: { month: string; revenue: number }[];
  destinationStats: { name: string; bookings: number; revenue: number }[];
  statusStats: { status: string; count: number; percentage: number }[];
  dailyBookings: { date: string; bookings: number }[];
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

export default function Analytics() {
  const [data, setData] = useState<AnalyticsData>({
    totalRevenue: 0,
    monthlyRevenue: [],
    destinationStats: [],
    statusStats: [],
    dailyBookings: [],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, []);

  async function loadAnalytics() {
    try {
      setLoading(true);

      // Get all bookings with related data
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id, amount, status, created_at,
          destinations:destination_id(name)
        `);

      if (error) throw error;

      if (!bookings) {
        setLoading(false);
        return;
      }

      // Calculate total revenue (only paid bookings)
      const paidBookings = bookings.filter(b => b.status === 'paid');
      const totalRevenue = paidBookings.reduce((sum, b) => sum + Number(b.amount), 0);

      // Monthly revenue (last 6 months)
      const monthlyRevenue = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date();
        date.setMonth(date.getMonth() - i);
        const monthKey = date.toISOString().slice(0, 7); // YYYY-MM
        const monthName = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
        
        const monthRevenue = paidBookings
          .filter(b => b.created_at?.startsWith(monthKey))
          .reduce((sum, b) => sum + Number(b.amount), 0);
        
        monthlyRevenue.push({ month: monthName, revenue: monthRevenue });
      }

      // Destination statistics
      const destMap = new Map();
      bookings.forEach(booking => {
        const destName = (booking.destinations as any)?.name || 'Unknown';
        if (!destMap.has(destName)) {
          destMap.set(destName, { bookings: 0, revenue: 0 });
        }
        const stats = destMap.get(destName);
        stats.bookings += 1;
        if (booking.status === 'paid') {
          stats.revenue += Number(booking.amount);
        }
      });

      const destinationStats = Array.from(destMap.entries()).map(([name, stats]) => ({
        name,
        ...stats,
      }));

      // Status statistics
      const statusMap = new Map();
      bookings.forEach(booking => {
        const status = booking.status || 'unknown';
        statusMap.set(status, (statusMap.get(status) || 0) + 1);
      });

      const statusStats = Array.from(statusMap.entries()).map(([status, count]) => ({
        status,
        count,
        percentage: Math.round((count / bookings.length) * 100),
      }));

      // Daily bookings (last 7 days)
      const dailyBookings = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
        
        const dayBookings = bookings.filter(b => 
          b.created_at?.startsWith(dateKey)
        ).length;
        
        dailyBookings.push({ date: dayName, bookings: dayBookings });
      }

      setData({
        totalRevenue,
        monthlyRevenue,
        destinationStats,
        statusStats,
        dailyBookings,
      });
    } catch (error) {
      console.error("Error loading analytics:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Financial Analytics</h1>
        <div className="grid gap-6 md:grid-cols-2">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-4"></div>
                  <div className="h-32 bg-muted rounded"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold mb-6">Financial Analytics</h1>

      {/* Revenue Summary */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Total Revenue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold text-primary">
            GHS {data.totalRevenue.toFixed(2)}
          </div>
          <p className="text-muted-foreground">From paid bookings</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Monthly Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.monthlyRevenue}>
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line 
                    type="monotone" 
                    dataKey="revenue" 
                    stroke="hsl(var(--primary))" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Destination Statistics */}
        <Card>
          <CardHeader>
            <CardTitle>Revenue by Destination</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                revenue: {
                  label: "Revenue",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.destinationStats}>
                  <XAxis dataKey="name" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="revenue" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Booking Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Booking Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Count",
                  color: "hsl(var(--primary))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.statusStats}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ status, percentage }) => `${status} (${percentage}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {data.statusStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Daily Bookings */}
        <Card>
          <CardHeader>
            <CardTitle>Daily Bookings (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                bookings: {
                  label: "Bookings",
                  color: "hsl(var(--accent))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.dailyBookings}>
                  <XAxis dataKey="date" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="bookings" fill="hsl(var(--accent))" />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Destination Details Table */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Destination Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left p-2">Destination</th>
                  <th className="text-right p-2">Total Bookings</th>
                  <th className="text-right p-2">Revenue</th>
                  <th className="text-right p-2">Avg. per Booking</th>
                </tr>
              </thead>
              <tbody>
                {data.destinationStats.map((dest, index) => (
                  <tr key={index} className="border-b">
                    <td className="p-2 font-medium">{dest.name}</td>
                    <td className="p-2 text-right">{dest.bookings}</td>
                    <td className="p-2 text-right">GHS {dest.revenue.toFixed(2)}</td>
                    <td className="p-2 text-right">
                      GHS {dest.bookings > 0 ? (dest.revenue / dest.bookings).toFixed(2) : '0.00'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}