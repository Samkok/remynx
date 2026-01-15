// contracts.ts
// Shared API contracts (schemas and types) used by both the server and the app.
// Import in the app as: `import { type GetSampleResponse } from "@shared/contracts"`
// Import in the server as: `import { postSampleRequestSchema } from "@shared/contracts"`

import { z } from "zod";

// GET /api/sample
export const getSampleResponseSchema = z.object({
  message: z.string(),
});
export type GetSampleResponse = z.infer<typeof getSampleResponseSchema>;

// POST /api/sample
export const postSampleRequestSchema = z.object({
  value: z.string(),
});
export type PostSampleRequest = z.infer<typeof postSampleRequestSchema>;
export const postSampleResponseSchema = z.object({
  message: z.string(),
});
export type PostSampleResponse = z.infer<typeof postSampleResponseSchema>;

// POST /api/upload/image
export const uploadImageRequestSchema = z.object({
  image: z.instanceof(File),
});
export type UploadImageRequest = z.infer<typeof uploadImageRequestSchema>;
export const uploadImageResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  url: z.string(),
  filename: z.string(),
});
export type UploadImageResponse = z.infer<typeof uploadImageResponseSchema>;

// ============================================
// Profile API Contracts
// ============================================

// WorkAchievement schema
export const workAchievementSchema = z.object({
  id: z.string(),
  text: z.string(),
  date: z.string(),
  createdAt: z.string(),
});
export type WorkAchievement = z.infer<typeof workAchievementSchema>;

// Work schema
export const workSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  color: z.string(),
  skipType: z.enum(["tomorrow", "indefinite"]).nullable(),
  skipDate: z.string().nullable(),
  createdAt: z.string(),
  achievements: z.record(z.string(), z.array(workAchievementSchema)),
});
export type Work = z.infer<typeof workSchema>;

// Profile schema
export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  birthday: z.string(),
  currentStreak: z.number(),
  longestStreak: z.number(),
  termsAcceptedAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Profile = z.infer<typeof profileSchema>;

// GET /api/profile
export const getProfileResponseSchema = z.object({
  profile: profileSchema.nullable(),
  works: z.array(workSchema),
});
export type GetProfileResponse = z.infer<typeof getProfileResponseSchema>;

// POST /api/profile
export const createProfileRequestSchema = z.object({
  name: z.string().min(1),
  birthday: z.string(),
  termsAccepted: z.boolean(),
});
export type CreateProfileRequest = z.infer<typeof createProfileRequestSchema>;
export const createProfileResponseSchema = z.object({
  profile: profileSchema,
});
export type CreateProfileResponse = z.infer<typeof createProfileResponseSchema>;

// PATCH /api/profile
export const updateProfileRequestSchema = z.object({
  name: z.string().min(1).optional(),
  birthday: z.string().optional(),
  currentStreak: z.number().optional(),
  longestStreak: z.number().optional(),
});
export type UpdateProfileRequest = z.infer<typeof updateProfileRequestSchema>;
export const updateProfileResponseSchema = z.object({
  profile: profileSchema,
});
export type UpdateProfileResponse = z.infer<typeof updateProfileResponseSchema>;

// ============================================
// Works API Contracts
// ============================================

// POST /api/works
export const createWorkRequestSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  color: z.string(),
});
export type CreateWorkRequest = z.infer<typeof createWorkRequestSchema>;
export const createWorkResponseSchema = z.object({
  work: workSchema,
});
export type CreateWorkResponse = z.infer<typeof createWorkResponseSchema>;

// PATCH /api/works/:id
export const updateWorkRequestSchema = z.object({
  name: z.string().min(1).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  skipType: z.enum(["tomorrow", "indefinite"]).nullable().optional(),
  skipDate: z.string().nullable().optional(),
});
export type UpdateWorkRequest = z.infer<typeof updateWorkRequestSchema>;
export const updateWorkResponseSchema = z.object({
  work: workSchema,
});
export type UpdateWorkResponse = z.infer<typeof updateWorkResponseSchema>;

// DELETE /api/works/:id
export const deleteWorkResponseSchema = z.object({
  success: z.boolean(),
});
export type DeleteWorkResponse = z.infer<typeof deleteWorkResponseSchema>;

// ============================================
// Work Achievements API Contracts
// ============================================

// POST /api/works/:workId/achievements
export const createAchievementRequestSchema = z.object({
  text: z.string().min(1),
  date: z.string(),
});
export type CreateAchievementRequest = z.infer<typeof createAchievementRequestSchema>;
export const createAchievementResponseSchema = z.object({
  achievement: workAchievementSchema,
});
export type CreateAchievementResponse = z.infer<typeof createAchievementResponseSchema>;

// DELETE /api/works/:workId/achievements/:achievementId
export const deleteAchievementResponseSchema = z.object({
  success: z.boolean(),
});
export type DeleteAchievementResponse = z.infer<typeof deleteAchievementResponseSchema>;

// ============================================
// Streak API Contracts
// ============================================

// POST /api/streak/update
export const updateStreakResponseSchema = z.object({
  currentStreak: z.number(),
  longestStreak: z.number(),
});
export type UpdateStreakResponse = z.infer<typeof updateStreakResponseSchema>;

// ============================================
// Subscription API Contracts
// ============================================

// GET /api/subscription/status
export const getSubscriptionStatusResponseSchema = z.object({
  hasAccess: z.boolean(),
  isTrialActive: z.boolean(),
  hasActiveSubscription: z.boolean(),
  subscriptionTier: z.string().nullable(),
  trialStartDate: z.string(),
  trialEndDate: z.string(),
  subscriptionExpiry: z.string().nullable(),
  daysLeftInTrial: z.number(),
});
export type GetSubscriptionStatusResponse = z.infer<typeof getSubscriptionStatusResponseSchema>;

// POST /api/subscription/sync-revenuecat
export const syncRevenueCatRequestSchema = z.object({
  hasActiveEntitlement: z.boolean(),
  entitlements: z.record(z.string(), z.object({
    identifier: z.string(),
    isActive: z.boolean(),
    productIdentifier: z.string().optional(),
    expirationDate: z.string().optional(),
  })).optional(),
  revenueCatUserId: z.string().optional(),
});
export type SyncRevenueCatRequest = z.infer<typeof syncRevenueCatRequestSchema>;
export const syncRevenueCatResponseSchema = z.object({
  success: z.boolean(),
  hasAccess: z.boolean(),
  isTrialActive: z.boolean(),
  hasActiveSubscription: z.boolean(),
  subscriptionTier: z.string().nullable(),
});
export type SyncRevenueCatResponse = z.infer<typeof syncRevenueCatResponseSchema>;

// POST /api/subscription/check
export const checkSubscriptionRequestSchema = z.object({
  action: z.string(),
});
export type CheckSubscriptionRequest = z.infer<typeof checkSubscriptionRequestSchema>;
export const checkSubscriptionResponseSchema = z.object({
  hasAccess: z.boolean(),
  isTrialActive: z.boolean(),
  hasActiveSubscription: z.boolean(),
  action: z.string(),
  message: z.string().nullable(),
});
export type CheckSubscriptionResponse = z.infer<typeof checkSubscriptionResponseSchema>;

// POST /api/subscription/debug/update-trial
export const updateTrialRequestSchema = z.object({
  trialEndDate: z.string().nullable().optional(),
  hasActiveSubscription: z.boolean().optional(),
  subscriptionTier: z.string().nullable().optional(),
});
export type UpdateTrialRequest = z.infer<typeof updateTrialRequestSchema>;
export const updateTrialResponseSchema = z.object({
  success: z.boolean(),
  hasAccess: z.boolean(),
  isTrialActive: z.boolean(),
  hasActiveSubscription: z.boolean(),
  subscriptionTier: z.string().nullable(),
  trialEndDate: z.string().nullable(),
});
export type UpdateTrialResponse = z.infer<typeof updateTrialResponseSchema>;

// GET /api/subscription/debug/events
export const getSubscriptionEventsResponseSchema = z.object({
  events: z.array(z.object({
    id: z.string(),
    eventType: z.string(),
    eventData: z.record(z.string(), z.unknown()).nullable(),
    source: z.string(),
    createdAt: z.string(),
  })),
});
export type GetSubscriptionEventsResponse = z.infer<typeof getSubscriptionEventsResponseSchema>;

// ============================================
// User Subscriptions API Contracts (New)
// ============================================

// UserSubscription schema
export const userSubscriptionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  status: z.enum(["active", "expired", "grace_period", "billing_retry", "cancelled"]),
  entitlement: z.string(),
  revenuecatAppUserId: z.string(),
  productIdentifier: z.string().nullable(),
  store: z.string().nullable(),
  expiresAt: z.string().nullable(),
  periodType: z.string().nullable(),
  purchaseDate: z.string().nullable(),
  willRenew: z.boolean(),
  billingIssuesDetectedAt: z.string().nullable(),
  unsubscribeDetectedAt: z.string().nullable(),
  createdAt: z.string(),
  updatedAt: z.string(),
  lastWebhookReceivedAt: z.string().nullable(),
});
export type UserSubscription = z.infer<typeof userSubscriptionSchema>;

// GET /api/subscription/current
export const getCurrentSubscriptionResponseSchema = z.object({
  subscription: userSubscriptionSchema.nullable(),
  hasActiveSubscription: z.boolean(),
  isTrialActive: z.boolean(),
  hasAccess: z.boolean(),
});
export type GetCurrentSubscriptionResponse = z.infer<typeof getCurrentSubscriptionResponseSchema>;

