CREATE TABLE public.training_examples (
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
CREATE POLICY "Read training examples" ON public.training_examples FOR SELECT TO authenticated USING (true);
CREATE POLICY "Leads add training examples" ON public.training_examples FOR INSERT TO authenticated
  WITH CHECK (public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));
CREATE POLICY "Leads remove training examples" ON public.training_examples FOR DELETE TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));

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
CREATE TRIGGER defects_to_training AFTER UPDATE ON public.defects
  FOR EACH ROW EXECUTE FUNCTION public.defect_to_training();

CREATE POLICY "Leads upload training photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'defect-crops' AND (storage.foldername(name))[1] = 'training'
    AND public.has_any_role(auth.uid(), ARRAY['qc_lead','quality_manager','plant_admin']::public.app_role[]));