import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  checkSubscriptionRequestSchema,
  syncRevenueCatRequestSchema,
  updateTrialRequestSchema,
  type UserSubscription,
} from "@/shared/contracts";

const subscriptionRouter = new Hono<AppType>();

// Helper to calculate trial end date (2 weeks from start)
function calculateTrialEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}

// Helper to check if trial is active
function isTrialActive(trialStartDate: Date, trialEndDate: Date | null): boolean {
  const now = new Date();
  const effectiveEndDate = trialEndDate || calculateTrialEndDate(trialStartDate);
  return now < effectiveEndDate;
}

// Helper to check if user has active subscription from user_subscriptions table
async function hasActiveSubscriptionFromTable(userId: string): Promise<boolean> {
  const subscription = await db.userSubscription.findFirst({
    where: {
      userId,
      status: "active",
      OR: [
        { expiresAt: null }, // Non-expiring subscriptions
        { expiresAt: { gt: new Date() } }, // Not expired yet
      ],
    },
  });

  return !!subscription;
}

// Helper to get current active subscription
async function getCurrentSubscription(userId: string) {
  return db.userSubscription.findFirst({
    where: {
      userId,
      status: "active",
      OR: [
        { expiresAt: null },
        { expiresAt: { gt: new Date() } },
      ],
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

// Helper to log subscription event
async function logSubscriptionEvent(
  profileId: string,
  eventType: string,
  source: string,
  eventData?: Record<string, unknown>
) {
  await db.subscriptionEvent.create({
    data: {
      profileId,
      eventType,
      source,
      eventData: eventData ? JSON.stringify(eventData) : null,
    },
  });
}

// GET /api/subscription/status - Get subscription status for current user
subscriptionRouter.get("/status", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const trialActive = isTrialActive(profile.trialStartDate, profile.trialEndDate);

  // Check subscription from user_subscriptions table
  const hasActiveSub = await hasActiveSubscriptionFromTable(user.id);
  const hasAccess = trialActive || hasActiveSub;

  return c.json({
    hasAccess,
    isTrialActive: trialActive,
    hasActiveSubscription: hasActiveSub,
    subscriptionTier: profile.subscriptionTier,
    trialStartDate: profile.trialStartDate.toISOString(),
    trialEndDate: profile.trialEndDate?.toISOString() || calculateTrialEndDate(profile.trialStartDate).toISOString(),
    subscriptionExpiry: profile.subscriptionExpiry?.toISOString() || null,
    daysLeftInTrial: trialActive ? Math.ceil((calculateTrialEndDate(profile.trialStartDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : 0,
  });
});

// GET /api/subscription/current - Get current active subscription details
subscriptionRouter.get("/current", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const subscription = await getCurrentSubscription(user.id);
  const trialActive = isTrialActive(profile.trialStartDate, profile.trialEndDate);
  const hasActiveSub = !!subscription;
  const hasAccess = trialActive || hasActiveSub;

  return c.json({
    subscription: subscription ? {
      id: subscription.id,
      userId: subscription.userId,
      status: subscription.status,
      entitlement: subscription.entitlement,
      revenuecatAppUserId: subscription.revenuecatAppUserId,
      productIdentifier: subscription.productIdentifier,
      store: subscription.store,
      expiresAt: subscription.expiresAt?.toISOString() || null,
      periodType: subscription.periodType,
      purchaseDate: subscription.purchaseDate?.toISOString() || null,
      willRenew: subscription.willRenew,
      billingIssuesDetectedAt: subscription.billingIssuesDetectedAt?.toISOString() || null,
      unsubscribeDetectedAt: subscription.unsubscribeDetectedAt?.toISOString() || null,
      createdAt: subscription.createdAt.toISOString(),
      updatedAt: subscription.updatedAt.toISOString(),
      lastWebhookReceivedAt: subscription.lastWebhookReceivedAt?.toISOString() || null,
    } : null,
    hasActiveSubscription: hasActiveSub,
    isTrialActive: trialActive,
    hasAccess,
  });
});

// POST /api/subscription/sync-revenuecat - Sync subscription from RevenueCat
subscriptionRouter.post("/sync-revenuecat", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = syncRevenueCatRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { hasActiveEntitlement, entitlements, revenueCatUserId } = parsed.data;

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Determine subscription tier from entitlements
  let subscriptionTier: string | null = null;
  if (hasActiveEntitlement && entitlements?.premium) {
    // Check product identifier to determine tier
    const productId = entitlements.premium.productIdentifier?.toLowerCase() || "";
    if (productId.includes("annual") || productId.includes("year")) {
      subscriptionTier = "annual";
    } else if (productId.includes("monthly") || productId.includes("month")) {
      subscriptionTier = "monthly";
    }
  }

  // Update profile with subscription status
  const updatedProfile = await db.profile.update({
    where: { userId: user.id },
    data: {
      hasActiveSubscription: hasActiveEntitlement,
      subscriptionTier,
      revenueCatUserId,
      lastSubscriptionCheck: new Date(),
      subscriptionExpiry: hasActiveEntitlement && entitlements?.premium?.expirationDate
        ? new Date(entitlements.premium.expirationDate)
        : null,
    },
  });

  // Log event
  const wasSubscribed = profile.hasActiveSubscription;
  if (hasActiveEntitlement && !wasSubscribed) {
    await logSubscriptionEvent(profile.id, "subscription_purchased", "revenuecat", {
      tier: subscriptionTier,
      revenueCatUserId,
    });
  } else if (!hasActiveEntitlement && wasSubscribed) {
    await logSubscriptionEvent(profile.id, "subscription_expired", "revenuecat", {
      revenueCatUserId,
    });
  }

  const trialActive = isTrialActive(updatedProfile.trialStartDate, updatedProfile.trialEndDate);
  const hasAccess = trialActive || updatedProfile.hasActiveSubscription;

  return c.json({
    success: true,
    hasAccess,
    isTrialActive: trialActive,
    hasActiveSubscription: updatedProfile.hasActiveSubscription,
    subscriptionTier: updatedProfile.subscriptionTier,
  });
});

// POST /api/subscription/check - Check if user has access (trial or subscription)
subscriptionRouter.post("/check", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = checkSubscriptionRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { action } = parsed.data;

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const trialActive = isTrialActive(profile.trialStartDate, profile.trialEndDate);

  // Check subscription from user_subscriptions table
  const hasActiveSub = await hasActiveSubscriptionFromTable(user.id);
  const hasAccess = trialActive || hasActiveSub;

  // Log trial expiry event if trial just expired
  if (!trialActive && !hasActiveSub && profile.trialEndDate === null) {
    await db.profile.update({
      where: { userId: user.id },
      data: { trialEndDate: calculateTrialEndDate(profile.trialStartDate) },
    });
    await logSubscriptionEvent(profile.id, "trial_expired", "manual");
  }

  return c.json({
    hasAccess,
    isTrialActive: trialActive,
    hasActiveSubscription: hasActiveSub,
    action,
    message: !hasAccess
      ? "Your free trial has ended. Please subscribe to continue using this feature."
      : null,
  });
});

// POST /api/subscription/debug/update-trial - Debug endpoint to update trial dates
subscriptionRouter.post("/debug/update-trial", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = updateTrialRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { trialEndDate, hasActiveSubscription, subscriptionTier } = parsed.data;

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const updateData: {
    trialEndDate?: Date | null;
    hasActiveSubscription?: boolean;
    subscriptionTier?: string | null;
  } = {};

  if (trialEndDate !== undefined) {
    updateData.trialEndDate = trialEndDate ? new Date(trialEndDate) : null;
  }

  if (hasActiveSubscription !== undefined) {
    updateData.hasActiveSubscription = hasActiveSubscription;
  }

  if (subscriptionTier !== undefined) {
    updateData.subscriptionTier = subscriptionTier;
  }

  const updatedProfile = await db.profile.update({
    where: { userId: user.id },
    data: updateData,
  });

  // Log debug event
  await logSubscriptionEvent(profile.id, "subscription_purchased", "debug", {
    trialEndDate,
    hasActiveSubscription,
    subscriptionTier,
  });

  const trialActive = isTrialActive(updatedProfile.trialStartDate, updatedProfile.trialEndDate);
  const hasAccess = trialActive || updatedProfile.hasActiveSubscription;

  return c.json({
    success: true,
    hasAccess,
    isTrialActive: trialActive,
    hasActiveSubscription: updatedProfile.hasActiveSubscription,
    subscriptionTier: updatedProfile.subscriptionTier,
    trialEndDate: updatedProfile.trialEndDate?.toISOString(),
  });
});

// GET /api/subscription/debug/events - Get subscription events for debugging
subscriptionRouter.get("/debug/events", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  const events = await db.subscriptionEvent.findMany({
    where: { profileId: profile.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return c.json({
    events: events.map((e) => ({
      id: e.id,
      eventType: e.eventType,
      eventData: e.eventData ? JSON.parse(e.eventData) : null,
      source: e.source,
      createdAt: e.createdAt.toISOString(),
    })),
  });
});

export { subscriptionRouter };
