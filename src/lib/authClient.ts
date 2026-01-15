// ============================================
// Supabase Auth Client for React Native
// ============================================
// This replaces the Better Auth client with Supabase Auth
// Provides a similar API for easy migration

import { supabase, clearInvalidSession, getSafeSession } from "./supabaseClient";
import { useEffect, useState, useCallback } from "react";
import type { User, Session, AuthError } from "@supabase/supabase-js";

// Session data type matching the old Better Auth structure
interface SessionData {
  user: {
    id: string;
    email: string;
    name: string;
    emailVerified: boolean;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
    createdAt: Date;
    updatedAt: Date;
  };
}

// Auth client that mimics the Better Auth API
export const authClient = {
  // Sign up with email and password
  signUp: {
    email: async ({
      email,
      password,
      name,
    }: {
      email: string;
      password: string;
      name: string;
    }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
          },
          emailRedirectTo: undefined,
        },
      });

      if (error) {
        return { data: null, error: { message: error.message } };
      }

      // Check if email confirmation is required
      if (data.user && !data.session) {
        return {
          data: null,
          error: {
            message: "Please check your email to confirm your account before signing in."
          }
        };
      }

      return { data: data.user, error: null };
    },
  },

  // Sign in with email and password
  signIn: {
    email: async ({ email, password }: { email: string; password: string }) => {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { data: null, error: { message: error.message } };
      }

      return { data: data.user, error: null };
    },
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      throw error;
    }
  },

  // Get current session
  getSession: async (): Promise<{ data: SessionData | null } | null> => {
    try {
      const session = await getSafeSession();

      if (!session) {
        return { data: null };
      }

      const user = session.user;

      return {
        data: {
          user: {
            id: user.id,
            email: user.email || "",
            name: user.user_metadata?.name || "",
            emailVerified: !!user.email_confirmed_at,
            image: user.user_metadata?.avatar_url || null,
            createdAt: new Date(user.created_at),
            updatedAt: new Date(user.updated_at || user.created_at),
          },
          session: {
            id: session.access_token.slice(0, 20), // Use part of token as ID
            userId: user.id,
            token: session.access_token,
            expiresAt: new Date(session.expires_at! * 1000),
            createdAt: new Date(user.created_at),
            updatedAt: new Date(),
          },
        },
      };
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      // Handle refresh token errors
      if (errorMessage?.includes("Refresh Token") ||
          errorMessage?.includes("Invalid Refresh Token") ||
          errorMessage?.includes("Token Not Found")) {
        console.log("Invalid refresh token in getSession, clearing session");
        await clearInvalidSession();
      } else {
        console.error("Error getting session:", error);
      }
      return { data: null };
    }
  },

  // Get cookie (not used with Supabase, but kept for API compatibility)
  getCookie: (): string => {
    return "";
  },

  // React hook to get session state
  useSession: () => {
    const [data, setData] = useState<SessionData | null>(null);
    const [isPending, setIsPending] = useState(true);
    const [error, setError] = useState<AuthError | null>(null);

    const fetchSession = useCallback(async () => {
      try {
        const session = await getSafeSession();

        if (session) {
          const user = session.user;
          setData({
            user: {
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || "",
              emailVerified: !!user.email_confirmed_at,
              image: user.user_metadata?.avatar_url || null,
              createdAt: new Date(user.created_at),
              updatedAt: new Date(user.updated_at || user.created_at),
            },
            session: {
              id: session.access_token.slice(0, 20),
              userId: user.id,
              token: session.access_token,
              expiresAt: new Date(session.expires_at! * 1000),
              createdAt: new Date(user.created_at),
              updatedAt: new Date(),
            },
          });
          setError(null);
        } else {
          setData(null);
          setError(null);
        }
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        // Handle refresh token errors silently
        if (errorMessage?.includes("Refresh Token") ||
            errorMessage?.includes("Invalid Refresh Token") ||
            errorMessage?.includes("Token Not Found")) {
          console.log("Invalid refresh token in useSession, clearing");
          await clearInvalidSession();
          setError(null);
        } else {
          setError(e as AuthError);
        }
        setData(null);
      } finally {
        setIsPending(false);
      }
    }, []);

    useEffect(() => {
      // Initial fetch
      fetchSession();

      // Subscribe to auth state changes
      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange(async (event, session) => {
        // Handle token refresh errors
        if (event === "TOKEN_REFRESHED" && !session) {
          console.log("Token refresh failed, clearing session");
          await clearInvalidSession();
          setData(null);
          setIsPending(false);
          return;
        }

        if (session) {
          const user = session.user;
          setData({
            user: {
              id: user.id,
              email: user.email || "",
              name: user.user_metadata?.name || "",
              emailVerified: !!user.email_confirmed_at,
              image: user.user_metadata?.avatar_url || null,
              createdAt: new Date(user.created_at),
              updatedAt: new Date(user.updated_at || user.created_at),
            },
            session: {
              id: session.access_token.slice(0, 20),
              userId: user.id,
              token: session.access_token,
              expiresAt: new Date(session.expires_at! * 1000),
              createdAt: new Date(user.created_at),
              updatedAt: new Date(),
            },
          });
        } else {
          setData(null);
        }
        setIsPending(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }, [fetchSession]);

    return {
      data,
      isPending,
      error,
      refetch: fetchSession,
    };
  },
};
