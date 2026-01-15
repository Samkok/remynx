# Subscription System Fix - Supabase Migration Required

## What Was Fixed

The subscription system was trying to call backend API endpoints that required Better Auth authentication, but the app uses **Supabase** for authentication. This caused 401 Unauthorized errors.

The fix:
1. ✅ Added subscription fields to Supabase database schema
2. ✅ Created Supabase-based subscription API functions
3. ✅ Updated subscription context to use Supabase directly

## Required Action: Run SQL Migration

You need to add the subscription fields to your Supabase database. Here's how:

### Step 1: Go to your Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Select your project
3. Go to **SQL Editor** in the left sidebar

### Step 2: Run the Migration SQL

Copy and paste the contents of `supabase-subscription-migration.sql` into the SQL Editor and click **Run**.

The migration will add:
- Trial tracking fields to the `profile` table
- Subscription status fields (has_active_subscription, subscription_tier, etc.)
- A new `subscription_event` table for audit logging

### Step 3: Test the Debug Tools

After running the migration:
1. Refresh your app
2. Go to **Profile** > **Settings** > **Debug Subscription**
3. Try the debug actions - they should now work without errors!

## What the Migration Does

The SQL migration adds these fields to your `profile` table:
- `trial_start_date` - When the user's trial started (defaults to account creation)
- `trial_end_date` - When the trial expires (14 days from start, or custom)
- `has_active_subscription` - Whether user has paid subscription
- `subscription_tier` - "monthly" or "annual" or null
- `subscription_expiry` - When subscription expires
- `revenue_cat_user_id` - RevenueCat user ID for sync
- `last_subscription_check` - Last time we checked with RevenueCat

And creates a new `subscription_event` table for logging all subscription-related events.

## Files Changed

1. **src/lib/supabaseClient.ts** - Added subscription field types
2. **src/lib/subscriptionApi.ts** - NEW: Supabase-based subscription functions
3. **src/lib/subscription-context.tsx** - Updated to use Supabase API instead of backend
4. **supabase-subscription-migration.sql** - NEW: SQL migration file

## No Backend Changes Needed

The backend subscription endpoints are no longer used. Everything now goes through Supabase, which matches how the rest of your app works with authentication.
