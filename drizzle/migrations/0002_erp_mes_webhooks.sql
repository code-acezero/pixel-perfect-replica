CREATE TABLE public.integration_endpoints (
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
CREATE POLICY "Admins manage endpoints" ON public.integration_endpoints FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'plant_admin')) WITH CHECK (public.has_role(auth.uid(),'plant_admin'));

CREATE TABLE public.integration_deliveries (
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
CREATE POLICY "Managers read deliveries" ON public.integration_deliveries FOR SELECT TO authenticated
  USING (public.has_any_role(auth.uid(), ARRAY['quality_manager','plant_admin']::public.app_role[]));