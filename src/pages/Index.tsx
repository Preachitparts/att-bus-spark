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
      <header className="py-6 sm:py-10">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-bold tracking-tight">
            Book your bus seat with ATT Transport
          </h1>
          <p className="mt-2 sm:mt-3 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Fast, reliable campus & city rides. Secure your seat in seconds.
          </p>
          <div className="mt-4 sm:mt-6 flex justify-center">
            <Button variant="hero" size="lg">Start Booking</Button>
          </div>
        </div>
      </header>

      <main className="pb-10 sm:pb-20 flex-1">
        <section className="container mx-auto px-4">
          <Card className="shadow-[var(--shadow-elegant)]">
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">Reserve your seat</CardTitle>
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
