-- Enable needed extension for password hashing
create extension if not exists pgcrypto;

-- Create admin role enum if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'admin_role') THEN
    CREATE TYPE public.admin_role AS ENUM ('super_admin','admin');
  END IF;
END $$;

-- Create att_admins table
CREATE TABLE IF NOT EXISTS public.att_admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  role public.admin_role NOT NULL DEFAULT 'admin',
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Unique index over lower(email) for case-insensitive uniqueness
CREATE UNIQUE INDEX IF NOT EXISTS att_admins_email_unique ON public.att_admins ((lower(email)));

-- Enable RLS
ALTER TABLE public.att_admins ENABLE ROW LEVEL SECURITY;

-- Basic policies (adjust later as needed)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'att_admins' AND policyname = 'Authenticated can select att_admins'
  ) THEN
    CREATE POLICY "Authenticated can select att_admins" ON public.att_admins
    FOR SELECT TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'att_admins' AND policyname = 'Authenticated can insert att_admins'
  ) THEN
    CREATE POLICY "Authenticated can insert att_admins" ON public.att_admins
    FOR INSERT TO authenticated WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'att_admins' AND policyname = 'Authenticated can update att_admins'
  ) THEN
    CREATE POLICY "Authenticated can update att_admins" ON public.att_admins
    FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'att_admins' AND policyname = 'Authenticated can delete att_admins'
  ) THEN
    CREATE POLICY "Authenticated can delete att_admins" ON public.att_admins
    FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

-- Trigger for updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'update_att_admins_updated_at'
  ) THEN
    CREATE TRIGGER update_att_admins_updated_at
    BEFORE UPDATE ON public.att_admins
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Seed Super Admin (only if it does not already exist)
INSERT INTO public.att_admins (email, name, role, password_hash)
SELECT 'admin@atttransport.com', 'Fiifi', 'super_admin', crypt('admin123', gen_salt('bf'))
WHERE NOT EXISTS (
  SELECT 1 FROM public.att_admins WHERE lower(email) = lower('admin@atttransport.com')
);
