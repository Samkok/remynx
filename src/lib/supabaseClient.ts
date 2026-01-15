// ============================================
// Supabase Client Configuration for React Native
// ============================================
// This file initializes the Supabase client for the Expo app
//
// Usage:
//   import { supabase } from "./supabaseClient";
//   const { data, error } = await supabase.from("profile").select();
//
// Authentication:
//   import { supabase } from "./supabaseClient";
//   await supabase.auth.signUp({ email, password });
//   await supabase.auth.signInWithPassword({ email, password });
//   await supabase.auth.signOut();

import "react-native-url-polyfill/auto";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { Platform } from "react-native";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
  throw new Error(
    "Supabase configuration is missing. Please check your environment variables."
  );
}

// Type definitions for our database tables
export type Database = {
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
          updated_at?: string;
        };
        Relationships: [];
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
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "work_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profile";
            referencedColumns: ["id"];
          }
        ];
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
        };
        Relationships: [
          {
            foreignKeyName: "work_achievement_work_id_fkey";
            columns: ["work_id"];
            referencedRelation: "work";
            referencedColumns: ["id"];
          }
        ];
      };
      subscription_event: {
        Row: {
          id: string;
          profile_id: string;
          event_type: string;
          event_data: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          event_type: string;
          event_data?: string | null;
          source: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          profile_id?: string;
          event_type?: string;
          event_data?: string | null;
          source?: string;
        };
        Relationships: [
          {
            foreignKeyName: "subscription_event_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profile";
            referencedColumns: ["id"];
          }
        ];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

// Create Supabase client with AsyncStorage for session persistence
export const supabase: SupabaseClient<Database> = createClient<Database>(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: Platform.OS === "web",
    },
  }
);

// Listen for auth errors and clear invalid sessions
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === "TOKEN_REFRESHED") {
    console.log("Token refreshed successfully");
  }
});

// Helper to clear invalid session when refresh token is invalid
export async function clearInvalidSession() {
  try {
    // Clear the session from Supabase
    await supabase.auth.signOut({ scope: "local" });
    // Also clear from AsyncStorage directly to be sure
    await AsyncStorage.removeItem("supabase.auth.token");
    console.log("Cleared invalid session");
  } catch (error) {
    console.log("Error clearing session:", error);
  }
}

// Safe session getter that handles invalid refresh tokens
export async function getSafeSession() {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();

    if (error) {
      // Check if it's a refresh token error
      if (error.message?.includes("Refresh Token") ||
          error.message?.includes("Invalid Refresh Token") ||
          error.message?.includes("Token Not Found")) {
        console.log("Invalid refresh token detected, clearing session");
        await clearInvalidSession();
        return null;
      }
      console.log("Session error:", error.message);
      return null;
    }

    return session;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Handle any refresh token errors thrown as exceptions
    if (errorMessage?.includes("Refresh Token") ||
        errorMessage?.includes("Invalid Refresh Token") ||
        errorMessage?.includes("Token Not Found")) {
      console.log("Invalid refresh token exception, clearing session");
      await clearInvalidSession();
    }
    return null;
  }
}

// Export typed database types for use throughout the app
export type ProfileRow = Database["public"]["Tables"]["profile"]["Row"];
export type ProfileInsert = Database["public"]["Tables"]["profile"]["Insert"];
export type ProfileUpdate = Database["public"]["Tables"]["profile"]["Update"];

export type WorkRow = Database["public"]["Tables"]["work"]["Row"];
export type WorkInsert = Database["public"]["Tables"]["work"]["Insert"];
export type WorkUpdate = Database["public"]["Tables"]["work"]["Update"];

export type WorkAchievementRow = Database["public"]["Tables"]["work_achievement"]["Row"];
export type WorkAchievementInsert = Database["public"]["Tables"]["work_achievement"]["Insert"];
export type WorkAchievementUpdate = Database["public"]["Tables"]["work_achievement"]["Update"];

export type SubscriptionEventRow = Database["public"]["Tables"]["subscription_event"]["Row"];
export type SubscriptionEventInsert = Database["public"]["Tables"]["subscription_event"]["Insert"];
export type SubscriptionEventUpdate = Database["public"]["Tables"]["subscription_event"]["Update"];

export type UserSubscriptionRow = Database["public"]["Tables"]["user_subscriptions"]["Row"];
export type UserSubscriptionInsert = Database["public"]["Tables"]["user_subscriptions"]["Insert"];
export type UserSubscriptionUpdate = Database["public"]["Tables"]["user_subscriptions"]["Update"];

// Helper to get current user
export async function getCurrentUser() {
  try {
    const session = await getSafeSession();
    return session?.user ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("Refresh Token") ||
        errorMessage?.includes("Invalid Refresh Token") ||
        errorMessage?.includes("Token Not Found")) {
      console.log("Invalid refresh token in getCurrentUser, clearing session");
      await clearInvalidSession();
    } else {
      console.log("Error getting current user:", errorMessage);
    }
    return null;
  }
}

// Helper to get current session
export async function getCurrentSession() {
  try {
    return await getSafeSession();
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("Refresh Token") ||
        errorMessage?.includes("Invalid Refresh Token") ||
        errorMessage?.includes("Token Not Found")) {
      console.log("Invalid refresh token in getCurrentSession, clearing session");
      await clearInvalidSession();
    } else {
      console.log("Error getting session:", errorMessage);
    }
    return null;
  }
}
