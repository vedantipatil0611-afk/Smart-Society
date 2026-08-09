
-- STAFF
CREATE TABLE public.staff (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL,
  phone text,
  address text,
  shift text,
  salary numeric,
  photo_url text,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff TO authenticated;
GRANT ALL ON public.staff TO service_role;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage staff" ON public.staff FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER staff_set_updated BEFORE UPDATE ON public.staff
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- PARKING
CREATE TABLE public.parking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_number text NOT NULL UNIQUE,
  vehicle_number text,
  owner_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  owner_name text,
  flat_number text,
  wing text,
  vehicle_type text NOT NULL DEFAULT 'car',
  status text NOT NULL DEFAULT 'available',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parking_slots TO authenticated;
GRANT ALL ON public.parking_slots TO service_role;
ALTER TABLE public.parking_slots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin manage parking" ON public.parking_slots FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "resident read own parking" ON public.parking_slots FOR SELECT TO authenticated
  USING (owner_id = auth.uid());
CREATE TRIGGER parking_set_updated BEFORE UPDATE ON public.parking_slots
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- STAFF PHOTO STORAGE POLICIES (bucket 'avatars' already exists, reuse for staff photos under staff/ prefix)
CREATE POLICY "admin upload staff photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'staff' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin update staff photos" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'staff' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete staff photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'staff' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "authenticated read staff photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = 'staff');
