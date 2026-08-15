-- Company Brain (P0.1) — extend business_profiles with the remaining
-- Company Brain fields and add a dedicated competitors table.
-- Follows the existing per-user ownership + RLS pattern used across this project.

ALTER TABLE public.business_profiles
  ADD COLUMN IF NOT EXISTS business_model text,
  ADD COLUMN IF NOT EXISTS products text,
  ADD COLUMN IF NOT EXISTS services text,
  ADD COLUMN IF NOT EXISTS locations text,
  ADD COLUMN IF NOT EXISTS pricing text,
  ADD COLUMN IF NOT EXISTS target_markets text,
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS brand_voice text,
  ADD COLUMN IF NOT EXISTS brand_messaging text,
  ADD COLUMN IF NOT EXISTS brand_positioning text,
  ADD COLUMN IF NOT EXISTS brand_style_guidelines text,
  ADD COLUMN IF NOT EXISTS brand_colors text,
  ADD COLUMN IF NOT EXISTS customer_personas text,
  ADD COLUMN IF NOT EXISTS pain_points text,
  ADD COLUMN IF NOT EXISTS customer_journeys text,
  ADD COLUMN IF NOT EXISTS revenue_target text,
  ADD COLUMN IF NOT EXISTS lead_target text,
  ADD COLUMN IF NOT EXISTS marketing_target text,
  ADD COLUMN IF NOT EXISTS growth_target text;

-- Competitors (Company Brain)
CREATE TABLE IF NOT EXISTS public.company_competitors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name text NOT NULL,
    website text,
    notes text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_competitors TO authenticated;
GRANT ALL ON public.company_competitors TO service_role;
ALTER TABLE public.company_competitors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own competitors" ON public.company_competitors;
CREATE POLICY "Users manage own competitors" ON public.company_competitors
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS company_competitors_user_idx
  ON public.company_competitors (user_id, created_at DESC);

DROP TRIGGER IF EXISTS company_competitors_updated_at ON public.company_competitors;
CREATE TRIGGER company_competitors_updated_at
  BEFORE UPDATE ON public.company_competitors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
