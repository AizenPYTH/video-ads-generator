-- eBay Marketplace Account Deletion / Closure notifications (server-only)
-- Apply on production Supabase before enabling Production keyset.

CREATE TABLE IF NOT EXISTS public.ebay_account_deletion_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id TEXT NOT NULL,
  topic TEXT NOT NULL DEFAULT 'MARKETPLACE_ACCOUNT_DELETION',
  ebay_user_id TEXT,
  ebay_username TEXT,
  eias_token_hash TEXT,
  internal_account_id UUID,
  smart_seller_user_id UUID,
  received_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  verified_at TIMESTAMPTZ,
  processed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'received'
    CHECK (status IN (
      'received',
      'verified',
      'processing',
      'processed',
      'skipped',
      'failed',
      'not_found',
      'ambiguous'
    )),
  error_message TEXT,
  processing_summary JSONB NOT NULL DEFAULT '{}'::jsonb,
  publish_attempt_count INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS ebay_account_deletion_notifications_notification_id_uidx
  ON public.ebay_account_deletion_notifications (notification_id);

CREATE INDEX IF NOT EXISTS ebay_account_deletion_notifications_ebay_user_id_idx
  ON public.ebay_account_deletion_notifications (ebay_user_id);

CREATE INDEX IF NOT EXISTS ebay_account_deletion_notifications_status_idx
  ON public.ebay_account_deletion_notifications (status);

ALTER TABLE public.ebay_account_deletion_notifications ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE public.ebay_account_deletion_notifications IS
  'Server-only log of eBay MARKETPLACE_ACCOUNT_DELETION notifications. Inaccessible to end users (no RLS policies for anon/authenticated).';
