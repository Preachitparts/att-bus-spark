-- Create core tables for ATT Transport bus booking
-- 1) Utility function for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2) Reference tables
CREATE TABLE IF NOT EXISTS public.pickup_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_pickup_points_updated
BEFORE UPDATE ON public.pickup_points
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.destinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  price NUMERIC(10,2) NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_destinations_updated
BEFORE UPDATE ON public.destinations
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_referrals_updated
BEFORE UPDATE ON public.referrals
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.bus_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  seat_count INTEGER NOT NULL,
  description TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_bus_types_updated
BEFORE UPDATE ON public.bus_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.buses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  bus_type_id UUID NOT NULL REFERENCES public.bus_types(id) ON DELETE RESTRICT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_buses_updated
BEFORE UPDATE ON public.buses
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.seats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bus_id UUID NOT NULL REFERENCES public.buses(id) ON DELETE CASCADE,
  seat_number INTEGER NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE (bus_id, seat_number)
);
CREATE TRIGGER trg_seats_updated
BEFORE UPDATE ON public.seats
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 3) Bookings table
CREATE TABLE IF NOT EXISTS public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL,
  passenger_class TEXT NOT NULL, -- e.g., 100/200/300/400/Non-Student
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  emergency_name TEXT NOT NULL,
  emergency_phone TEXT NOT NULL,
  pickup_point_id UUID NOT NULL REFERENCES public.pickup_points(id),
  destination_id UUID NOT NULL REFERENCES public.destinations(id),
  bus_id UUID NOT NULL REFERENCES public.buses(id),
  seat_number INTEGER NOT NULL,
  referral_id UUID REFERENCES public.referrals(id),
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | cancelled
  payment_reference TEXT,
  receipt_url TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
CREATE TRIGGER trg_bookings_updated
BEFORE UPDATE ON public.bookings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Prevent double booking for active seats
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_booking
ON public.bookings (bus_id, seat_number)
WHERE status IN ('pending','paid');

-- 4) RLS
ALTER TABLE public.pickup_points ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.destinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bus_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- Reference data: public can read, only authenticated can write
DO $$ BEGIN
  -- pickup_points
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pickup_points' AND policyname='Public can select pickup_points'
  ) THEN
    CREATE POLICY "Public can select pickup_points" ON public.pickup_points FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='pickup_points' AND policyname='Authenticated can modify pickup_points'
  ) THEN
    CREATE POLICY "Authenticated can modify pickup_points" ON public.pickup_points FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- destinations
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='destinations' AND policyname='Public can select destinations'
  ) THEN
    CREATE POLICY "Public can select destinations" ON public.destinations FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='destinations' AND policyname='Authenticated can modify destinations'
  ) THEN
    CREATE POLICY "Authenticated can modify destinations" ON public.destinations FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- referrals
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='referrals' AND policyname='Public can select referrals'
  ) THEN
    CREATE POLICY "Public can select referrals" ON public.referrals FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='referrals' AND policyname='Authenticated can modify referrals'
  ) THEN
    CREATE POLICY "Authenticated can modify referrals" ON public.referrals FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- bus_types
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bus_types' AND policyname='Public can select bus_types'
  ) THEN
    CREATE POLICY "Public can select bus_types" ON public.bus_types FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bus_types' AND policyname='Authenticated can modify bus_types'
  ) THEN
    CREATE POLICY "Authenticated can modify bus_types" ON public.bus_types FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- buses
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='buses' AND policyname='Public can select buses'
  ) THEN
    CREATE POLICY "Public can select buses" ON public.buses FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='buses' AND policyname='Authenticated can modify buses'
  ) THEN
    CREATE POLICY "Authenticated can modify buses" ON public.buses FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- seats
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seats' AND policyname='Public can select seats'
  ) THEN
    CREATE POLICY "Public can select seats" ON public.seats FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='seats' AND policyname='Authenticated can modify seats'
  ) THEN
    CREATE POLICY "Authenticated can modify seats" ON public.seats FOR ALL TO authenticated USING (true) WITH CHECK (true);
  END IF;

  -- bookings
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Anyone can create booking'
  ) THEN
    CREATE POLICY "Anyone can create booking" ON public.bookings FOR INSERT WITH CHECK (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Authenticated can read bookings'
  ) THEN
    CREATE POLICY "Authenticated can read bookings" ON public.bookings FOR SELECT TO authenticated USING (true);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='bookings' AND policyname='Authenticated can update bookings'
  ) THEN
    CREATE POLICY "Authenticated can update bookings" ON public.bookings FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 5) RPC to get seat status (no PII)
CREATE OR REPLACE FUNCTION public.get_seat_status(_bus_id UUID)
RETURNS TABLE(seat_number INTEGER, is_active BOOLEAN, status TEXT)
LANGUAGE sql
STABLE
AS $$
  SELECT s.seat_number,
         s.active as is_active,
         CASE WHEN EXISTS (
           SELECT 1 FROM public.bookings b
           WHERE b.bus_id = s.bus_id AND b.seat_number = s.seat_number AND b.status IN ('pending','paid')
         ) THEN 'taken' ELSE 'available' END as status
  FROM public.seats s
  WHERE s.bus_id = _bus_id
  ORDER BY s.seat_number;
$$;

-- 6) Seed minimal data if empty
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.bus_types WHERE name = 'Economical 32-seat') THEN
    INSERT INTO public.bus_types (name, seat_count, description, active) VALUES
    ('Economical 32-seat', 32, 'Comfortable 32-seater for economical trips', true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.buses) THEN
    INSERT INTO public.buses (name, bus_type_id, active)
    SELECT 'ATT-01', id, true FROM public.bus_types WHERE name = 'Economical 32-seat' LIMIT 1;
  END IF;

  -- Ensure seats exist for ATT-01
  PERFORM 1 FROM public.seats s JOIN public.buses b ON s.bus_id = b.id WHERE b.name='ATT-01';
  IF NOT FOUND THEN
    INSERT INTO public.seats (bus_id, seat_number, active)
    SELECT b.id, generate_series(1, bt.seat_count), true
    FROM public.buses b
    JOIN public.bus_types bt ON bt.id = b.bus_type_id
    WHERE b.name='ATT-01';
  END IF;

  -- Pickup points
  IF NOT EXISTS (SELECT 1 FROM public.pickup_points) THEN
    INSERT INTO public.pickup_points (name, active) VALUES
    ('Main Campus', true),
    ('City Center', true);
  END IF;

  -- Destinations
  IF NOT EXISTS (SELECT 1 FROM public.destinations) THEN
    INSERT INTO public.destinations (name, price, active) VALUES
    ('Kumasi', 80.00, true),
    ('Accra', 120.00, true);
  END IF;

  -- Referrals
  IF NOT EXISTS (SELECT 1 FROM public.referrals) THEN
    INSERT INTO public.referrals (name, active) VALUES
    ('SRC', true),
    ('Friend', true),
    ('Poster', true);
  END IF;
END $$;