-- Subscription Feature Migration for Supabase
-- Adds subscription and trial tracking fields to the profile table

-- ============================================
-- Add Subscription Fields to Profile Table
-- ============================================
ALTER TABLE public.profile
ADD COLUMN IF NOT EXISTS trial_start_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS has_active_subscription BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS subscription_tier TEXT,
ADD COLUMN IF NOT EXISTS subscription_expiry TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS revenue_cat_user_id TEXT,
ADD COLUMN IF NOT EXISTS last_subscription_check TIMESTAMPTZ;

-- Create index for subscription queries
CREATE INDEX IF NOT EXISTS idx_profile_subscription ON public.profile(trial_end_date, has_active_subscription);

-- ============================================
-- Subscription Event Log Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.subscription_event (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    event_data TEXT,
    source TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for event lookups
CREATE INDEX IF NOT EXISTS idx_subscription_event_profile_id ON public.subscription_event(profile_id);
CREATE INDEX IF NOT EXISTS idx_subscription_event_created_at ON public.subscription_event(created_at);

-- Enable RLS on subscription events
ALTER TABLE public.subscription_event ENABLE ROW LEVEL SECURITY;

-- Subscription event policies
CREATE POLICY "Users can view own subscription events" ON public.subscription_event
    FOR SELECT USING (
        profile_id IN (SELECT id FROM public.profile WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own subscription events" ON public.subscription_event
    FOR INSERT WITH CHECK (
        profile_id IN (SELECT id FROM public.profile WHERE user_id = auth.uid())
    );
