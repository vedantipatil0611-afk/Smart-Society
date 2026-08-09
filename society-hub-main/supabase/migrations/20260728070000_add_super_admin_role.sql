-- Add super_admin to the app_role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'super_admin';

-- Allow super_admin to do everything admin can do (they inherit admin-level access)
-- Create a helper function to check if user is super_admin
CREATE OR REPLACE FUNCTION public.is_super_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE SQL STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'super_admin'
  )
$$;

-- Grant super_admin full access to user_roles (can assign/revoke any role)
DROP POLICY IF EXISTS "admin manage roles" ON public.user_roles;
CREATE POLICY "admin manage roles" ON public.user_roles FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin can read all profiles
DROP POLICY IF EXISTS "own profile select" ON public.profiles;
CREATE POLICY "own profile select" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin can update all profiles
DROP POLICY IF EXISTS "own profile update" ON public.profiles;
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (auth.uid() = id OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin can delete profiles
DROP POLICY IF EXISTS "admin delete profile" ON public.profiles;
CREATE POLICY "admin delete profile" ON public.profiles FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin can manage all complaints
DROP POLICY IF EXISTS "read own or admin" ON public.complaints;
CREATE POLICY "read own or admin" ON public.complaints FOR SELECT TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "update own or admin" ON public.complaints;
CREATE POLICY "update own or admin" ON public.complaints FOR UPDATE TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

DROP POLICY IF EXISTS "admin delete complaint" ON public.complaints;
CREATE POLICY "admin delete complaint" ON public.complaints FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages notices
DROP POLICY IF EXISTS "admin manage notices" ON public.notices;
CREATE POLICY "admin manage notices" ON public.notices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages visitors
DROP POLICY IF EXISTS "admin delete visitors" ON public.visitors;
CREATE POLICY "admin delete visitors" ON public.visitors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages maintenance bills
DROP POLICY IF EXISTS "admin manage bills" ON public.maintenance_bills;
CREATE POLICY "admin manage bills" ON public.maintenance_bills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages facilities
DROP POLICY IF EXISTS "admin manage facilities" ON public.facilities;
CREATE POLICY "admin manage facilities" ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages events
DROP POLICY IF EXISTS "admin manage events" ON public.events;
CREATE POLICY "admin manage events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages staff
DROP POLICY IF EXISTS "admin manage staff" ON public.staff;
CREATE POLICY "admin manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Super admin manages parking
DROP POLICY IF EXISTS "admin manage parking" ON public.parking_slots;
CREATE POLICY "admin manage parking" ON public.parking_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- Revoke execute on is_super_admin from public/anon
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM PUBLIC, anon;