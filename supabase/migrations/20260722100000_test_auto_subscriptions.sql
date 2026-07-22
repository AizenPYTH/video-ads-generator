-- Phase test: synchroniser public.users + auto-abonnement pour tous les comptes.
-- Cause du bug: subscriptions.user_id référence public.users (pas auth.users).
-- Les nouveaux comptes créés via Auth n'étaient pas toujours dans public.users.

-- 1) Sync public.users depuis auth.users
INSERT INTO public.users (id, email, full_name, role)
SELECT
  u.id,
  COALESCE(u.email, u.id::text),
  COALESCE(u.raw_user_meta_data->>'full_name', u.raw_user_meta_data->>'name', split_part(COALESCE(u.email, ''), '@', 1)),
  'user'
FROM auth.users u
ON CONFLICT (id) DO UPDATE
SET
  email = EXCLUDED.email,
  updated_at = now();

-- 2) handle_new_user: créer public.users + subscription test
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_free_plan_id uuid;
BEGIN
  INSERT INTO public.users (id, email, full_name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, NEW.id::text),
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(COALESCE(NEW.email, ''), '@', 1)
    ),
    'user'
  )
  ON CONFLICT (id) DO UPDATE
  SET email = EXCLUDED.email,
      updated_at = now();

  INSERT INTO public.profiles (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO NOTHING;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.user_settings WHERE user_id = NEW.id) THEN
      INSERT INTO public.user_settings (user_id) VALUES (NEW.id);
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.notification_settings WHERE user_id = NEW.id) THEN
      INSERT INTO public.notification_settings (user_id) VALUES (NEW.id);
    END IF;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  BEGIN
    SELECT id INTO v_free_plan_id
    FROM public.subscription_plans
    WHERE code = 'free'
    LIMIT 1;

    INSERT INTO public.subscriptions (
      user_id,
      plan,
      status,
      statut,
      ads_limit,
      ads_used_this_period,
      plan_id
    )
    VALUES (
      NEW.id,
      'free',
      'active',
      'ACTIVE',
      10000,
      0,
      v_free_plan_id
    )
    ON CONFLICT (user_id) DO NOTHING;
  EXCEPTION WHEN others THEN
    NULL;
  END;

  RETURN NEW;
END;
$function$;

-- 3) Filet de sécurité sur INSERT ads
CREATE OR REPLACE FUNCTION public.check_ads_quota()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_subscription public.subscriptions%ROWTYPE;
  v_free_plan_id uuid;
BEGIN
  IF COALESCE(current_setting('app.bypass_ads_quota', true), '') = 'true' THEN
    RETURN NEW;
  END IF;

  -- Garantir public.users (FK subscriptions)
  INSERT INTO public.users (id, email, role)
  VALUES (NEW.user_id, NEW.user_id::text, 'user')
  ON CONFLICT (id) DO NOTHING;

  SELECT * INTO v_subscription
  FROM public.subscriptions
  WHERE user_id = NEW.user_id;

  IF NOT FOUND THEN
    SELECT id INTO v_free_plan_id
    FROM public.subscription_plans
    WHERE code = 'free'
    LIMIT 1;

    INSERT INTO public.subscriptions (
      user_id,
      plan,
      status,
      statut,
      ads_limit,
      ads_used_this_period,
      plan_id
    )
    VALUES (
      NEW.user_id,
      'free',
      'active',
      'ACTIVE',
      10000,
      0,
      v_free_plan_id
    )
    RETURNING * INTO v_subscription;
  END IF;

  IF v_subscription.ads_used_this_period >= v_subscription.ads_limit THEN
    RAISE EXCEPTION 'Ad quota exceeded for current period. Upgrade your plan.';
  END IF;

  UPDATE public.subscriptions
  SET ads_used_this_period = ads_used_this_period + 1
  WHERE user_id = NEW.user_id;

  RETURN NEW;
END;
$function$;

-- 4) Backfill abonnements manquants + quota test pour tous
INSERT INTO public.subscriptions (
  user_id,
  plan,
  status,
  statut,
  ads_limit,
  ads_used_this_period,
  plan_id
)
SELECT
  u.id,
  'free',
  'active',
  'ACTIVE',
  10000,
  0,
  (SELECT id FROM public.subscription_plans WHERE code = 'free' LIMIT 1)
FROM public.users u
WHERE NOT EXISTS (
  SELECT 1 FROM public.subscriptions s WHERE s.user_id = u.id
);

UPDATE public.subscriptions
SET
  ads_limit = GREATEST(COALESCE(ads_limit, 0), 10000),
  ads_used_this_period = 0,
  status = 'active',
  statut = 'ACTIVE',
  plan_id = COALESCE(
    plan_id,
    (SELECT id FROM public.subscription_plans WHERE code = 'free' LIMIT 1)
  ),
  updated_at = now();
