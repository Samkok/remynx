-- Supabase Schema Migration
-- This file contains the SQL schema to replicate the existing Prisma/SQLite schema in Supabase PostgreSQL

-- Enable UUID extension (usually already enabled in Supabase)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================
-- Users Table (extends Supabase auth.users)
-- ============================================
-- Note: Supabase Auth already provides auth.users table
-- We create a public.profiles table that references it

-- ============================================
-- Profile Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.profile (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    birthday TEXT NOT NULL, -- YYYY-MM-DD format
    current_streak INTEGER NOT NULL DEFAULT 0,
    longest_streak INTEGER NOT NULL DEFAULT 0,
    terms_accepted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_profile_user_id ON public.profile(user_id);

-- ============================================
-- Work Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.work (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT NOT NULL,
    skip_type TEXT, -- 'tomorrow' | 'indefinite' | null
    skip_date TEXT, -- YYYY-MM-DD format
    profile_id UUID NOT NULL REFERENCES public.profile(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for profile_id lookups
CREATE INDEX IF NOT EXISTS idx_work_profile_id ON public.work(profile_id);

-- ============================================
-- Work Achievement Table
-- ============================================
CREATE TABLE IF NOT EXISTS public.work_achievement (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    text TEXT NOT NULL,
    date TEXT NOT NULL, -- YYYY-MM-DD format
    work_id UUID NOT NULL REFERENCES public.work(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for work achievements
CREATE INDEX IF NOT EXISTS idx_work_achievement_work_id ON public.work_achievement(work_id);
CREATE INDEX IF NOT EXISTS idx_work_achievement_work_id_date ON public.work_achievement(work_id, date);

-- ============================================
-- Row Level Security (RLS) Policies
-- ============================================

-- Enable RLS on all tables
ALTER TABLE public.profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.work_achievement ENABLE ROW LEVEL SECURITY;

-- Profile policies
CREATE POLICY "Users can view own profile" ON public.profile
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile" ON public.profile
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile" ON public.profile
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own profile" ON public.profile
    FOR DELETE USING (auth.uid() = user_id);

-- Work policies (users can only access works through their profile)
CREATE POLICY "Users can view own works" ON public.work
    FOR SELECT USING (
        profile_id IN (SELECT id FROM public.profile WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can insert own works" ON public.work
    FOR INSERT WITH CHECK (
        profile_id IN (SELECT id FROM public.profile WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can update own works" ON public.work
    FOR UPDATE USING (
        profile_id IN (SELECT id FROM public.profile WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can delete own works" ON public.work
    FOR DELETE USING (
        profile_id IN (SELECT id FROM public.profile WHERE user_id = auth.uid())
    );

-- Work Achievement policies
CREATE POLICY "Users can view own work achievements" ON public.work_achievement
    FOR SELECT USING (
        work_id IN (
            SELECT w.id FROM public.work w
            JOIN public.profile p ON w.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert own work achievements" ON public.work_achievement
    FOR INSERT WITH CHECK (
        work_id IN (
            SELECT w.id FROM public.work w
            JOIN public.profile p ON w.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update own work achievements" ON public.work_achievement
    FOR UPDATE USING (
        work_id IN (
            SELECT w.id FROM public.work w
            JOIN public.profile p ON w.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete own work achievements" ON public.work_achievement
    FOR DELETE USING (
        work_id IN (
            SELECT w.id FROM public.work w
            JOIN public.profile p ON w.profile_id = p.id
            WHERE p.user_id = auth.uid()
        )
    );

-- ============================================
-- Updated_at Trigger Function
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at trigger to tables
CREATE TRIGGER set_profile_updated_at
    BEFORE UPDATE ON public.profile
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER set_work_updated_at
    BEFORE UPDATE ON public.work
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_updated_at();
