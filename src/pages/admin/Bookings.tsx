import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, Download, RefreshCw } from "lucide-react";

interface Booking {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  passenger_class: string;
  seat_number: number;
  amount: number;
  status: string;
  payment_reference: string | null;
  created_at: string;
  destination: { name: string } | null;
  pickup_point: { name: string } | null;
  bus: { name: string } | null;
}

export default function Bookings() {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  useEffect(() => {
    loadBookings();
  }, []);

  useEffect(() => {
    filterBookings();
  }, [bookings, searchTerm, statusFilter]);

  async function loadBookings() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("bookings")
        .select(`
          id, full_name, email, phone, passenger_class, seat_number, 
          amount, status, payment_reference, created_at,
          destinations:destination_id(name),
          pickup_points:pickup_point_id(name),
          buses:bus_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedBookings = (data || []).map(booking => ({
        ...booking,
        destination: booking.destinations as any,
        pickup_point: booking.pickup_points as any,
        bus: booking.buses as any,
      }));

      setBookings(formattedBookings);
    } catch (error) {
      console.error("Error loading bookings:", error);
      toast({ title: "Error", description: "Failed to load bookings" });
    } finally {
      setLoading(false);
    }
  }

  function filterBookings() {
    let filtered = bookings;

    if (searchTerm) {
      filtered = filtered.filter(booking =>
        booking.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        booking.phone.includes(searchTerm) ||
        booking.id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(booking => booking.status === statusFilter);
    }

    setFilteredBookings(filtered);
  }

  async function updateBookingStatus(bookingId: string, newStatus: string) {
    try {
      const { error } = await supabase
        .from("bookings")
        .update({ status: newStatus })
        .eq("id", bookingId);

      if (error) throw error;

      setBookings(prev => prev.map(booking =>
        booking.id === bookingId ? { ...booking, status: newStatus } : booking
      ));

      toast({ title: "Success", description: "Booking status updated" });
    } catch (error) {
      console.error("Error updating booking:", error);
      toast({ title: "Error", description: "Failed to update booking status" });
    }
  }

  function exportBookings() {
    const csvContent = [
      ["ID", "Name", "Email", "Phone", "Class", "Pickup", "Destination", "Bus", "Seat", "Amount", "Status", "Date"].join(","),
      ...filteredBookings.map(booking => [
        booking.id,
        booking.full_name,
        booking.email,
        booking.phone,
        booking.passenger_class,
        booking.pickup_point?.name || "",
        booking.destination?.name || "",
        booking.bus?.name || "",
        booking.seat_number,
        booking.amount,
        booking.status,
        new Date(booking.created_at).toLocaleDateString()
      ].join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `bookings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Bookings</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-20 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Bookings</h1>
        <div className="flex gap-2">
          <Button onClick={loadBookings} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button onClick={exportBookings} variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, phone, or booking ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Bookings List */}
      <div className="space-y-4">
        {filteredBookings.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">No bookings found</p>
            </CardContent>
          </Card>
        ) : (
          filteredBookings.map((booking) => (
            <Card key={booking.id}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <h3 className="font-semibold">{booking.full_name}</h3>
                    <p className="text-sm text-muted-foreground">{booking.email}</p>
                    <p className="text-sm text-muted-foreground">{booking.phone}</p>
                    <p className="text-sm text-muted-foreground">Class: {booking.passenger_class}</p>
                  </div>
                  
                  <div>
                    <p className="text-sm"><strong>Route:</strong> {booking.pickup_point?.name} → {booking.destination?.name}</p>
                    <p className="text-sm"><strong>Bus:</strong> {booking.bus?.name}</p>
                    <p className="text-sm"><strong>Seat:</strong> {booking.seat_number}</p>
                    <p className="text-sm"><strong>Amount:</strong> GHS {Number(booking.amount).toFixed(2)}</p>
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <Badge variant={booking.status === 'paid' ? 'default' : booking.status === 'pending' ? 'secondary' : 'destructive'}>
                        {booking.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(booking.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    
                    {booking.payment_reference && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {booking.payment_reference}
                      </p>
                    )}
                    
                    <div className="flex gap-2 mt-2">
                      {booking.status === 'pending' && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => updateBookingStatus(booking.id, 'paid')}
                          >
                            Mark Paid
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => updateBookingStatus(booking.id, 'cancelled')}
                          >
                            Cancel
                          </Button>
                        </>
                      )}
                      {booking.status === 'cancelled' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateBookingStatus(booking.id, 'pending')}
                        >
                          Restore
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}