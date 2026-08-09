-- ============================================================
-- Fix: Tiered RLS Policies for Data Visibility & Admin Powers
-- ============================================================
-- Run this in: https://supabase.com/dashboard/project/qaurwgwkrjrohibwokhp/sql/new
-- ============================================================

-- -------------------------------------------------------
-- MAINTENANCE BILLS
-- Residents: read & insert ONLY their own bills
-- Admins/Super Admins: read & manage ALL bills
-- -------------------------------------------------------
DROP POLICY IF EXISTS "read own bills" ON public.maintenance_bills;
DROP POLICY IF EXISTS "admin manage bills" ON public.maintenance_bills;
DROP POLICY IF EXISTS "resident mark paid" ON public.maintenance_bills;
DROP POLICY IF EXISTS "allow_all_bills" ON public.maintenance_bills;

-- Admins see everything, residents see only their own
CREATE POLICY "read_bills_tiered" ON public.maintenance_bills
  FOR SELECT TO authenticated
  USING (
    resident_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- Residents can create bills for themselves; admins can create for anyone
CREATE POLICY "insert_bills_tiered" ON public.maintenance_bills
  FOR INSERT TO authenticated
  WITH CHECK (
    resident_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- Residents can mark their own as paid; admins can update any
CREATE POLICY "update_bills_tiered" ON public.maintenance_bills
  FOR UPDATE TO authenticated
  USING (
    resident_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  )
  WITH CHECK (
    resident_id = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- Only admins can delete bills
CREATE POLICY "delete_bills_admin" ON public.maintenance_bills
  FOR DELETE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR public.is_super_admin(auth.uid())
  );

-- -------------------------------------------------------
-- NOTICES
-- Everyone (authenticated) can read & create notices
-- Admins can delete/update any notice
-- -------------------------------------------------------
DROP POLICY IF EXISTS "all read notices" ON public.notices;
DROP POLICY IF EXISTS "admin manage notices" ON public.notices;
DROP POLICY IF EXISTS "allow_all_notices" ON public.notices;

CREATE POLICY "all_read_notices" ON public.notices
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_notices" ON public.notices
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_update_notices" ON public.notices
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "admin_delete_notices" ON public.notices
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- -------------------------------------------------------
-- EVENTS
-- Everyone (authenticated) can read events
-- Any authenticated user can create events
-- Only admins can update/delete events
-- -------------------------------------------------------
DROP POLICY IF EXISTS "all read events" ON public.events;
DROP POLICY IF EXISTS "admin manage events" ON public.events;
DROP POLICY IF EXISTS "allow_all_events" ON public.events;

CREATE POLICY "all_read_events" ON public.events
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_insert_events" ON public.events
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "admin_update_events" ON public.events
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "admin_delete_events" ON public.events
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- -------------------------------------------------------
-- USER ROLES
-- Allow any authenticated user to INSERT their own role
-- (needed for sign-up role assignment)
-- Admins can manage all roles
-- -------------------------------------------------------
DROP POLICY IF EXISTS "admin manage roles" ON public.user_roles;

CREATE POLICY "manage_own_role_insert" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "admin_manage_roles" ON public.user_roles
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

CREATE POLICY "read_own_roles" ON public.user_roles
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));

-- -------------------------------------------------------
-- Reload PostgREST schema cache
-- -------------------------------------------------------
NOTIFY pgrst, 'reload schema';
