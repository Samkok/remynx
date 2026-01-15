import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";
import {
  createProfileRequestSchema,
  updateProfileRequestSchema,
  type Work,
  type WorkAchievement,
} from "@/shared/contracts";

const profileRouter = new Hono<AppType>();

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
  // Group achievements by date
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

// GET /api/profile - Get current user's profile and works
profileRouter.get("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ profile: null, works: [] });
  }

  const profile = await db.profile.findUnique({
    where: { userId: user.id },
    include: {
      works: {
        include: {
          achievements: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!profile) {
    return c.json({ profile: null, works: [] });
  }

  const works = profile.works.map(transformWork);

  return c.json({
    profile: {
      id: profile.id,
      name: profile.name,
      birthday: profile.birthday,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      termsAcceptedAt: profile.termsAcceptedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
    },
    works,
  });
});

// POST /api/profile - Create profile
profileRouter.post("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = createProfileRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const { name, birthday, termsAccepted } = parsed.data;

  if (!termsAccepted) {
    return c.json({ error: "You must accept the terms and conditions" }, 400);
  }

  // Check if profile already exists
  const existingProfile = await db.profile.findUnique({
    where: { userId: user.id },
  });

  if (existingProfile) {
    return c.json({ error: "Profile already exists" }, 400);
  }

  const profile = await db.profile.create({
    data: {
      name,
      birthday,
      userId: user.id,
      termsAcceptedAt: new Date(),
      trialStartDate: new Date(),
      trialEndDate: null,
    },
  });

  return c.json({
    profile: {
      id: profile.id,
      name: profile.name,
      birthday: profile.birthday,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      termsAcceptedAt: profile.termsAcceptedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
    },
  });
});

// PATCH /api/profile - Update profile
profileRouter.patch("/", async (c) => {
  const user = c.get("user");

  if (!user) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const body = await c.req.json();
  const parsed = updateProfileRequestSchema.safeParse(body);

  if (!parsed.success) {
    return c.json({ error: "Invalid request", details: parsed.error.issues }, 400);
  }

  const profile = await db.profile.update({
    where: { userId: user.id },
    data: parsed.data,
  });

  return c.json({
    profile: {
      id: profile.id,
      name: profile.name,
      birthday: profile.birthday,
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      termsAcceptedAt: profile.termsAcceptedAt?.toISOString() ?? null,
      createdAt: profile.createdAt.toISOString(),
    },
  });
});

export { profileRouter };
