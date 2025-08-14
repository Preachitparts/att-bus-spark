import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Search, RefreshCw, Mail, Phone } from "lucide-react";

interface Customer {
  full_name: string;
  email: string;
  phone: string;
  passenger_class: string;
  total_bookings: number;
  total_spent: number;
  last_booking: string;
  bookings: {
    id: string;
    status: string;
    amount: number;
    created_at: string;
    destination: { name: string } | null;
  }[];
}

export default function Customers() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    loadCustomers();
  }, []);

  useEffect(() => {
    filterCustomers();
  }, [customers, searchTerm]);

  async function loadCustomers() {
    try {
      setLoading(true);
      
      // Get all bookings with customer and destination info
      const { data: bookings, error } = await supabase
        .from("bookings")
        .select(`
          id, full_name, email, phone, passenger_class, amount, status, created_at,
          destinations:destination_id(name)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Group bookings by customer (email as unique identifier)
      const customerMap = new Map<string, Customer>();

      (bookings || []).forEach(booking => {
        const key = booking.email.toLowerCase();
        
        if (!customerMap.has(key)) {
          customerMap.set(key, {
            full_name: booking.full_name,
            email: booking.email,
            phone: booking.phone,
            passenger_class: booking.passenger_class,
            total_bookings: 0,
            total_spent: 0,
            last_booking: booking.created_at,
            bookings: [],
          });
        }

        const customer = customerMap.get(key)!;
        customer.total_bookings += 1;
        
        if (booking.status === 'paid') {
          customer.total_spent += Number(booking.amount);
        }

        // Update last booking date if this booking is more recent
        if (booking.created_at > customer.last_booking) {
          customer.last_booking = booking.created_at;
        }

        customer.bookings.push({
          id: booking.id,
          status: booking.status,
          amount: Number(booking.amount),
          created_at: booking.created_at,
          destination: booking.destinations as any,
        });
      });

      const customerList = Array.from(customerMap.values())
        .sort((a, b) => new Date(b.last_booking).getTime() - new Date(a.last_booking).getTime());

      setCustomers(customerList);
    } catch (error) {
      console.error("Error loading customers:", error);
      toast({ title: "Error", description: "Failed to load customers" });
    } finally {
      setLoading(false);
    }
  }

  function filterCustomers() {
    if (!searchTerm) {
      setFilteredCustomers(customers);
      return;
    }

    const filtered = customers.filter(customer =>
      customer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.phone.includes(searchTerm)
    );

    setFilteredCustomers(filtered);
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Manage Customers</h1>
        <div className="animate-pulse space-y-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-32 bg-muted rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Customers</h1>
        <Button onClick={loadCustomers} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search customers by name, email, or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Customer Stats */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{customers.length}</div>
            <p className="text-muted-foreground">Total Customers</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {customers.reduce((sum, c) => sum + c.total_bookings, 0)}
            </div>
            <p className="text-muted-foreground">Total Bookings</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-primary">
              GHS {customers.reduce((sum, c) => sum + c.total_spent, 0).toFixed(2)}
            </div>
            <p className="text-muted-foreground">Total Revenue</p>
          </CardContent>
        </Card>
      </div>

      {/* Customers List */}
      <div className="space-y-4">
        {filteredCustomers.length === 0 ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-muted-foreground">
                {searchTerm ? "No customers found matching your search" : "No customers found"}
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredCustomers.map((customer, index) => (
            <Card key={index}>
              <CardContent className="pt-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Customer Info */}
                  <div>
                    <h3 className="font-semibold text-lg mb-2">{customer.full_name}</h3>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4" />
                        <span>{customer.email}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>{customer.phone}</span>
                      </div>
                      <div>
                        <span className="font-medium">Class:</span> {customer.passenger_class}
                      </div>
                      <div>
                        <span className="font-medium">Last Booking:</span>{" "}
                        {new Date(customer.last_booking).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex gap-4 mt-4">
                      <div className="text-center">
                        <div className="text-lg font-semibold">{customer.total_bookings}</div>
                        <div className="text-xs text-muted-foreground">Bookings</div>
                      </div>
                      <div className="text-center">
                        <div className="text-lg font-semibold text-primary">
                          GHS {customer.total_spent.toFixed(2)}
                        </div>
                        <div className="text-xs text-muted-foreground">Total Spent</div>
                      </div>
                    </div>
                  </div>

                  {/* Recent Bookings */}
                  <div>
                    <h4 className="font-medium mb-3">Recent Bookings</h4>
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {customer.bookings.slice(0, 5).map((booking) => (
                        <div key={booking.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                          <div>
                            <div className="text-sm font-medium">
                              {booking.destination?.name || 'Unknown'}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {new Date(booking.created_at).toLocaleDateString()}
                            </div>
                          </div>
                          <div className="text-right">
                            <Badge 
                              variant={booking.status === 'paid' ? 'default' : 
                                      booking.status === 'pending' ? 'secondary' : 'destructive'}
                              className="text-xs"
                            >
                              {booking.status}
                            </Badge>
                            <div className="text-xs font-medium mt-1">
                              GHS {booking.amount.toFixed(2)}
                            </div>
                          </div>
                        </div>
                      ))}
                      {customer.bookings.length > 5 && (
                        <div className="text-xs text-muted-foreground text-center py-1">
                          +{customer.bookings.length - 5} more bookings
                        </div>
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