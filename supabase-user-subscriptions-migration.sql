-- Migration: Add user_subscriptions table for RevenueCat webhook integration
-- This table tracks subscription status from RevenueCat webhooks

-- Create user_subscriptions table
CREATE TABLE IF NOT EXISTS public.user_subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  status text NOT NULL,
  entitlement text NOT NULL,
  revenuecat_app_user_id text NOT NULL,
  product_identifier text NULL,
  store text NULL,
  expires_at timestamp with time zone NULL,
  period_type text NULL,
  purchase_date timestamp with time zone NULL,
  will_renew boolean NOT NULL DEFAULT false,
  billing_issues_detected_at timestamp with time zone NULL,
  unsubscribe_detected_at timestamp with time zone NULL,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  last_webhook_received_at timestamp with time zone NULL,

  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_entitlement_key UNIQUE (user_id, entitlement),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id)
    REFERENCES auth.users(id) ON DELETE CASCADE,
  CONSTRAINT user_subscriptions_status_check CHECK (
    status = ANY (ARRAY[
      'active'::text,
      'expired'::text,
      'grace_period'::text,
      'billing_retry'::text,
      'cancelled'::text
    ])
  )
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS user_subscriptions_user_id_idx
  ON public.user_subscriptions USING btree (user_id);

CREATE INDEX IF NOT EXISTS user_subscriptions_revenuecat_app_user_id_idx
  ON public.user_subscriptions USING btree (revenuecat_app_user_id);

CREATE INDEX IF NOT EXISTS user_subscriptions_expires_at_idx
  ON public.user_subscriptions USING btree (expires_at);

CREATE INDEX IF NOT EXISTS user_subscriptions_status_idx
  ON public.user_subscriptions USING btree (status);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_subscriptions_updated_at
  BEFORE UPDATE ON public.user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.user_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Users can read their own subscriptions
CREATE POLICY "Users can read their own subscriptions"
  ON public.user_subscriptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Service role can manage all subscriptions (for RevenueCat webhooks)
CREATE POLICY "Service role can manage all subscriptions"
  ON public.user_subscriptions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Grant permissions
GRANT SELECT ON public.user_subscriptions TO authenticated;
GRANT ALL ON public.user_subscriptions TO service_role;

-- Add helpful comment
COMMENT ON TABLE public.user_subscriptions IS 'Tracks user subscription status from RevenueCat webhooks';
