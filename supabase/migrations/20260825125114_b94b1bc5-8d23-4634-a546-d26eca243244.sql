ALTER TABLE public.activation_codes
  ADD COLUMN IF NOT EXISTS purpose text NOT NULL DEFAULT 'activation',
  ADD COLUMN IF NOT EXISTS attempts integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS activation_codes_email_purpose_idx
  ON public.activation_codes (email, purpose, created_at DESC);