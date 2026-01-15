/**
 * API Client Module - Supabase Edition
 *
 * This module provides a centralized API client for making requests to Supabase.
 * It handles authentication, request formatting, error handling, and response parsing.
 */

import {
  supabase,
  getSafeSession,
  clearInvalidSession,
  type ProfileRow,
  type WorkRow,
  type WorkAchievementRow,
} from "./supabaseClient";
import type {
  Work as ApiWork,
  WorkAchievement as ApiWorkAchievement,
  Profile as ApiProfile,
  GetProfileResponse,
  CreateProfileResponse,
  CreateWorkResponse,
  UpdateWorkResponse,
  DeleteWorkResponse,
  CreateAchievementResponse,
  DeleteAchievementResponse,
  UpdateStreakResponse,
} from "@/shared/contracts";

// Database row type with joined work_achievement
type WorkWithAchievements = WorkRow & {
  work_achievement: WorkAchievementRow[];
};

// Helper to transform database work to API format
function transformDbWork(dbWork: WorkWithAchievements): ApiWork {
  const achievements: Record<string, ApiWorkAchievement[]> = {};

  if (dbWork.work_achievement) {
    for (const ach of dbWork.work_achievement) {
      if (!achievements[ach.date]) {
        achievements[ach.date] = [];
      }
      achievements[ach.date].push({
        id: ach.id,
        text: ach.text,
        date: ach.date,
        createdAt: ach.created_at,
      });
    }
  }

  return {
    id: dbWork.id,
    name: dbWork.name,
    description: dbWork.description,
    color: dbWork.color,
    skipType: dbWork.skip_type as "tomorrow" | "indefinite" | null,
    skipDate: dbWork.skip_date,
    createdAt: dbWork.created_at,
    achievements,
  };
}

// Helper to format date to YYYY-MM-DD
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Helper to calculate current streak
async function calculateCurrentStreak(profileId: string): Promise<number> {
  let streak = 0;
  const currentDate = new Date();
  currentDate.setHours(0, 0, 0, 0);

  // Get all works for this profile
  const { data: works } = await supabase
    .from("work")
    .select("id")
    .eq("profile_id", profileId);

  if (!works || works.length === 0) return 0;

  const workIds = works.map(w => w.id);

  while (true) {
    const dateStr = formatDate(currentDate);
    const { count } = await supabase
      .from("work_achievement")
      .select("*", { count: "exact", head: true })
      .eq("date", dateStr)
      .in("work_id", workIds);

    if ((count ?? 0) > 0) {
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
  // Get all works for this profile
  const { data: works } = await supabase
    .from("work")
    .select("id")
    .eq("profile_id", profileId);

  if (!works || works.length === 0) return 0;

  const workIds = works.map(w => w.id);

  // Get all achievement dates
  const { data: achievements } = await supabase
    .from("work_achievement")
    .select("date")
    .in("work_id", workIds)
    .order("date", { ascending: true });

  if (!achievements || achievements.length === 0) return 0;

  // Get unique dates
  const uniqueDates = [...new Set(achievements.map(a => a.date))].sort();

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

// Helper to get authenticated user safely, handling refresh token errors
async function getAuthenticatedUser() {
  try {
    const session = await getSafeSession();
    return session?.user ?? null;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (errorMessage?.includes("Refresh Token") ||
        errorMessage?.includes("Invalid Refresh Token") ||
        errorMessage?.includes("Token Not Found")) {
      console.log("Invalid refresh token in API, clearing session");
      await clearInvalidSession();
    }
    return null;
  }
}

/**
 * Supabase API Client
 * Provides methods for interacting with the Supabase database
 */
export const supabaseApi = {
  // Profile endpoints
  profile: {
    // Get current user's profile and works
    get: async (): Promise<GetProfileResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        return { profile: null, works: [] };
      }

      const { data: profileData, error: profileError } = await supabase
        .from("profile")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (profileError || !profileData) {
        return { profile: null, works: [] };
      }

      // Cast profile to expected type
      const profile = profileData as unknown as ProfileRow;

      const { data: worksData } = await supabase
        .from("work")
        .select(`
          *,
          work_achievement (*)
        `)
        .eq("profile_id", profile.id)
        .order("created_at", { ascending: true });

      // Cast the joined data to our expected type
      const typedWorksData = (worksData || []) as unknown as WorkWithAchievements[];
      const works = typedWorksData.map(transformDbWork);

      return {
        profile: {
          id: profile.id,
          name: profile.name,
          birthday: profile.birthday,
          currentStreak: profile.current_streak,
          longestStreak: profile.longest_streak,
          termsAcceptedAt: profile.terms_accepted_at,
          createdAt: profile.created_at,
        },
        works,
      };
    },

    // Create profile
    create: async (data: { name: string; birthday: string; termsAccepted: boolean }): Promise<CreateProfileResponse> => {
      const user = await getAuthenticatedUser();

      console.log('[API] Creating profile - Auth check:', {
        hasUser: !!user,
        userId: user?.id,
      });

      if (!user) {
        console.error('[API] No authenticated user found when creating profile');
        throw new Error("Unauthorized - No authenticated user found");
      }

      if (!data.termsAccepted) {
        throw new Error("You must accept the terms and conditions");
      }

      // Check if profile already exists
      const { data: existingProfile } = await supabase
        .from("profile")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (existingProfile) {
        throw new Error("Profile already exists");
      }

      const { data: profileData, error } = await supabase
        .from("profile")
        .insert({
          user_id: user.id,
          name: data.name,
          birthday: data.birthday,
          terms_accepted_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (error || !profileData) {
        throw new Error(error?.message || "Failed to create profile");
      }

      // Cast to expected type
      const profile = profileData as unknown as ProfileRow;

      return {
        profile: {
          id: profile.id,
          name: profile.name,
          birthday: profile.birthday,
          currentStreak: profile.current_streak,
          longestStreak: profile.longest_streak,
          termsAcceptedAt: profile.terms_accepted_at,
          createdAt: profile.created_at,
        },
      };
    },

    // Update profile
    update: async (data: { name?: string; birthday?: string }): Promise<{ profile: ApiProfile }> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const updateData: { name?: string; birthday?: string } = {};
      if (data.name) updateData.name = data.name;
      if (data.birthday) updateData.birthday = data.birthday;

      const { data: profileData, error } = await supabase
        .from("profile")
        .update(updateData)
        .eq("user_id", user.id)
        .select()
        .single();

      if (error || !profileData) {
        throw new Error(error?.message || "Failed to update profile");
      }

      // Cast to expected type
      const profile = profileData as unknown as ProfileRow;

      return {
        profile: {
          id: profile.id,
          name: profile.name,
          birthday: profile.birthday,
          currentStreak: profile.current_streak,
          longestStreak: profile.longest_streak,
          termsAcceptedAt: profile.terms_accepted_at,
          createdAt: profile.created_at,
        },
      };
    },
  },

  // Works endpoints
  works: {
    // Create a new work
    create: async (data: { name: string; description?: string; color: string }): Promise<CreateWorkResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      const { data: work, error } = await supabase
        .from("work")
        .insert({
          name: data.name,
          description: data.description || null,
          color: data.color,
          profile_id: profile.id,
        })
        .select(`
          *,
          work_achievement (*)
        `)
        .single();

      if (error || !work) {
        throw new Error(error?.message || "Failed to create work");
      }

      // Cast the joined data to our expected type
      const typedWork = work as unknown as WorkWithAchievements;
      return { work: transformDbWork(typedWork) };
    },

    // Update a work
    update: async (workId: string, data: {
      name?: string;
      description?: string;
      color?: string;
      skipType?: "tomorrow" | "indefinite" | null;
      skipDate?: string | null;
    }): Promise<UpdateWorkResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Verify work belongs to user
      const { data: existingWork } = await supabase
        .from("work")
        .select("id")
        .eq("id", workId)
        .eq("profile_id", profile.id)
        .single();

      if (!existingWork) {
        throw new Error("Work not found");
      }

      const updateData: {
        name?: string;
        description?: string;
        color?: string;
        skip_type?: string | null;
        skip_date?: string | null;
      } = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.color !== undefined) updateData.color = data.color;
      if (data.skipType !== undefined) updateData.skip_type = data.skipType;
      if (data.skipDate !== undefined) updateData.skip_date = data.skipDate;

      const { data: work, error } = await supabase
        .from("work")
        .update(updateData)
        .eq("id", workId)
        .select(`
          *,
          work_achievement (*)
        `)
        .single();

      if (error || !work) {
        throw new Error(error?.message || "Failed to update work");
      }

      // Cast the joined data to our expected type
      const typedWork = work as unknown as WorkWithAchievements;
      return { work: transformDbWork(typedWork) };
    },

    // Delete a work
    delete: async (workId: string): Promise<DeleteWorkResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Verify work belongs to user
      const { data: existingWork } = await supabase
        .from("work")
        .select("id")
        .eq("id", workId)
        .eq("profile_id", profile.id)
        .single();

      if (!existingWork) {
        throw new Error("Work not found");
      }

      const { error } = await supabase
        .from("work")
        .delete()
        .eq("id", workId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    },

    // Add achievement to a work
    addAchievement: async (workId: string, data: { text: string; date: string }): Promise<CreateAchievementResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Verify work belongs to user
      const { data: work } = await supabase
        .from("work")
        .select("id")
        .eq("id", workId)
        .eq("profile_id", profile.id)
        .single();

      if (!work) {
        throw new Error("Work not found");
      }

      const { data: achievementData, error } = await supabase
        .from("work_achievement")
        .insert({
          text: data.text,
          date: data.date,
          work_id: workId,
        })
        .select()
        .single();

      if (error || !achievementData) {
        throw new Error(error?.message || "Failed to create achievement");
      }

      // Cast to expected type
      const achievement = achievementData as unknown as WorkAchievementRow;

      return {
        achievement: {
          id: achievement.id,
          text: achievement.text,
          date: achievement.date,
          createdAt: achievement.created_at,
        },
      };
    },

    // Delete an achievement
    deleteAchievement: async (workId: string, achievementId: string): Promise<DeleteAchievementResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      // Verify work belongs to user
      const { data: work } = await supabase
        .from("work")
        .select("id")
        .eq("id", workId)
        .eq("profile_id", profile.id)
        .single();

      if (!work) {
        throw new Error("Work not found");
      }

      // Verify achievement belongs to work
      const { data: achievement } = await supabase
        .from("work_achievement")
        .select("id")
        .eq("id", achievementId)
        .eq("work_id", workId)
        .single();

      if (!achievement) {
        throw new Error("Achievement not found");
      }

      const { error } = await supabase
        .from("work_achievement")
        .delete()
        .eq("id", achievementId);

      if (error) {
        throw new Error(error.message);
      }

      return { success: true };
    },
  },

  // Streak endpoints
  streak: {
    // Get current streak info
    get: async (): Promise<{ currentStreak: number; longestStreak: number }> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("current_streak, longest_streak")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      return {
        currentStreak: profile.current_streak,
        longestStreak: profile.longest_streak,
      };
    },

    // Update streak
    update: async (): Promise<UpdateStreakResponse> => {
      const user = await getAuthenticatedUser();

      if (!user) {
        throw new Error("Unauthorized");
      }

      const { data: profile } = await supabase
        .from("profile")
        .select("id, longest_streak")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        throw new Error("Profile not found");
      }

      const currentStreak = await calculateCurrentStreak(profile.id);
      const calculatedLongest = await calculateLongestStreak(profile.id);
      const longestStreak = Math.max(profile.longest_streak, calculatedLongest);

      // Update profile with new streak values
      await supabase
        .from("profile")
        .update({
          current_streak: currentStreak,
          longest_streak: longestStreak,
        })
        .eq("id", profile.id);

      return {
        currentStreak,
        longestStreak,
      };
    },
  },
};

// Legacy API client for backwards compatibility
// Maps old API paths to new Supabase methods
const api = {
  get: async <T>(path: string): Promise<T> => {
    if (path === "/api/profile") {
      return supabaseApi.profile.get() as Promise<T>;
    }
    if (path === "/api/streak") {
      return supabaseApi.streak.get() as Promise<T>;
    }
    throw new Error(`Unknown GET path: ${path}`);
  },

  post: async <T>(path: string, body?: object): Promise<T> => {
    if (path === "/api/profile") {
      return supabaseApi.profile.create(body as { name: string; birthday: string; termsAccepted: boolean }) as Promise<T>;
    }
    if (path === "/api/works") {
      return supabaseApi.works.create(body as { name: string; description?: string; color: string }) as Promise<T>;
    }
    if (path.match(/^\/api\/works\/[^/]+\/achievements$/)) {
      const workId = path.split("/")[3];
      return supabaseApi.works.addAchievement(workId!, body as { text: string; date: string }) as Promise<T>;
    }
    if (path === "/api/streak/update") {
      return supabaseApi.streak.update() as Promise<T>;
    }
    throw new Error(`Unknown POST path: ${path}`);
  },

  patch: async <T>(path: string, body?: object): Promise<T> => {
    if (path === "/api/profile") {
      return supabaseApi.profile.update(body as { name?: string; birthday?: string }) as Promise<T>;
    }
    if (path.match(/^\/api\/works\/[^/]+$/)) {
      const workId = path.split("/")[3];
      return supabaseApi.works.update(workId!, body as { name?: string; description?: string; color?: string; skipType?: "tomorrow" | "indefinite" | null; skipDate?: string | null }) as Promise<T>;
    }
    throw new Error(`Unknown PATCH path: ${path}`);
  },

  delete: async <T>(path: string): Promise<T> => {
    if (path.match(/^\/api\/works\/[^/]+$/)) {
      const workId = path.split("/")[3];
      return supabaseApi.works.delete(workId!) as Promise<T>;
    }
    if (path.match(/^\/api\/works\/[^/]+\/achievements\/[^/]+$/)) {
      const parts = path.split("/");
      const workId = parts[3];
      const achievementId = parts[5];
      return supabaseApi.works.deleteAchievement(workId!, achievementId!) as Promise<T>;
    }
    throw new Error(`Unknown DELETE path: ${path}`);
  },

  put: async <T>(_path: string, _body?: object): Promise<T> => {
    throw new Error(`PUT not implemented`);
  },
};

// Backend URL is no longer needed, but kept for compatibility
const BACKEND_URL = process.env.EXPO_PUBLIC_VIBECODE_BACKEND_URL || "";

export { api, BACKEND_URL };
