import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { SeatMap, SeatStatus } from "@/components/SeatMap";
import jsPDF from "jspdf";

const schema = z.object({
  full_name: z.string().min(2),
  passenger_class: z.enum(["100","200","300","400","Non-Student"]),
  email: z.string().email(),
  phone: z.string().min(7),
  emergency_name: z.string().min(2),
  emergency_phone: z.string().min(7),
  pickup_point_id: z.string().uuid(),
  destination_id: z.string().uuid(),
  referral_id: z.string().uuid().optional().nullable(),
  bus_id: z.string().uuid(),
  seat_number: z.number().int().positive(),
});

export function BookingForm() {
  const [pickupPoints, setPickupPoints] = useState<{id:string;name:string}[]>([]);
  const [destinations, setDestinations] = useState<{id:string;name:string;price:number}[]>([]);
  const [referrals, setReferrals] = useState<{id:string;name:string}[]>([]);
  const [buses, setBuses] = useState<{id:string;name:string}[]>([]);
  const [seatStatus, setSeatStatus] = useState<SeatStatus[]>([]);
  const [selectedBus, setSelectedBus] = useState<string | null>(null);
  const [selectedDestination, setSelectedDestination] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const [selectedSeat, setSelectedSeat] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const { register, handleSubmit, formState: { errors }, setValue, watch, reset } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  const seat_number = watch("seat_number");

  useEffect(() => {
    async function load() {
      const [pp, ds, rf, bs] = await Promise.all([
        supabase.from("pickup_points").select("id,name").eq("active", true),
        supabase.from("destinations").select("id,name,price").eq("active", true),
        supabase.from("referrals").select("id,name").eq("active", true),
        supabase.from("buses").select("id,name").eq("active", true),
      ]);
      if (pp.error || ds.error || rf.error || bs.error) {
        toast({ title: "Load error", description: "Could not load booking data." });
        return;
      }
      setPickupPoints(pp.data || []);
      setDestinations(ds.data || []);
      setReferrals(rf.data || []);
      setBuses(bs.data || []);

      const defaultBus = bs.data?.[0]?.id || null;
      if (defaultBus) {
        setSelectedBus(defaultBus);
        setValue("bus_id", defaultBus as any);
        await refreshSeatStatus(defaultBus);
      }
    }
    load();
  }, [setValue]);

  useEffect(() => {
    if (!selectedDestination) return;
    const dest = destinations.find(d => d.id === selectedDestination);
    if (dest) setAmount(Number(dest.price));
  }, [selectedDestination, destinations]);

  async function refreshSeatStatus(busId: string) {
    const { data, error } = await supabase.rpc("get_seat_status", { _bus_id: busId });
    if (error) {
      toast({ title: "Seat map error", description: error.message });
      return;
    }
    setSeatStatus((data || []).map((d: any) => ({
      seat_number: d.seat_number,
      is_active: d.is_active,
      status: d.status,
    })));
  }

  const onSubmit = async (values: z.infer<typeof schema>) => {
    try {
      setSubmitting(true);
      const payload = { ...values, amount };
      const { data, error } = await supabase
        .from("bookings")
        .insert(payload as any)
        .select("id, payment_reference")
        .maybeSingle();

      if (error) throw error;

      toast({ title: "Booking created", description: "Proceed to payment to confirm your seat." });
      // For now, payment is pending Hubtel keys. Offer PDF ticket with Pending status.
      generatePDF(values.full_name, values.email, values.phone, values.seat_number, amount, "Pending");
      reset();
      setSelectedSeat(null);
      if (selectedBus) refreshSeatStatus(selectedBus);
    } catch (e: any) {
      toast({ title: "Booking failed", description: e.message });
    } finally {
      setSubmitting(false);
    }
  };

  function generatePDF(name: string, email: string, phone: string, seat: number, amt: number, status: string) {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text("ATT Transport - Ticket", 20, 20);
    doc.setFontSize(12);
    doc.text(`Passenger: ${name}`, 20, 35);
    doc.text(`Email: ${email}`, 20, 43);
    doc.text(`Phone: ${phone}`, 20, 51);
    doc.text(`Seat: ${seat}`, 20, 59);
    doc.text(`Amount: GHS ${amt.toFixed(2)}`, 20, 67);
    doc.text(`Status: ${status}`, 20, 75);
    doc.save(`ATT-ticket-seat-${seat}.pdf`);
  }

  return (
    <form className="grid grid-cols-1 md:grid-cols-2 gap-6" onSubmit={handleSubmit(onSubmit)}>
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="full_name">Full name</Label>
              <Input id="full_name" placeholder="e.g. Ama Mensah" {...register("full_name")} />
            </div>
            <div>
              <Label>Class</Label>
              <Select onValueChange={(v) => setValue("passenger_class", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select class" /></SelectTrigger>
                <SelectContent className="bg-background">
                  {(["100","200","300","400","Non-Student"] as const).map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@example.com" {...register("email")} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" placeholder="024..." {...register("phone")} />
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="emergency_name">Emergency contact</Label>
              <Input id="emergency_name" placeholder="Name" {...register("emergency_name")} />
            </div>
            <div>
              <Label htmlFor="emergency_phone">Emergency phone</Label>
              <Input id="emergency_phone" placeholder="024..." {...register("emergency_phone")} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Pickup point</Label>
              <Select onValueChange={(v) => setValue("pickup_point_id", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select pickup" /></SelectTrigger>
                <SelectContent className="bg-background">
                  {pickupPoints.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Destination</Label>
              <Select onValueChange={(v) => { setSelectedDestination(v); setValue("destination_id", v as any); }}>
                <SelectTrigger><SelectValue placeholder="Select destination" /></SelectTrigger>
                <SelectContent className="bg-background">
                  {destinations.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name} • GHS {Number(d.price).toFixed(2)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <Label>Referral</Label>
              <Select onValueChange={(v) => setValue("referral_id", v as any)}>
                <SelectTrigger><SelectValue placeholder="Select (optional)" /></SelectTrigger>
                <SelectContent className="bg-background">
                  {referrals.map(r => (
                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Bus</Label>
              <Select onValueChange={async (v) => { setSelectedBus(v); setValue("bus_id", v as any); await refreshSeatStatus(v); setSelectedSeat(null); }}>
                <SelectTrigger><SelectValue placeholder="Select bus" /></SelectTrigger>
                <SelectContent className="bg-background">
                  {buses.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Choose seat</Label>
            <SeatMap
              seats={seatStatus}
              selectedSeat={selectedSeat}
              onSelect={(s) => { setSelectedSeat(s); setValue("seat_number", s as any); }}
            />
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-sm text-muted-foreground">Amount</div>
            <div className="text-lg font-semibold">GHS {amount.toFixed(2)}</div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" variant="hero" disabled={submitting || !selectedSeat}>
              {submitting ? "Booking..." : "Book Seat"}
            </Button>
            <Button type="button" variant="outline" onClick={() => {
              toast({ title: "Enable payments", description: "Add Hubtel keys to enable payment & auto-confirmation." });
            }}>Proceed to Payment</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
