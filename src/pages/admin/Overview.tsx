import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

interface Stats {
  totalBookings: number;
  paidBookings: number;
  pendingBookings: number;
  totalRevenue: number;
  todayBookings: number;
}

interface RecentBooking {
  id: string;
  full_name: string;
  status: string;
  amount: number;
  created_at: string;
  destination: { name: string } | null;
  pickup_point: { name: string } | null;
}

export default function Overview() {
  const [stats, setStats] = useState<Stats>({
    totalBookings: 0,
    paidBookings: 0,
    pendingBookings: 0,
    totalRevenue: 0,
    todayBookings: 0,
  });
  const [recentBookings, setRecentBookings] = useState<RecentBooking[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      // Get stats
      const { data: bookings } = await supabase
        .from("bookings")
        .select("status, amount, created_at");

      if (bookings) {
        const today = new Date().toISOString().split('T')[0];
        const todayBookings = bookings.filter(b => 
          b.created_at?.startsWith(today)
        ).length;

        const paidBookings = bookings.filter(b => b.status === 'paid');
        const totalRevenue = paidBookings.reduce((sum, b) => sum + Number(b.amount), 0);

        setStats({
          totalBookings: bookings.length,
          paidBookings: paidBookings.length,
          pendingBookings: bookings.filter(b => b.status === 'pending').length,
          totalRevenue,
          todayBookings,
        });
      }

      // Get recent bookings
      const { data: recent } = await supabase
        .from("bookings")
        .select(`
          id, full_name, status, amount, created_at,
          destinations:destination_id(name),
          pickup_points:pickup_point_id(name)
        `)
        .order("created_at", { ascending: false })
        .limit(5);

      if (recent) {
        setRecentBookings(recent.map(b => ({
          ...b,
          destination: b.destinations as any,
          pickup_point: b.pickup_points as any,
        })));
      }
    } catch (error) {
      console.error("Error loading overview data:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Overview</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="animate-pulse">
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-8 bg-muted rounded w-1/2"></div>
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
      <h1 className="text-2xl font-semibold mb-6">Overview</h1>
      
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalBookings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.paidBookings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Bookings</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pendingBookings}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">GHS {stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Stats */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Today's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">{stats.todayBookings}</div>
          <p className="text-muted-foreground">New bookings today</p>
        </CardContent>
      </Card>

      {/* Recent Bookings */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentBookings.length === 0 ? (
              <p className="text-muted-foreground">No bookings yet</p>
            ) : (
              recentBookings.map((booking) => (
                <div key={booking.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{booking.full_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.pickup_point?.name} → {booking.destination?.name}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(booking.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <Badge variant={booking.status === 'paid' ? 'default' : 'secondary'}>
                      {booking.status}
                    </Badge>
                    <p className="text-sm font-medium mt-1">GHS {Number(booking.amount).toFixed(2)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}