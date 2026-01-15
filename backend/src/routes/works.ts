import { Hono } from "hono";
import { db } from "../db";
import { supabase } from "../supabase";
import { type AppType } from "../types";
import {
  createWorkRequestSchema,
  updateWorkRequestSchema,
  createAchievementRequestSchema,
  type Work,
  type WorkAchievement,
} from "@/shared/contracts";

const worksRouter = new Hono<AppType>();

// Helper to transform DB work to API work format
function transformWork(
  dbWork: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    skipType: string | null;
    skipDate: string | null;
    createdAt: Date;
    achievements: { id: string; text: string; date: string; createdAt: Date }[];
  }
): Work {
  const achievementsByDate: Record<string, WorkAchievement[]> = {};
  for (const ach of dbWork.achievements) {
    if (!achievementsByDate[ach.date]) {
      achievementsByDate[ach.date] = [];
    }
    achievementsByDate[ach.date]!.push({
      id: ach.id,
      text: ach.text,
      date: ach.date,
      createdAt: ach.createdAt.toISOString(),
    });
  }

  return {
    id: dbWork.id,
    name: dbWork.name,
    description: dbWork.description,
    color: dbWork.color,
    skipType: dbWork.skipType as "tomorrow" | "indefinite" | null,
    skipDate: dbWork.skipDate,
    createdAt: dbWork.createdAt.toISOString(),
    achievements: achievementsByDate,
  };
}

// Helper to get user's profile
async function getUserProfile(userId: string) {
  return db.profile.findUnique({
    where: { userId },
  });
}

// Helper to check if user has access (trial or subscription) using Supabase
async function userHasAccess(userId: string): Promise<boolean> {
  try {
    // Get profile from Supabase for trial info
    const { data: profile, error: profileError } = await supabase
      .from('profile')
      .select('trial_start_date, trial_end_date')
      .eq('user_id', userId)
      .single<{
        trial_start_date: string;
        trial_end_date: string | null;
      }>();

    if (profileError || !profile) {
      console.error('[Works] Error fetching profile:', profileError);
      return false;
    }

    // Check trial
    const now = new Date();
    const trialStart = new Date(profile.trial_start_date);
    const trialEnd = profile.trial_end_date
      ? new Date(profile.trial_end_date)
      : new Date(trialStart.getTime() + 14 * 24 * 60 * 60 * 1000);
    const isTrialActive = now < trialEnd;

    // Check active subscription from Supabase user_subscriptions table
    const { data: subscriptions, error: subsError } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + now.toISOString())
      .limit(1);

    if (subsError) {
      console.error('[Works] Error fetching subscriptions:', subsError);
    }

    const hasActiveSubscription = !!(subscriptions && subscriptions.length > 0);

    return isTrialActive || hasActiveSubscription;
  } catch (error) {
    console.error('[Works] Error checking user access:', error);
    return false;
  }
}

// POST /api/works - Create a new work
worksRouter.post("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Check if user has access (trial or subscription)
  const hasAccess = await userHasAccess(user.id);
  if (!hasAccess) {
    return c.json({
      error: "Subscription required",
      message: "Your free trial has ended. Please subscribe to create new works."
    }, 403);
  }

  const body = await c.req.json();
  const parsed = createWorkRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const work = await db.work.create({
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      color: parsed.data.color,
      profileId: profile.id,
    },
    include: {
      achievements: true,
    },
  });

  return c.json({ work: transformWork(work) });
});

// PATCH /api/works/:id - Update a work
worksRouter.patch("/:id", async (c) => {
  const user = c.get("user");
  const workId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Verify the work belongs to the user
  const existingWork = await db.work.findFirst({
    where: { id: workId, profileId: profile.id },
  });

  if (!existingWork) {
    return c.json({ error: "Work not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = updateWorkRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const work = await db.work.update({
    where: { id: workId },
    data: parsed.data,
    include: {
      achievements: true,
    },
  });

  return c.json({ work: transformWork(work) });
});

// DELETE /api/works/:id - Delete a work
worksRouter.delete("/:id", async (c) => {
  const user = c.get("user");
  const workId = c.req.param("id");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Verify the work belongs to the user
  const existingWork = await db.work.findFirst({
    where: { id: workId, profileId: profile.id },
  });

  if (!existingWork) {
    return c.json({ error: "Work not found" }, 404);
  }

  await db.work.delete({
    where: { id: workId },
  });

  return c.json({ success: true });
});

// POST /api/works/:workId/achievements - Add achievement to a work
worksRouter.post("/:workId/achievements", async (c) => {
  const user = c.get("user");
  const workId = c.req.param("workId");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Check if user has access (trial or subscription)
  const hasAccess = await userHasAccess(user.id);
  if (!hasAccess) {
    return c.json({
      error: "Subscription required",
      message: "Your free trial has ended. Please subscribe to add achievements."
    }, 403);
  }

  // Verify the work belongs to the user
  const work = await db.work.findFirst({
    where: { id: workId, profileId: profile.id },
  });

  if (!work) {
    return c.json({ error: "Work not found" }, 404);
  }

  const body = await c.req.json();
  const parsed = createAchievementRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const achievement = await db.workAchievement.create({
    data: {
      text: parsed.data.text,
      date: parsed.data.date,
      workId: workId,
    },
  });

  return c.json({
    achievement: {
      id: achievement.id,
      text: achievement.text,
      date: achievement.date,
      createdAt: achievement.createdAt.toISOString(),
    },
  });
});

// DELETE /api/works/:workId/achievements/:achievementId - Delete an achievement
worksRouter.delete("/:workId/achievements/:achievementId", async (c) => {
  const user = c.get("user");
  const workId = c.req.param("workId");
  const achievementId = c.req.param("achievementId");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const profile = await getUserProfile(user.id);
  if (!profile) {
    return c.json({ error: "Profile not found" }, 404);
  }

  // Verify the work belongs to the user
  const work = await db.work.findFirst({
    where: { id: workId, profileId: profile.id },
  });

  if (!work) {
    return c.json({ error: "Work not found" }, 404);
  }

  // Verify the achievement belongs to the work
  const achievement = await db.workAchievement.findFirst({
    where: { id: achievementId, workId: workId },
  });

  if (!achievement) {
    return c.json({ error: "Achievement not found" }, 404);
  }

  await db.workAchievement.delete({
    where: { id: achievementId },
  });

  return c.json({ success: true });
});

export { worksRouter };
