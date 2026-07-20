-- Alignement sûr schéma hybride EN + FR pour imports (aucune suppression).
-- Corrige les NOT NULL manquants (filename, row_number, etc.) côté distant / local.

CREATE TABLE IF NOT EXISTS public.product_import_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.product_import_rows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  batch_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Colonnes EN (legacy distant)
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS filename TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS total_rows INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS completed_rows INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS failed_rows INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS needs_review_rows INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS error_message TEXT;

-- Colonnes FR
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS nom_fichier TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS statut TEXT;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS nombre_lignes INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_traitees INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_reussies INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS lignes_echouees INTEGER DEFAULT 0;
ALTER TABLE public.product_import_batches ADD COLUMN IF NOT EXISTS erreur TEXT;

-- Lignes EN
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS row_number INTEGER;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS source_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS normalized_data JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS error_code TEXT;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS warnings TEXT[] DEFAULT '{}';
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS idempotency_key TEXT;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS ad_id UUID;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS product_id UUID;

-- Lignes FR
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS numero_ligne INTEGER;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS donnees_brutes JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS statut TEXT;
ALTER TABLE public.product_import_rows ADD COLUMN IF NOT EXISTS erreur TEXT;

-- Backfill soft (évite NULL sur colonnes critiques)
UPDATE public.product_import_batches
SET filename = COALESCE(filename, nom_fichier, 'import')
WHERE filename IS NULL;

UPDATE public.product_import_batches
SET nom_fichier = COALESCE(nom_fichier, filename, 'import')
WHERE nom_fichier IS NULL;

UPDATE public.product_import_batches
SET file_type = COALESCE(file_type, 'csv')
WHERE file_type IS NULL;

UPDATE public.product_import_batches
SET status = COALESCE(status, 'UPLOADED')
WHERE status IS NULL;

UPDATE public.product_import_batches
SET statut = COALESCE(statut, 'PENDING')
WHERE statut IS NULL;

UPDATE public.product_import_rows
SET row_number = COALESCE(row_number, numero_ligne, 1)
WHERE row_number IS NULL;

UPDATE public.product_import_rows
SET numero_ligne = COALESCE(numero_ligne, row_number, 1)
WHERE numero_ligne IS NULL;

UPDATE public.product_import_rows
SET source_data = COALESCE(source_data, donnees_brutes, '{}'::jsonb)
WHERE source_data IS NULL;

UPDATE public.product_import_rows
SET normalized_data = COALESCE(normalized_data, donnees_brutes, source_data, '{}'::jsonb)
WHERE normalized_data IS NULL;

UPDATE public.product_import_rows
SET donnees_brutes = COALESCE(donnees_brutes, source_data, '{}'::jsonb)
WHERE donnees_brutes IS NULL;

UPDATE public.product_import_rows
SET status = COALESCE(status, 'PENDING')
WHERE status IS NULL;

UPDATE public.product_import_rows
SET statut = COALESCE(statut, 'PENDING')
WHERE statut IS NULL;

UPDATE public.product_import_rows
SET warnings = COALESCE(warnings, '{}')
WHERE warnings IS NULL;

UPDATE public.product_import_rows
SET idempotency_key = COALESCE(
  idempotency_key,
  batch_id::text || ':' || COALESCE(row_number, numero_ligne, 0)::text
)
WHERE idempotency_key IS NULL;

CREATE INDEX IF NOT EXISTS idx_product_import_batches_user_id
  ON public.product_import_batches (user_id);
CREATE INDEX IF NOT EXISTS idx_product_import_rows_batch_id
  ON public.product_import_rows (batch_id);
CREATE INDEX IF NOT EXISTS idx_product_import_rows_user_id
  ON public.product_import_rows (user_id);

ALTER TABLE public.product_import_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_import_rows ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_batches'
      AND policyname = 'product_import_batches_select_own'
  ) THEN
    CREATE POLICY product_import_batches_select_own ON public.product_import_batches
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_batches'
      AND policyname = 'product_import_batches_insert_own'
  ) THEN
    CREATE POLICY product_import_batches_insert_own ON public.product_import_batches
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_batches'
      AND policyname = 'product_import_batches_update_own'
  ) THEN
    CREATE POLICY product_import_batches_update_own ON public.product_import_batches
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_batches'
      AND policyname = 'product_import_batches_delete_own'
  ) THEN
    CREATE POLICY product_import_batches_delete_own ON public.product_import_batches
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_rows'
      AND policyname = 'product_import_rows_select_own'
  ) THEN
    CREATE POLICY product_import_rows_select_own ON public.product_import_rows
      FOR SELECT TO authenticated USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_rows'
      AND policyname = 'product_import_rows_insert_own'
  ) THEN
    CREATE POLICY product_import_rows_insert_own ON public.product_import_rows
      FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_rows'
      AND policyname = 'product_import_rows_update_own'
  ) THEN
    CREATE POLICY product_import_rows_update_own ON public.product_import_rows
      FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'product_import_rows'
      AND policyname = 'product_import_rows_delete_own'
  ) THEN
    CREATE POLICY product_import_rows_delete_own ON public.product_import_rows
      FOR DELETE TO authenticated USING (auth.uid() = user_id);
  END IF;
END $$;
