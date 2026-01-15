import { Hono } from "hono";
import { db } from "../db";
import { type AppType } from "../types";

const streakRouter = new Hono<AppType>();

// Helper to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to check if a date has any work achievement
async function hasAchievementForDate(profileId: string, dateStr: string): Promise<boolean> {
  const count = await db.workAchievement.count({
    where: {
      work: {
        profileId: profileId,
      },
      date: dateStr,
    },
  });
  return count > 0;
}

// Helper to calculate current streak
async function calculateCurrentStreak(profileId: string): Promise<number> {
  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  while (true) {
    const dateStr = formatDate(currentDate);
    const hasAchievement = await hasAchievementForDate(profileId, dateStr);

    if (hasAchievement) {
      streak++;
      currentDate.setDate(currentDate.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}

// Helper to calculate longest streak
async function calculateLongestStreak(profileId: string): Promise<number> {
  // Get all achievement dates for this profile
  const achievements = await db.workAchievement.findMany({
    where: {
      work: {
        profileId: profileId,
      },
    },
    select: {
      date: true,
    },
    orderBy: {
      date: "asc",
    },
  });

  // Get unique dates
  const uniqueDates = [...new Set(achievements.map((a) => a.date))].sort();

  if (uniqueDates.length === 0) return 0;

  let longest = 1;
  let current = 1;

  for (let i = 1; i < uniqueDates.length; i++) {
    const prevDate = new Date(uniqueDates[i - 1]!);
    const currDate = new Date(uniqueDates[i]!);

    const diffTime = currDate.getTime() - prevDate.getTime();
    const diffDays = diffTime / (1000 * 60 * 60 * 24);

    if (diffDays === 1) {
      current++;
      longest = Math.max(longest, current);
    } else {
      current = 1;
    }
  }

  return longest;
}

// POST /api/streak/update - Recalculate and update streak
streakRouter.post("/update", async (c) => {
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

  const currentStreak = await calculateCurrentStreak(profile.id);
  const longestStreak = Math.max(
    profile.longestStreak,
    await calculateLongestStreak(profile.id)
  );

  // Update profile with new streak values
  await db.profile.update({
    where: { id: profile.id },
    data: {
      currentStreak,
      longestStreak,
    },
  });

  return c.json({
    currentStreak,
    longestStreak,
  });
});

// GET /api/streak - Get current streak info
streakRouter.get("/", async (c) => {
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

  return c.json({
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
  });
});

export { streakRouter };
