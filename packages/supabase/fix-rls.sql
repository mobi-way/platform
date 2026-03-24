-- ============================================================================
-- Fix: infinite recursion in profiles RLS policies
-- The admin policies were querying profiles to check role, causing recursion.
-- Solution: use a SECURITY DEFINER function to bypass RLS when checking role.
-- ============================================================================

-- Helper function that bypasses RLS to check if a user is admin
CREATE OR REPLACE FUNCTION public.is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles WHERE id = user_id AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Drop old problematic policies
DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- Recreate profiles policies using the helper function
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin(auth.uid()));

-- Fix bus_lines, bus_stops, buses admin policies too (same pattern)
DROP POLICY IF EXISTS "Admins can manage bus_lines" ON public.bus_lines;
CREATE POLICY "Admins can manage bus_lines"
  ON public.bus_lines FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage bus_stops" ON public.bus_stops;
CREATE POLICY "Admins can manage bus_stops"
  ON public.bus_stops FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can manage buses" ON public.buses;
CREATE POLICY "Admins can manage buses"
  ON public.buses FOR ALL
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all trips" ON public.trips;
CREATE POLICY "Admins can read all trips"
  ON public.trips FOR SELECT
  USING (public.is_admin(auth.uid()));
