-- 1. Restore execute privileges on helper functions used by RLS policies
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO anon, authenticated;

-- 2. Drop foreign key constraint on profiles referencing auth.users to allow admin resident insertion
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- 3. Redirect foreign keys from auth.users(id) to public.profiles(id)
ALTER TABLE public.family_members DROP CONSTRAINT IF EXISTS family_members_resident_id_fkey;
ALTER TABLE public.family_members ADD CONSTRAINT family_members_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.maintenance_bills DROP CONSTRAINT IF EXISTS maintenance_bills_resident_id_fkey;
ALTER TABLE public.maintenance_bills ADD CONSTRAINT maintenance_bills_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.facility_bookings DROP CONSTRAINT IF EXISTS facility_bookings_resident_id_fkey;
ALTER TABLE public.facility_bookings ADD CONSTRAINT facility_bookings_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.visitors DROP CONSTRAINT IF EXISTS visitors_host_resident_id_fkey;
ALTER TABLE public.visitors ADD CONSTRAINT visitors_host_resident_id_fkey FOREIGN KEY (host_resident_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.parking_slots DROP CONSTRAINT IF EXISTS parking_slots_owner_id_fkey;
ALTER TABLE public.parking_slots ADD CONSTRAINT parking_slots_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.complaints DROP CONSTRAINT IF EXISTS complaints_resident_id_fkey;
ALTER TABLE public.complaints ADD CONSTRAINT complaints_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.event_rsvps DROP CONSTRAINT IF EXISTS event_rsvps_user_id_fkey;
ALTER TABLE public.event_rsvps ADD CONSTRAINT event_rsvps_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.complaint_comments DROP CONSTRAINT IF EXISTS complaint_comments_user_id_fkey;
ALTER TABLE public.complaint_comments ADD CONSTRAINT complaint_comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_user_id_fkey;
ALTER TABLE public.notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 4. Relax resident_id constraint on maintenance_bills to allow billing empty flats
ALTER TABLE public.maintenance_bills ALTER COLUMN resident_id DROP NOT NULL;

-- 5. Replace unique constraint on maintenance_bills to be based on flat rather than resident_id
ALTER TABLE public.maintenance_bills DROP CONSTRAINT IF EXISTS maintenance_bills_resident_id_month_year_key;
ALTER TABLE public.maintenance_bills DROP CONSTRAINT IF EXISTS maintenance_bills_flat_wing_month_year_key;
ALTER TABLE public.maintenance_bills ADD CONSTRAINT maintenance_bills_flat_wing_month_year_key UNIQUE (flat_number, wing, month, year);

-- 6. Add new columns for module-specific fields
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS family_members TEXT;
ALTER TABLE public.visitors ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE public.maintenance_bills ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE public.maintenance_bills ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.maintenance_bills ADD COLUMN IF NOT EXISTS receipt_url TEXT;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS assigned_staff_id UUID REFERENCES public.staff(id) ON DELETE SET NULL;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE public.notices ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- 7. Initialize storage buckets for uploads
INSERT INTO storage.buckets (id, name, public)
VALUES 
  ('society_uploads', 'society_uploads', true),
  ('complaint-images', 'complaint-images', true)
ON CONFLICT (id) DO NOTHING;

-- Policy for society_uploads
DROP POLICY IF EXISTS "allow_all_authenticated_uploads" ON storage.objects;
CREATE POLICY "allow_all_authenticated_uploads" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'society_uploads')
  WITH CHECK (bucket_id = 'society_uploads');

-- Policy for complaint-images
DROP POLICY IF EXISTS "allow_all_authenticated_complaints" ON storage.objects;
CREATE POLICY "allow_all_authenticated_complaints" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'complaint-images')
  WITH CHECK (bucket_id = 'complaint-images');

-- 8. Notify postgrest to reload its schema cache
NOTIFY pgrst, 'reload schema';
