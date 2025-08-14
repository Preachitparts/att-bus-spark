import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { RefreshCw } from "lucide-react";

interface Bus {
  id: string;
  name: string;
  active: boolean;
}

interface Seat {
  id: string;
  seat_number: number;
  active: boolean;
  bus_id: string;
}

export default function Seats() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [seats, setSeats] = useState<Seat[]>([]);
  const [selectedBusId, setSelectedBusId] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadBuses();
  }, []);

  useEffect(() => {
    if (selectedBusId) {
      loadSeats(selectedBusId);
    }
  }, [selectedBusId]);

  async function loadBuses() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("buses")
        .select("id, name, active")
        .eq("active", true)
        .order("name");

      if (error) throw error;
      setBuses(data || []);
      
      if (data && data.length > 0 && !selectedBusId) {
        setSelectedBusId(data[0].id);
      }
    } catch (error) {
      console.error("Error loading buses:", error);
      toast({ title: "Error", description: "Failed to load buses" });
    } finally {
      setLoading(false);
    }
  }

  async function loadSeats(busId: string) {
    try {
      const { data, error } = await supabase
        .from("seats")
        .select("*")
        .eq("bus_id", busId)
        .order("seat_number");

      if (error) throw error;
      setSeats(data || []);
    } catch (error) {
      console.error("Error loading seats:", error);
      toast({ title: "Error", description: "Failed to load seats" });
    }
  }

  async function toggleSeatStatus(seatId: string, currentStatus: boolean) {
    try {
      setUpdating(seatId);
      const { error } = await supabase
        .from("seats")
        .update({ active: !currentStatus })
        .eq("id", seatId);

      if (error) throw error;

      setSeats(prev => prev.map(seat =>
        seat.id === seatId ? { ...seat, active: !currentStatus } : seat
      ));

      toast({ 
        title: "Success", 
        description: `Seat ${!currentStatus ? "activated" : "deactivated"} successfully` 
      });
    } catch (error) {
      console.error("Error updating seat:", error);
      toast({ title: "Error", description: "Failed to update seat status" });
    } finally {
      setUpdating(null);
    }
  }

  async function toggleAllSeats(activate: boolean) {
    if (!selectedBusId) return;

    try {
      const { error } = await supabase
        .from("seats")
        .update({ active: activate })
        .eq("bus_id", selectedBusId);

      if (error) throw error;

      setSeats(prev => prev.map(seat => ({ ...seat, active: activate })));
      toast({ 
        title: "Success", 
        description: `All seats ${activate ? "activated" : "deactivated"} successfully` 
      });
    } catch (error) {
      console.error("Error updating all seats:", error);
      toast({ title: "Error", description: "Failed to update all seats" });
    }
  }

  if (loading) {
    return (
      <div>
        <h1 className="text-2xl font-semibold mb-6">Manage Seats</h1>
        <div className="animate-pulse">
          <div className="h-10 bg-muted rounded mb-4"></div>
          <div className="grid grid-cols-8 gap-2">
            {[...Array(32)].map((_, i) => (
              <div key={i} className="h-12 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-semibold">Manage Seats</h1>
        <Button onClick={loadBuses} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Bus Selection */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Bus</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
            <Select value={selectedBusId} onValueChange={setSelectedBusId}>
              <SelectTrigger className="w-full sm:w-64">
                <SelectValue placeholder="Select a bus" />
              </SelectTrigger>
              <SelectContent>
                {buses.map((bus) => (
                  <SelectItem key={bus.id} value={bus.id}>
                    {bus.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            {selectedBusId && (
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllSeats(true)}
                >
                  Activate All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleAllSeats(false)}
                >
                  Deactivate All
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Seats Grid */}
      {selectedBusId && (
        <Card>
          <CardHeader>
            <CardTitle>
              Seat Configuration - {buses.find(b => b.id === selectedBusId)?.name}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {seats.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No seats found for this bus
              </p>
            ) : (
              <>
                <div className="mb-4 text-sm text-muted-foreground">
                  Active: {seats.filter(s => s.active).length} / {seats.length} seats
                </div>
                
                <div className="grid grid-cols-4 sm:grid-cols-8 gap-3">
                  {seats.map((seat) => (
                    <div
                      key={seat.id}
                      className={`
                        p-3 rounded-lg border text-center transition-all
                        ${seat.active 
                          ? 'bg-primary/10 border-primary text-primary' 
                          : 'bg-muted border-muted-foreground/20 text-muted-foreground'
                        }
                      `}
                    >
                      <div className="font-medium mb-2">{seat.seat_number}</div>
                      <Switch
                        checked={seat.active}
                        onCheckedChange={() => toggleSeatStatus(seat.id, seat.active)}
                        disabled={updating === seat.id}
                        size="sm"
                      />
                    </div>
                  ))}
                </div>
                
                <div className="mt-6 flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-primary/10 border border-primary rounded"></div>
                    <span>Active</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-muted border border-muted-foreground/20 rounded"></div>
                    <span>Inactive</span>
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}