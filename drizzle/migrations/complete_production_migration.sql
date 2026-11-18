-- ==============================================================================
-- TENSORA COMPLETE DATABASE MIGRATION SCRIPT
-- For Supabase Project: mgjqyymqhsxnwkuqskfi
-- Consolidates: 0000_tensora_core.sql + 0001_ai_training_library.sql + 0002_erp_mes_webhooks.sql
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Storage Buckets Setup
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES ('defect-crops', 'defect-crops', true)
ON CONFLICT (id) DO NOTHING;

-- ------------------------------------------------------------------------------
-- 2. Core Enums and User Profiles
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('field_inspector','qc_lead','quality_manager','plant_admin','buyer_auditor');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text NOT NULL DEFAULT '',
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE OR REPLACE FUNCTION public.has_any_role(_user_id uuid, _roles public.app_role[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = ANY(_roles))
$$;

DO $$ BEGIN
  CREATE POLICY "Profiles readable by signed-in users" ON public.profiles FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read own roles or admin reads all" ON public.user_roles FOR SELECT TO authenticated
    USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'plant_admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'plant_admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'plant_admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'plant_admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE first_user boolean;
BEGIN
  INSERT INTO public.profiles (id, display_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  SELECT NOT EXISTS (SELECT 1 FROM public.user_roles) INTO first_user;
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, CASE WHEN first_user THEN 'plant_admin'::public.app_role ELSE 'field_inspector'::public.app_role END)
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 3. Core Manufacturing Quality Tables
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.buyers (
  id text PRIMARY KEY, name text NOT NULL, system text NOT NULL DEFAULT '4pt',
  score_limit numeric NOT NULL DEFAULT 24, region text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.rolls (
  id text PRIMARY KEY, article text NOT NULL, gsm numeric NOT NULL DEFAULT 0, width_in numeric NOT NULL DEFAULT 60,
  length_m numeric NOT NULL DEFAULT 0, buyer_id text NOT NULL REFERENCES public.buyers(id), lot text NOT NULL DEFAULT '',
  yarn_lot text NOT NULL DEFAULT '', supplier text NOT NULL DEFAULT '', site text NOT NULL DEFAULT '', line text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'queued', gsm_measured numeric NOT NULL DEFAULT 0, width_measured numeric NOT NULL DEFAULT 0,
  bow_pct numeric NOT NULL DEFAULT 0, shade_de numeric NOT NULL DEFAULT 0, shrink_pct numeric NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.devices (
  id text PRIMARY KEY, name text NOT NULL, kind text NOT NULL, location text NOT NULL DEFAULT '', status text NOT NULL DEFAULT 'idle',
  resolution text NOT NULL DEFAULT '', fps int NOT NULL DEFAULT 30, quality int NOT NULL DEFAULT 0, last_session text NOT NULL DEFAULT '',
  calibrated boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS public.inspection_sessions (
  id text PRIMARY KEY, roll_id text NOT NULL REFERENCES public.rolls(id), device_id text NOT NULL DEFAULT '', inspector text NOT NULL DEFAULT '',
  location text NOT NULL DEFAULT '', site text NOT NULL DEFAULT '', started_at bigint NOT NULL, status text NOT NULL DEFAULT 'live',
  meters_inspected numeric NOT NULL DEFAULT 0, created_by uuid DEFAULT auth.uid()
);

CREATE TABLE IF NOT EXISTS public.defects (
  id text PRIMARY KEY, roll_id text NOT NULL REFERENCES public.rolls(id), session_id text NOT NULL DEFAULT '', ts bigint NOT NULL,
  meter numeric NOT NULL DEFAULT 0, x numeric NOT NULL DEFAULT 0.5, cls text NOT NULL, points int NOT NULL, confidence numeric NOT NULL DEFAULT 1,
  status text NOT NULL DEFAULT 'pending', source text NOT NULL DEFAULT 'ai', thumb_path text, reviewer text, original_cls text,
  created_by uuid DEFAULT auth.uid()
);
CREATE INDEX IF NOT EXISTS defects_roll_idx ON public.defects(roll_id);

CREATE TABLE IF NOT EXISTS public.alerts (
  id text PRIMARY KEY, level text NOT NULL, title text NOT NULL, body text NOT NULL DEFAULT '', ts bigint NOT NULL,
  location text NOT NULL DEFAULT '', savings numeric
);

CREATE TABLE IF NOT EXISTS public.certificates (
  id text PRIMARY KEY, roll_id text NOT NULL REFERENCES public.rolls(id), issued_at bigint NOT NULL, issuer text NOT NULL,
  verdict text NOT NULL, score numeric NOT NULL, issued_by uuid DEFAULT auth.uid()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.buyers, public.rolls, public.devices, public.inspection_sessions, public.defects, public.alerts, public.certificates TO authenticated;
GRANT ALL ON public.buyers, public.rolls, public.devices, public.inspection_sessions, public.defects, public.alerts, public.certificates TO service_role;

ALTER TABLE public.buyers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rolls ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.defects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Read buyers" ON public.buyers FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read rolls" ON public.rolls FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read devices" ON public.devices FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read sessions" ON public.inspection_sessions FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read defects" ON public.defects FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read alerts" ON public.alerts FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Read certificates" ON public.certificates FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Manage buyers" ON public.buyers FOR ALL TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['quality_manager','plant_admin']::public.app_role[]))
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors insert rolls" ON public.rolls FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors update rolls" ON public.rolls FOR UPDATE TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors insert sessions" ON public.inspection_sessions FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors update sessions" ON public.inspection_sessions FOR UPDATE TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors log defects" ON public.defects FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Leads review defects" ON public.defects FOR UPDATE TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors raise alerts" ON public.alerts FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Leads dismiss alerts" ON public.alerts FOR DELETE TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Managers issue certificates" ON public.certificates FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Admins manage devices" ON public.devices FOR ALL TO authenticated
    USING (public.has_role(auth.uid(), 'plant_admin')) WITH CHECK (public.has_role(auth.uid(), 'plant_admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 4. Cryptographic Public Certificate Verification RPC
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_certificate(_id text)
RETURNS TABLE (id text, roll_id text, issued_at bigint, issuer text, verdict text, score numeric, article text, buyer text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.roll_id, c.issued_at, c.issuer, c.verdict, c.score, r.article, b.name
  FROM public.certificates c JOIN public.rolls r ON r.id = c.roll_id JOIN public.buyers b ON b.id = r.buyer_id
  WHERE c.id = _id
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- ------------------------------------------------------------------------------
-- 5. Realtime Subscriptions
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.defects;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.alerts;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.inspection_sessions;
EXCEPTION WHEN others THEN null; END $$;

DO $$ BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE public.certificates;
EXCEPTION WHEN others THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 6. Storage Security Policies for Defect Crops
-- ------------------------------------------------------------------------------
DO $$ BEGIN
  CREATE POLICY "Signed-in users read defect crops" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'defect-crops');
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Inspectors upload defect crops" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'defect-crops' AND public.has_any_role(auth.uid(), ARRAY['field_inspector','qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 7. Active Learning Training Library & Few-Shot Automation Trigger
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.training_examples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  cls text NOT NULL,
  points integer NOT NULL DEFAULT 1,
  image_path text NOT NULL,
  note text NOT NULL DEFAULT '',
  source text NOT NULL DEFAULT 'upload',
  defect_id text UNIQUE,
  created_by uuid DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.training_examples TO authenticated;
GRANT ALL ON public.training_examples TO service_role;
ALTER TABLE public.training_examples ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Read training examples" ON public.training_examples FOR SELECT TO authenticated USING (true);
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Leads add training examples" ON public.training_examples FOR INSERT TO authenticated
    WITH CHECK (public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

DO $$ BEGIN
  CREATE POLICY "Leads remove training examples" ON public.training_examples FOR DELETE TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE OR REPLACE FUNCTION public.defect_to_training()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.thumb_path IS NOT NULL AND NEW.status IN ('confirmed','reclassified')
     AND (OLD.status IS DISTINCT FROM NEW.status OR OLD.cls IS DISTINCT FROM NEW.cls) THEN
    INSERT INTO public.training_examples (cls, points, image_path, source, defect_id, created_by)
    VALUES (NEW.cls, NEW.points, NEW.thumb_path, 'triage', NEW.id, auth.uid())
    ON CONFLICT (defect_id) DO UPDATE SET cls = EXCLUDED.cls, points = EXCLUDED.points;
  ELSIF NEW.status = 'dismissed' THEN
    DELETE FROM public.training_examples WHERE defect_id = NEW.id;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS defects_to_training ON public.defects;
CREATE TRIGGER defects_to_training AFTER UPDATE ON public.defects
  FOR EACH ROW EXECUTE FUNCTION public.defect_to_training();

DO $$ BEGIN
  CREATE POLICY "Leads upload training photos" ON storage.objects FOR INSERT TO authenticated
    WITH CHECK (bucket_id = 'defect-crops' AND (storage.foldername(name))[1] = 'training'
      AND public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 8. ERP / MES Webhooks & Audit Logging
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.integration_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  kind text NOT NULL CHECK (kind IN ('sap','fastreact','generic')),
  url text NOT NULL,
  secret text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.integration_endpoints TO authenticated;
GRANT ALL ON public.integration_endpoints TO service_role;
ALTER TABLE public.integration_endpoints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Admins manage endpoints" ON public.integration_endpoints FOR ALL TO authenticated
    USING (public.has_role(auth.uid(),'plant_admin')) WITH CHECK (public.has_role(auth.uid(),'plant_admin'));
EXCEPTION WHEN duplicate_object THEN null; END $$;

CREATE TABLE IF NOT EXISTS public.integration_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid REFERENCES public.integration_endpoints(id) ON DELETE CASCADE,
  event text NOT NULL,
  cert_id text,
  roll_id text,
  status_code int,
  ok boolean NOT NULL DEFAULT false,
  error text,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.integration_deliveries TO authenticated;
GRANT ALL ON public.integration_deliveries TO service_role;
ALTER TABLE public.integration_deliveries ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "Managers read deliveries" ON public.integration_deliveries FOR SELECT TO authenticated
    USING (public.has_any_role(auth.uid(), ARRAY['quality_manager','plant_admin']::public.app_role[]));
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- ------------------------------------------------------------------------------
-- 9. Initial Seed Data (Buyers, Baseline Rolls, Devices, Inspection Sessions)
-- ------------------------------------------------------------------------------
INSERT INTO public.buyers (id,name,system,score_limit,region) VALUES
('BYR-HM-01','H&M Group','4pt',24,'EU'),
('BYR-ZR-02','Inditex / Zara','4pt',20,'EU'),
('BYR-PV-03','PVH Corp','10pt',40,'US'),
('BYR-MS-04','Marks & Spencer','g78',100,'UK'),
('BYR-UQ-05','Uniqlo','4pt',18,'JP')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.rolls (id,article,gsm,width_in,length_m,buyer_id,lot,yarn_lot,supplier,site,line,status,gsm_measured,width_measured,bow_pct,shade_de,shrink_pct) VALUES
('TX-8829','100% Combed Cotton Single Jersey',180,60,142.5,'BYR-HM-01','LOT-2026-1142','YL-30S-7781','Square Yarns Ltd','ASH-U03','ASH-U03-L04','inspecting',178,59.6,1.2,0.42,3.1),
('TX-8828','100% Combed Cotton Single Jersey',180,60,168,'BYR-HM-01','LOT-2026-1142','YL-30S-7781','Square Yarns Ltd','ASH-U03','ASH-U03-L04','certified',181,60.1,0.8,0.31,2.8),
('TX-8827','CVC 60/40 Pique',220,68,155.2,'BYR-PV-03','LOT-2026-1139','YL-CVC-2210','Thermax Yarn','ASH-U03','ASH-U03-L02','graded',216,67.4,2.1,0.66,4.2),
('TX-8826','Cotton Spandex 1x1 Rib',240,52,98.4,'BYR-ZR-02','LOT-2026-1137','YL-CS-0942','Akij Textile','GZP-U01','GZP-U01-L07','graded',238,51.8,1.6,0.52,4.8),
('TX-8825','Polyester Interlock',160,72,201,'BYR-MS-04','LOT-2026-1131','YL-PE-1180','Bextex Fibres','ASH-U03','ASH-U03-L05','certified',161,71.9,0.5,0.22,1.4),
('TX-8824','Organic Cotton Fleece',300,64,120.6,'BYR-UQ-05','LOT-2026-1129','YL-OC-0551','Square Yarns Ltd','GZP-U01','GZP-U01-L03','queued',296,63.2,2.8,0.91,5.2)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.devices (id,name,kind,location,status,resolution,fps,quality,last_session,calibrated) VALUES
('CAM-PH-07','Pixel 8 Pro · Inspector R. Hossain','Phone','Line #04 · Take-down','online','4K',60,94,'INS-2026-000418',true),
('CAM-TB-03','Galaxy Tab S9 · Inspection Table 2','Tablet','QC Hall · Table 2','online','1440p',30,88,'INS-2026-000417',true),
('CAM-IP-12','Hikvision 8MP · Batching Frame','IP Camera','Finishing · Batcher A','idle','4K',25,91,'INS-2026-000409',true),
('CAM-US-02','Basler ace USB3 · Table 1','USB Camera','QC Hall · Table 1','online','5MP',75,97,'INS-2026-000416',true),
('CAM-WB-05','Logitech Brio · Buyer Room','Webcam','Buyer Office · Dhaka','offline','4K',30,72,'INS-2026-000388',false),
('CAM-PH-11','iPhone 15 · Warehouse','Phone','Greige Warehouse · Bay 3','idle','4K',60,83,'INS-2026-000411',false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.inspection_sessions (id,roll_id,device_id,inspector,location,site,started_at,status,meters_inspected) VALUES
('INS-2026-000418','TX-8829','CAM-PH-07','R. Hossain','Line #04 · Take-down','ASH-U03',1791712800000,'live',142.5),
('INS-2026-000417','TX-8827','CAM-TB-03','S. Akter','QC Hall · Table 2','ASH-U03',1791709200000,'completed',155.2),
('INS-2026-000416','TX-8828','CAM-US-02','M. Rahman','QC Hall · Table 1','ASH-U03',1791705600000,'completed',168),
('INS-2026-000412','TX-8826','CAM-PH-11','T. Islam','Gazipur · Line #07','GZP-U01',1791687600000,'completed',98.4),
('INS-2026-000409','TX-8825','CAM-IP-12','N. Chowdhury','Finishing · Batcher A','ASH-U03',1791673200000,'completed',201)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.defects (id,roll_id,session_id,ts,meter,x,cls,points,confidence,status,source) VALUES
('DF-000101','TX-8829','INS-2026-000418',1791712920000,8.4,0.22,'Slub',1,0.887,'confirmed','ai'),
('DF-000102','TX-8829','INS-2026-000418',1791713160000,24.1,0.61,'Oil Stain',2,0.942,'confirmed','ai'),
('DF-000103','TX-8829','INS-2026-000418',1791713460000,41.7,0.35,'Slub',1,0.812,'confirmed','ai'),
('DF-000104','TX-8829','INS-2026-000418',1791713820000,63,0.78,'Warp Float',3,0.913,'confirmed','ai'),
('DF-000105','TX-8829','INS-2026-000418',1791714120000,80.6,0.48,'Barre',2,0.856,'confirmed','ai'),
('DF-000106','TX-8829','INS-2026-000418',1791714480000,101.2,0.12,'Hole',4,0.978,'confirmed','ai'),
('DF-000107','TX-8829','INS-2026-000418',1791714780000,118.9,0.44,'Needle Line',2,0.931,'pending','ai'),
('DF-000108','TX-8829','INS-2026-000418',1791714960000,126.3,0.45,'Needle Line',2,0.947,'pending','ai'),
('DF-000109','TX-8829','INS-2026-000418',1791715140000,133.4,0.44,'Needle Line',1,0.902,'pending','ai'),
('DF-000110','TX-8827','INS-2026-000417',1791709800000,12.2,0.3,'Drop Stitch',3,0.91,'confirmed','ai'),
('DF-000111','TX-8827','INS-2026-000417',1791710100000,40.5,0.7,'Hole',4,0.96,'confirmed','ai'),
('DF-000112','TX-8827','INS-2026-000417',1791710400000,77.1,0.2,'Oil Stain',2,0.88,'reclassified','ai'),
('DF-000113','TX-8827','INS-2026-000417',1791710640000,99.8,0.55,'Slub',1,0.74,'dismissed','ai'),
('DF-000114','TX-8827','INS-2026-000417',1791711000000,140,0.8,'Lycra Out',4,0.93,'confirmed','ai'),
('DF-000115','TX-8828','INS-2026-000416',1791706200000,30,0.5,'Slub',1,0.83,'confirmed','ai'),
('DF-000116','TX-8828','INS-2026-000416',1791706800000,92.3,0.2,'Oil Stain',2,0.9,'confirmed','ai'),
('DF-000117','TX-8826','INS-2026-000412',1791688800000,20.4,0.4,'Lycra Out',4,0.95,'confirmed','ai'),
('DF-000118','TX-8826','INS-2026-000412',1791689400000,44,0.6,'Hole',4,0.97,'confirmed','ai'),
('DF-000119','TX-8826','INS-2026-000412',1791690000000,71.6,0.3,'Barre',2,0.86,'confirmed','ai'),
('DF-000120','TX-8825','INS-2026-000409',1791676800000,66,0.5,'Slub',1,0.79,'confirmed','ai')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.alerts (id,level,title,body,ts,location,savings) VALUES
('ALR-0091','major','Tensora Cluster Alert','3 needle line defects detected within 15 meters on Line #04. Recommendation: Inspect Needle #142 on Cylinder Head 2 immediately.',1791715140000,'ASH-U03 · Line #04',380),
('ALR-0090','minor','Capture quality degraded','CAM-PH-11 lighting uniformity dropped to 61%. Move closer to the batching lamp or enable torch.',1791711000000,'Greige Warehouse · Bay 3',NULL),
('ALR-0089','major','Roll TX-8826 major defect cluster','Two 4-point Lycra Out holes and barre within 50 m. Lycra Out pattern suggests elastane feeder tension issue on GZP-U01-L07.',1791684000000,'GZP-U01 · Line #07',1240),
('ALR-0088','info','Yarn lot YL-30S-7781 trending clean','Slub frequency 38% below 30-day baseline across 4 rolls. Supplier scorecard updated.',1791669600000,'Supplier · Square Yarns Ltd',NULL)
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.certificates (id,roll_id,issued_at,issuer,verdict,score) VALUES
('QAC-2026-0031','TX-8828',1791702000000,'M. Rahman','PASS',3.6),
('QAC-2026-0030','TX-8825',1791676800000,'N. Chowdhury','PASS',0.4)
ON CONFLICT (id) DO NOTHING;
