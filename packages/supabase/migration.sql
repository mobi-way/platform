-- ============================================================================
-- Mobi Way Platform — Supabase Migration
-- Execute this in Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================================

-- 1. PROFILES — extends auth.users with role, name, phone, bus_id
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'passenger', 'driver')) DEFAULT 'passenger',
  full_name TEXT,
  phone TEXT,
  bus_id TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. BUS_LINES
CREATE TABLE IF NOT EXISTS public.bus_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#3b82f6',
  route_geojson JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. BUS_STOPS
CREATE TABLE IF NOT EXISTS public.bus_stops (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lon DOUBLE PRECISION NOT NULL,
  line_ids TEXT[] NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 4. BUSES
CREATE TABLE IF NOT EXISTS public.buses (
  id TEXT PRIMARY KEY,
  line_id UUID REFERENCES public.bus_lines(id),
  capacity INTEGER NOT NULL DEFAULT 30,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'maintenance')) DEFAULT 'active',
  driver_id UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. TRIPS
CREATE TABLE IF NOT EXISTS public.trips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  passenger_id UUID NOT NULL REFERENCES public.profiles(id),
  bus_id TEXT NOT NULL,
  origin_lat DOUBLE PRECISION NOT NULL,
  origin_lon DOUBLE PRECISION NOT NULL,
  dest_lat DOUBLE PRECISION NOT NULL,
  dest_lon DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('confirmed', 'in_progress', 'completed', 'cancelled')) DEFAULT 'confirmed',
  pickup_time TIMESTAMPTZ,
  dropoff_time TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================================================
-- TRIGGER: auto-create profile on signup
-- ============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'passenger'),
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- UPDATED_AT trigger
-- ============================================================================
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER trips_updated_at
  BEFORE UPDATE ON public.trips
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================================
-- ROW LEVEL SECURITY
-- ============================================================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- BUS_LINES
ALTER TABLE public.bus_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bus_lines"
  ON public.bus_lines FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage bus_lines"
  ON public.bus_lines FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- BUS_STOPS
ALTER TABLE public.bus_stops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read bus_stops"
  ON public.bus_stops FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage bus_stops"
  ON public.bus_stops FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- BUSES
ALTER TABLE public.buses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read buses"
  ON public.buses FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage buses"
  ON public.buses FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- TRIPS
ALTER TABLE public.trips ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Passengers can read own trips"
  ON public.trips FOR SELECT
  USING (auth.uid() = passenger_id);

CREATE POLICY "Passengers can create own trips"
  ON public.trips FOR INSERT
  WITH CHECK (auth.uid() = passenger_id);

CREATE POLICY "Passengers can update own trips"
  ON public.trips FOR UPDATE
  USING (auth.uid() = passenger_id);

CREATE POLICY "Admins can read all trips"
  ON public.trips FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================================
-- SEED DATA: 20 buses (L1–L20)
-- ============================================================================
INSERT INTO public.buses (id, capacity, status)
VALUES
  ('L1', 30, 'active'), ('L2', 30, 'active'), ('L3', 30, 'active'), ('L4', 30, 'active'),
  ('L5', 30, 'active'), ('L6', 30, 'active'), ('L7', 30, 'active'), ('L8', 30, 'active'),
  ('L9', 30, 'active'), ('L10', 30, 'active'), ('L11', 30, 'active'), ('L12', 30, 'active'),
  ('L13', 30, 'active'), ('L14', 30, 'active'), ('L15', 30, 'active'), ('L16', 30, 'active'),
  ('L17', 30, 'active'), ('L18', 30, 'active'), ('L19', 30, 'active'), ('L20', 30, 'active')
ON CONFLICT (id) DO NOTHING;
