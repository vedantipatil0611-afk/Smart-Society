
-- COMPLAINTS
CREATE TABLE public.complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  priority TEXT NOT NULL DEFAULT 'medium',
  status TEXT NOT NULL DEFAULT 'open',
  images TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.complaints TO authenticated;
GRANT ALL ON public.complaints TO service_role;
ALTER TABLE public.complaints ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own or admin" ON public.complaints FOR SELECT TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own" ON public.complaints FOR INSERT TO authenticated
  WITH CHECK (resident_id = auth.uid());
CREATE POLICY "update own or admin" ON public.complaints FOR UPDATE TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin delete complaint" ON public.complaints FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER complaints_updated_at BEFORE UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.complaint_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  complaint_id UUID NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.complaint_comments TO authenticated;
GRANT ALL ON public.complaint_comments TO service_role;
ALTER TABLE public.complaint_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read comments" ON public.complaint_comments FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.resident_id = auth.uid())
  );
CREATE POLICY "add comment" ON public.complaint_comments FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid() AND (
      public.has_role(auth.uid(), 'admin') OR
      EXISTS (SELECT 1 FROM public.complaints c WHERE c.id = complaint_id AND c.resident_id = auth.uid())
    )
  );

-- NOTICES
CREATE TABLE public.notices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  pinned BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notices TO authenticated;
GRANT ALL ON public.notices TO service_role;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all read notices" ON public.notices FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage notices" ON public.notices FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER notices_updated_at BEFORE UPDATE ON public.notices
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- VISITORS
CREATE TABLE public.visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name TEXT NOT NULL,
  visitor_phone TEXT,
  visitor_type TEXT NOT NULL DEFAULT 'guest',
  purpose TEXT,
  flat_number TEXT,
  wing TEXT,
  host_resident_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  vehicle_number TEXT,
  entry_time TIMESTAMPTZ,
  exit_time TIMESTAMPTZ,
  expected_time TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.visitors TO authenticated;
GRANT ALL ON public.visitors TO service_role;
ALTER TABLE public.visitors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read visitors" ON public.visitors FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'security') OR
    host_resident_id = auth.uid()
  );
CREATE POLICY "create visitors" ON public.visitors FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'security') OR
    host_resident_id = auth.uid()
  );
CREATE POLICY "update visitors" ON public.visitors FOR UPDATE TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'security') OR
    host_resident_id = auth.uid()
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin') OR
    public.has_role(auth.uid(), 'security') OR
    host_resident_id = auth.uid()
  );
CREATE POLICY "admin delete visitors" ON public.visitors FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER visitors_updated_at BEFORE UPDATE ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- MAINTENANCE BILLS
CREATE TABLE public.maintenance_bills (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  flat_number TEXT,
  wing TEXT,
  month INT NOT NULL,
  year INT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  receipt_no TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (resident_id, month, year)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_bills TO authenticated;
GRANT ALL ON public.maintenance_bills TO service_role;
ALTER TABLE public.maintenance_bills ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own bills" ON public.maintenance_bills FOR SELECT TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admin manage bills" ON public.maintenance_bills FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "resident mark paid" ON public.maintenance_bills FOR UPDATE TO authenticated
  USING (resident_id = auth.uid())
  WITH CHECK (resident_id = auth.uid());
CREATE TRIGGER bills_updated_at BEFORE UPDATE ON public.maintenance_bills
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- FACILITIES
CREATE TABLE public.facilities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  capacity INT DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.facilities TO authenticated;
GRANT ALL ON public.facilities TO service_role;
ALTER TABLE public.facilities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all read facilities" ON public.facilities FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage facilities" ON public.facilities FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.facility_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id UUID NOT NULL REFERENCES public.facilities(id) ON DELETE CASCADE,
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facility_bookings TO authenticated;
GRANT ALL ON public.facility_bookings TO service_role;
ALTER TABLE public.facility_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read bookings" ON public.facility_bookings FOR SELECT TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "create own booking" ON public.facility_bookings FOR INSERT TO authenticated
  WITH CHECK (resident_id = auth.uid());
CREATE POLICY "update own or admin booking" ON public.facility_bookings FOR UPDATE TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "cancel own booking" ON public.facility_bookings FOR DELETE TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER fb_updated_at BEFORE UPDATE ON public.facility_bookings
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- EVENTS + RSVPs
CREATE TABLE public.events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  banner_url TEXT,
  event_date TIMESTAMPTZ NOT NULL,
  location TEXT,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "all read events" ON public.events FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin manage events" ON public.events FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER events_updated_at BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.event_rsvps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'going',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_rsvps TO authenticated;
GRANT ALL ON public.event_rsvps TO service_role;
ALTER TABLE public.event_rsvps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read rsvps" ON public.event_rsvps FOR SELECT TO authenticated USING (true);
CREATE POLICY "manage own rsvp" ON public.event_rsvps FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- NOTIFICATIONS
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT,
  link TEXT,
  read BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own notifications" ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());
CREATE POLICY "insert notifications" ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);
CREATE POLICY "update own notifications" ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "delete own notifications" ON public.notifications FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- FAMILY MEMBERS
CREATE TABLE public.family_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relation TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO authenticated;
GRANT ALL ON public.family_members TO service_role;
ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own family" ON public.family_members FOR SELECT TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "manage own family" ON public.family_members FOR ALL TO authenticated
  USING (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
  WITH CHECK (resident_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

-- Notify host resident when a visitor is created for them
CREATE OR REPLACE FUNCTION public.notify_visitor_host()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.host_resident_id IS NOT NULL AND NEW.host_resident_id <> COALESCE(NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid) THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.host_resident_id, 'visitor',
      'Visitor at gate: ' || NEW.visitor_name,
      COALESCE(NEW.purpose,'Awaiting your approval'),
      '/resident/visitors');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_visitor_host() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_visitor_host AFTER INSERT ON public.visitors
  FOR EACH ROW EXECUTE FUNCTION public.notify_visitor_host();

-- Notify resident when a bill is created
CREATE OR REPLACE FUNCTION public.notify_bill_created()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, link)
  VALUES (NEW.resident_id, 'maintenance',
    'New maintenance bill',
    'Amount ₹' || NEW.amount::text || ' for ' || NEW.month::text || '/' || NEW.year::text,
    '/resident/maintenance');
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_bill_created() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_bill AFTER INSERT ON public.maintenance_bills
  FOR EACH ROW EXECUTE FUNCTION public.notify_bill_created();

-- Notify complainant when status changes
CREATE OR REPLACE FUNCTION public.notify_complaint_update()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.notifications (user_id, type, title, message, link)
    VALUES (NEW.resident_id, 'complaint',
      'Complaint updated: ' || NEW.title,
      'Status is now ' || NEW.status,
      '/resident/complaints');
  END IF;
  RETURN NEW;
END; $$;
REVOKE EXECUTE ON FUNCTION public.notify_complaint_update() FROM PUBLIC, anon, authenticated;
CREATE TRIGGER trg_notify_complaint AFTER UPDATE ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.notify_complaint_update();

-- Seed a few facilities
INSERT INTO public.facilities (name, description, capacity) VALUES
  ('Clubhouse', 'Community hall for gatherings and functions', 100),
  ('Swimming Pool', 'Society swimming pool', 30),
  ('Gym', 'Fitness center with equipment', 15),
  ('Tennis Court', 'Outdoor tennis court', 4),
  ('Party Lawn', 'Open lawn area for parties', 60);
