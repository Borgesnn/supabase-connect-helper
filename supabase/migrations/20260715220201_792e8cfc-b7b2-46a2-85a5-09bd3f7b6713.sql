
-- 1) Add status + activated_at to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'ativo',
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_status_check
  CHECK (status IN ('ativo','aguardando_ativacao','bloqueado'));

-- Existing rows: consider already active
UPDATE public.profiles SET activated_at = COALESCE(activated_at, created_at) WHERE status = 'ativo' AND activated_at IS NULL;

-- 2) activation_codes table (service_role only)
CREATE TABLE IF NOT EXISTS public.activation_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS activation_codes_email_idx ON public.activation_codes (lower(email));
CREATE INDEX IF NOT EXISTS activation_codes_active_idx ON public.activation_codes (lower(email), used_at, expires_at);

GRANT ALL ON public.activation_codes TO service_role;
ALTER TABLE public.activation_codes ENABLE ROW LEVEL SECURITY;
-- No policies: clients cannot access; only edge functions using service_role.

-- 3) Update handle_new_user to NOT downgrade admin-created users;
--    the create-user edge function will set status='aguardando_ativacao' explicitly.
--    Default remains 'ativo' for self-signups (legacy) so nothing breaks.
