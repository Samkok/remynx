// ============================================
// Supabase Client Configuration
// ============================================
// This file initializes the Supabase client for backend operations
//
// Usage:
//   import { supabase, supabaseAdmin } from "./supabase";
//   const { data, error } = await supabase.from("profile").select();
//
// The anon key provides row-level security based on the authenticated user
// For admin operations that bypass RLS, use supabaseAdmin with service role key

import { createClient } from "@supabase/supabase-js";
import { env } from "./env";

// Type definitions for our database tables
export interface Database {
  public: {
    Tables: {
      profile: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          birthday: string;
          current_streak: number;
          longest_streak: number;
          terms_accepted_at: string | null;
          trial_start_date: string;
          trial_end_date: string | null;
          has_active_subscription: boolean;
          subscription_tier: string | null;
          subscription_expiry: string | null;
          revenue_cat_user_id: string | null;
          last_subscription_check: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          birthday: string;
          current_streak?: number;
          longest_streak?: number;
          terms_accepted_at?: string | null;
          trial_start_date?: string;
          trial_end_date?: string | null;
          has_active_subscription?: boolean;
          subscription_tier?: string | null;
          subscription_expiry?: string | null;
          revenue_cat_user_id?: string | null;
          last_subscription_check?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          birthday?: string;
          current_streak?: number;
          longest_streak?: number;
          terms_accepted_at?: string | null;
          trial_end_date?: string | null;
          has_active_subscription?: boolean;
          subscription_tier?: string | null;
          subscription_expiry?: string | null;
          revenue_cat_user_id?: string | null;
          last_subscription_check?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      work: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          color: string;
          skip_type: string | null;
          skip_date: string | null;
          profile_id: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          color: string;
          skip_type?: string | null;
          skip_date?: string | null;
          profile_id: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          color?: string;
          skip_type?: string | null;
          skip_date?: string | null;
          profile_id?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      work_achievement: {
        Row: {
          id: string;
          text: string;
          date: string;
          work_id: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          text: string;
          date: string;
          work_id: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          text?: string;
          date?: string;
          work_id?: string;
          created_at?: string;
        };
      };
      user_subscriptions: {
        Row: {
          id: string;
          user_id: string;
          status: string;
          entitlement: string;
          revenuecat_app_user_id: string;
          product_identifier: string | null;
          store: string | null;
          expires_at: string | null;
          period_type: string | null;
          purchase_date: string | null;
          will_renew: boolean;
          billing_issues_detected_at: string | null;
          unsubscribe_detected_at: string | null;
          created_at: string;
          updated_at: string;
          last_webhook_received_at: string | null;
        };
        Insert: {
          id?: string;
          user_id: string;
          status: string;
          entitlement: string;
          revenuecat_app_user_id: string;
          product_identifier?: string | null;
          store?: string | null;
          expires_at?: string | null;
          period_type?: string | null;
          purchase_date?: string | null;
          will_renew?: boolean;
          billing_issues_detected_at?: string | null;
          unsubscribe_detected_at?: string | null;
          created_at?: string;
          updated_at?: string;
          last_webhook_received_at?: string | null;
        };
        Update: {
          id?: string;
          user_id?: string;
          status?: string;
          entitlement?: string;
          revenuecat_app_user_id?: string;
          product_identifier?: string | null;
          store?: string | null;
          expires_at?: string | null;
          period_type?: string | null;
          purchase_date?: string | null;
          will_renew?: boolean;
          billing_issues_detected_at?: string | null;
          unsubscribe_detected_at?: string | null;
          updated_at?: string;
          last_webhook_received_at?: string | null;
        };
      };
    };
  };
}

console.log("🔧 [Supabase] Initializing Supabase client...");

// Create the Supabase client
// This client uses the anon key and respects Row Level Security policies
export const supabase = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_ANON_KEY,
  {
    auth: {
      autoRefreshToken: true,
      persistSession: false, // Backend doesn't persist sessions
    },
  }
);

console.log("✅ [Supabase] Supabase client initialized");
console.log(`🔗 [Supabase] URL: ${env.SUPABASE_URL}`);

// Helper function to create an authenticated client for a specific user
// This is used when we receive the user's JWT from the frontend
export function createAuthenticatedClient(accessToken: string) {
  return createClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_ANON_KEY,
    {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}
