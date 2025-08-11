import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookingForm } from "@/components/booking/BookingForm";

const Index = () => {
  useEffect(() => {
    document.title = "ATT Transport Bus Booking";
  }, []);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
            Book your bus seat with ATT Transport
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Fast, reliable campus & city rides. Secure your seat in seconds.
          </p>
          <div className="mt-6 flex justify-center">
            <Button variant="hero" size="lg">Start Booking</Button>
          </div>
        </div>
      </header>

      <main className="pb-20">
        <section className="container mx-auto px-4">
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle>Reserve your seat</CardTitle>
            </CardHeader>
            <CardContent>
              <BookingForm />
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Index;
