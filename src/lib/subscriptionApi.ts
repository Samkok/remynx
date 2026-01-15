/**
 * Subscription API - Supabase Edition
 *
 * Handles subscription and trial management using Supabase as the database
 */

import { supabase, type ProfileRow, type SubscriptionEventRow } from "./supabaseClient";
import type {
  GetSubscriptionStatusResponse,
  SyncRevenueCatResponse,
  CheckSubscriptionResponse,
  UpdateTrialResponse,
  GetSubscriptionEventsResponse,
} from "@/shared/contracts";

// Helper to check if error is a network error
function isNetworkError(error: unknown): boolean {
  const errorMessage = error instanceof Error ? error.message : String(error);
  return (
    errorMessage?.includes('Network') ||
    errorMessage?.includes('network') ||
    errorMessage?.includes('Failed to fetch') ||
    errorMessage?.includes('fetch failed') ||
    errorMessage?.includes('NETWORK_ERROR')
  );
}

// Helper to calculate trial end date (14 days from start)
function calculateTrialEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}

// Helper to check if trial is active
function isTrialActive(trialStartDate: string, trialEndDate: string | null): boolean {
  const now = new Date();
  const start = new Date(trialStartDate);
  const effectiveEnd = trialEndDate ? new Date(trialEndDate) : calculateTrialEndDate(start);
  return now < effectiveEnd;
}

// Helper to calculate days left in trial
function calculateDaysLeft(trialStartDate: string, trialEndDate: string | null): number {
  const now = new Date();
  const start = new Date(trialStartDate);
  const effectiveEnd = trialEndDate ? new Date(trialEndDate) : calculateTrialEndDate(start);

  if (now >= effectiveEnd) return 0;

  const diffTime = effectiveEnd.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, diffDays);
}

// Helper to log subscription event
async function logSubscriptionEvent(
  profileId: string,
  eventType: string,
  eventData: object | null,
  source: string
): Promise<void> {
  try {
    const { error } = await supabase.from("subscription_event").insert({
      profile_id: profileId,
      event_type: eventType,
      event_data: eventData ? JSON.stringify(eventData) : null,
      source,
    });

    if (error) {
      console.error("Failed to log subscription event:", error);
    }
  } catch (error) {
    console.error("Failed to log subscription event:", error);
  }
}

/**
 * Get subscription status for current user
 */
export async function getSubscriptionStatus(): Promise<GetSubscriptionStatusResponse> {
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError) {
      if (isNetworkError(userError)) {
        console.log('[SubscriptionAPI] Network error getting user, returning default status');
        throw new Error('Network request failed');
      }
      throw new Error("Unauthorized");
    }

    if (!user) {
      throw new Error("Unauthorized");
    }

    const { data: profile, error } = await supabase
      .from("profile")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (isNetworkError(error)) {
        console.log('[SubscriptionAPI] Network error getting profile, returning default status');
        throw new Error('Network request failed');
      }
      throw new Error("Profile not found");
    }

    if (!profile) {
      throw new Error("Profile not found");
    }

    const typedProfile = profile as ProfileRow;

    const trialActive = isTrialActive(
      typedProfile.trial_start_date,
      typedProfile.trial_end_date
    );

    const hasAccess = trialActive || typedProfile.has_active_subscription;
    const daysLeft = calculateDaysLeft(
      typedProfile.trial_start_date,
      typedProfile.trial_end_date
    );

    return {
      hasAccess,
      isTrialActive: trialActive,
      hasActiveSubscription: typedProfile.has_active_subscription,
      subscriptionTier: typedProfile.subscription_tier,
      trialStartDate: typedProfile.trial_start_date,
      trialEndDate: typedProfile.trial_end_date || calculateTrialEndDate(new Date(typedProfile.trial_start_date)).toISOString(),
      subscriptionExpiry: typedProfile.subscription_expiry,
      daysLeftInTrial: daysLeft,
    };
  } catch (error) {
    // Re-throw network errors to be handled by the caller
    if (isNetworkError(error)) {
      throw error;
    }
    // Re-throw other errors
    throw error;
  }
}

/**
 * Sync RevenueCat data with database
 */
export async function syncRevenueCat(data: {
  hasActiveEntitlement: boolean;
  entitlements: Record<string, any>;
  revenueCatUserId: string;
}): Promise<SyncRevenueCatResponse> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const typedProfile = profile as ProfileRow;

  // Determine subscription tier and expiry from entitlements
  let subscriptionTier: string | null = null;
  let subscriptionExpiry: string | null = null;

  if (data.hasActiveEntitlement) {
    const premiumEntitlement = data.entitlements["premium"];
    if (premiumEntitlement?.isActive) {
      // Infer tier from product identifier
      const productId = premiumEntitlement.productIdentifier?.toLowerCase() || "";
      if (productId.includes("annual") || productId.includes("year")) {
        subscriptionTier = "annual";
      } else if (productId.includes("monthly") || productId.includes("month")) {
        subscriptionTier = "monthly";
      } else {
        subscriptionTier = "premium";
      }
      subscriptionExpiry = premiumEntitlement.expirationDate || null;
    }
  }

  // Update profile with RevenueCat data
  const { error: updateError } = await supabase
    .from("profile")
    .update({
      has_active_subscription: data.hasActiveEntitlement,
      subscription_tier: subscriptionTier,
      subscription_expiry: subscriptionExpiry,
      revenue_cat_user_id: data.revenueCatUserId,
      last_subscription_check: new Date().toISOString(),
    })
    .eq("id", typedProfile.id);

  if (updateError) {
    throw new Error("Failed to update subscription status");
  }

  // Log event
  await logSubscriptionEvent(
    typedProfile.id,
    "revenuecat_sync",
    {
      hasActiveEntitlement: data.hasActiveEntitlement,
      subscriptionTier,
      subscriptionExpiry,
    },
    "revenuecat"
  );

  const trialActive = isTrialActive(
    typedProfile.trial_start_date,
    typedProfile.trial_end_date
  );

  return {
    success: true,
    hasAccess: trialActive || data.hasActiveEntitlement,
    isTrialActive: trialActive,
    hasActiveSubscription: data.hasActiveEntitlement,
    subscriptionTier,
  };
}

/**
 * Check if user has access to perform an action
 */
export async function checkSubscriptionAccess(action: string): Promise<CheckSubscriptionResponse> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (error || !profile) {
    throw new Error("Profile not found");
  }

  const typedProfile = profile as ProfileRow;

  const trialActive = isTrialActive(
    typedProfile.trial_start_date,
    typedProfile.trial_end_date
  );

  const hasAccess = trialActive || typedProfile.has_active_subscription;

  // Log access check
  await logSubscriptionEvent(
    typedProfile.id,
    "access_check",
    {
      action,
      hasAccess,
      reason: hasAccess
        ? trialActive
          ? "trial_active"
          : "subscription_active"
        : "no_access",
    },
    "frontend"
  );

  return {
    hasAccess,
    isTrialActive: trialActive,
    hasActiveSubscription: typedProfile.has_active_subscription,
    action,
    message: hasAccess
      ? trialActive
        ? "trial_active"
        : "subscription_active"
      : "no_access",
  };
}

/**
 * Update trial for debugging (development only)
 */
export async function updateTrialForDebug(params: {
  trialEndDate?: string | null;
  hasActiveSubscription?: boolean;
  subscriptionTier?: string | null;
}): Promise<UpdateTrialResponse> {
  if (!__DEV__) {
    throw new Error("This endpoint is only available in development");
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("*")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const typedProfile = profile as ProfileRow;

  const updateData: {
    trial_end_date?: string | null;
    has_active_subscription?: boolean;
    subscription_tier?: string | null;
  } = {};

  if (params.trialEndDate !== undefined) {
    updateData.trial_end_date = params.trialEndDate;
  }
  if (params.hasActiveSubscription !== undefined) {
    updateData.has_active_subscription = params.hasActiveSubscription;
  }
  if (params.subscriptionTier !== undefined) {
    updateData.subscription_tier = params.subscriptionTier;
  }

  const { error: updateError } = await supabase
    .from("profile")
    .update(updateData)
    .eq("id", typedProfile.id);

  if (updateError) {
    throw new Error("Failed to update trial");
  }

  // Log event
  await logSubscriptionEvent(
    typedProfile.id,
    "debug_update",
    params,
    "debug_tools"
  );

  // Fetch updated profile to get current state
  const { data: updatedProfile } = await supabase
    .from("profile")
    .select("*")
    .eq("id", typedProfile.id)
    .single();

  const updated = updatedProfile as ProfileRow;
  const trialActive = isTrialActive(
    updated.trial_start_date,
    updated.trial_end_date
  );

  return {
    success: true,
    hasAccess: trialActive || updated.has_active_subscription,
    isTrialActive: trialActive,
    hasActiveSubscription: updated.has_active_subscription,
    subscriptionTier: updated.subscription_tier,
    trialEndDate: updated.trial_end_date,
  };
}

/**
 * Get subscription events for debugging
 */
export async function getSubscriptionEvents(): Promise<GetSubscriptionEventsResponse> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profile")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (profileError || !profile) {
    throw new Error("Profile not found");
  }

  const { data: events, error: eventsError } = await supabase
    .from("subscription_event")
    .select("*")
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (eventsError) {
    throw new Error("Failed to fetch events");
  }

  const typedEvents = events as SubscriptionEventRow[];

  return {
    events: typedEvents.map((e) => ({
      id: e.id,
      eventType: e.event_type,
      eventData: e.event_data ? JSON.parse(e.event_data) : null,
      source: e.source,
      createdAt: e.created_at,
    })),
  };
}
