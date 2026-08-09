-- Allow admins and super admins to insert profiles (needed for manual resident creation)
CREATE POLICY "admin insert profiles" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.is_super_admin(auth.uid()));
