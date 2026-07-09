ALTER TABLE public.arte_solicitacoes ADD COLUMN IF NOT EXISTS marca_ids uuid[] NOT NULL DEFAULT '{}'::uuid[];
-- Backfill from existing single marca_id
UPDATE public.arte_solicitacoes SET marca_ids = ARRAY[marca_id] WHERE marca_id IS NOT NULL AND (marca_ids IS NULL OR array_length(marca_ids,1) IS NULL);