/**
 * Subscription Context and Hooks
 *
 * Manages subscription status, trial tracking, and RevenueCat integration.
 * Uses React Query for caching and automatic refetching.
 * Uses Supabase for data storage instead of backend API.
 */

import { createContext, useContext, useCallback, useMemo, useEffect, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Purchases from "react-native-purchases";
import {
  getCustomerInfo,
  isRevenueCatEnabled,
  purchasePackage,
  restorePurchases,
} from "./revenuecatClient";
import {
  getSubscriptionStatus,
  syncRevenueCat,
  checkSubscriptionAccess,
  updateTrialForDebug,
} from "./subscriptionApi";
import type { PurchasesPackage } from "react-native-purchases";
import type {
  GetSubscriptionStatusResponse,
  SyncRevenueCatResponse,
  CheckSubscriptionResponse,
} from "@/shared/contracts";

// Subscription status type
export type SubscriptionStatus = GetSubscriptionStatusResponse & {
  isRevenueCatEnabled: boolean;
};

// Context type
type SubscriptionContextType = {
  // Query states
  status: SubscriptionStatus | null;
  isLoading: boolean;
  error: Error | null;

  // Actions
  syncWithRevenueCat: () => Promise<void>;
  checkAccess: (action: string) => Promise<boolean>;
  purchase: (pkg: PurchasesPackage) => Promise<boolean>;
  restore: () => Promise<boolean>;

  // Debug actions
  updateTrialForDebug: (params: {
    trialEndDate?: string | null;
    hasActiveSubscription?: boolean;
    subscriptionTier?: string | null;
  }) => Promise<void>;
};

const SubscriptionContext = createContext<SubscriptionContextType | null>(null);

// Query keys
export const subscriptionKeys = {
  status: ["subscription", "status"] as const,
  events: ["subscription", "events"] as const,
};

/**
 * Subscription Provider
 * Wraps the app to provide subscription functionality
 */
export function SubscriptionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  // Fetch subscription status
  const {
    data: status,
    isLoading,
    error,
  } = useQuery({
    queryKey: subscriptionKeys.status,
    queryFn: async (): Promise<SubscriptionStatus> => {
      try {
        const data = await getSubscriptionStatus();

        return {
          ...data,
          isRevenueCatEnabled: isRevenueCatEnabled(),
        };
      } catch (error) {
        // Handle different error types
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Network errors - return cached/default status silently
        if (errorMessage?.includes('Network') || errorMessage?.includes('network') || errorMessage?.includes('Failed to fetch')) {
          console.log('[Subscription] Network error, using default status');
          return {
            hasAccess: false,
            hasActiveSubscription: false,
            isTrialActive: false,
            daysLeftInTrial: 0,
            subscriptionTier: null,
            trialStartDate: new Date().toISOString(),
            trialEndDate: new Date().toISOString(),
            subscriptionExpiry: null,
            isRevenueCatEnabled: isRevenueCatEnabled(),
          };
        }

        // If not authenticated, return default status
        console.log('[Subscription] Error fetching status (likely not authenticated):', error);
        return {
          hasAccess: false,
          hasActiveSubscription: false,
          isTrialActive: false,
          daysLeftInTrial: 0,
          subscriptionTier: null,
          trialStartDate: new Date().toISOString(),
          trialEndDate: new Date().toISOString(),
          subscriptionExpiry: null,
          isRevenueCatEnabled: isRevenueCatEnabled(),
        };
      }
    },
    staleTime: 1000 * 60, // 1 minute
    refetchOnWindowFocus: true,
    retry: (failureCount, error) => {
      // Don't retry on auth errors, but retry network errors up to 2 times
      const errorMessage = error instanceof Error ? error.message : String(error);
      if (errorMessage?.includes('Unauthorized') || errorMessage?.includes('Profile not found')) {
        return false;
      }
      return failureCount < 2;
    },
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
  });

  // Sync with RevenueCat mutation
  const { mutateAsync: syncMutateAsync } = useMutation({
    mutationFn: async (): Promise<SyncRevenueCatResponse> => {
      // Get customer info from RevenueCat
      const customerInfoResult = await getCustomerInfo();

      if (!customerInfoResult.ok) {
        throw new Error("Failed to get customer info from RevenueCat");
      }

      const customerInfo = customerInfoResult.data;
      const hasActiveEntitlement = Object.keys(customerInfo.entitlements.active || {}).length > 0;

      // Transform entitlements to match API contract
      const entitlements: Record<string, {
        identifier: string;
        isActive: boolean;
        productIdentifier?: string;
        expirationDate?: string;
      }> = {};

      Object.entries(customerInfo.entitlements.all || {}).forEach(([key, entitlement]) => {
        entitlements[key] = {
          identifier: entitlement.identifier,
          isActive: entitlement.isActive,
          productIdentifier: entitlement.productIdentifier,
          expirationDate: entitlement.expirationDate ?? undefined,
        };
      });

      return syncRevenueCat({
        hasActiveEntitlement,
        entitlements,
        revenueCatUserId: customerInfo.originalAppUserId,
      });
    },
    onSuccess: () => {
      // Refetch status after sync
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status });
    },
  });

  // Check access mutation
  const { mutateAsync: checkAccessMutateAsync } = useMutation({
    mutationFn: async (action: string): Promise<CheckSubscriptionResponse> => {
      return checkSubscriptionAccess(action);
    },
  });

  // Purchase mutation
  const { mutateAsync: purchaseMutateAsync } = useMutation({
    mutationFn: async (pkg: PurchasesPackage): Promise<boolean> => {
      const result = await purchasePackage(pkg);

      if (!result.ok) {
        throw new Error("Purchase failed");
      }

      // Sync with backend after purchase
      await syncMutateAsync();

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status });
    },
  });

  // Restore mutation
  const { mutateAsync: restoreMutateAsync } = useMutation({
    mutationFn: async (): Promise<boolean> => {
      const result = await restorePurchases();

      if (!result.ok) {
        throw new Error("Restore failed");
      }

      // Sync with backend after restore
      await syncMutateAsync();

      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status });
    },
  });

  // Debug: Update trial mutation
  const { mutateAsync: updateTrialMutateAsync } = useMutation({
    mutationFn: async (params: {
      trialEndDate?: string | null;
      hasActiveSubscription?: boolean;
      subscriptionTier?: string | null;
    }) => {
      return updateTrialForDebug(params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: subscriptionKeys.status });
    },
  });

  // Memoized actions
  const syncWithRevenueCat = useCallback(async () => {
    await syncMutateAsync();
  }, [syncMutateAsync]);

  const checkAccess = useCallback(async (action: string): Promise<boolean> => {
    const result = await checkAccessMutateAsync(action);
    return result.hasAccess;
  }, [checkAccessMutateAsync]);

  const purchase = useCallback(async (pkg: PurchasesPackage): Promise<boolean> => {
    return await purchaseMutateAsync(pkg);
  }, [purchaseMutateAsync]);

  const restore = useCallback(async (): Promise<boolean> => {
    return await restoreMutateAsync();
  }, [restoreMutateAsync]);

  const updateTrialForDebugCallback = useCallback(async (params: {
    trialEndDate?: string | null;
    hasActiveSubscription?: boolean;
    subscriptionTier?: string | null;
  }) => {
    await updateTrialMutateAsync(params);
  }, [updateTrialMutateAsync]);

  // Listen to RevenueCat customer info updates
  useEffect(() => {
    if (!isRevenueCatEnabled()) {
      console.log('[Subscription] RevenueCat not enabled, skipping listener');
      return;
    }

    console.log('[Subscription] Setting up RevenueCat customer info listener');

    // Add listener for customer info updates
    Purchases.addCustomerInfoUpdateListener(async (customerInfo) => {
      console.log('[Subscription] Customer info updated, syncing...', {
        hasActiveEntitlement: Object.keys(customerInfo.entitlements.active || {}).length > 0,
      });

      // Sync with backend when customer info changes
      try {
        await syncMutateAsync();
        console.log('[Subscription] Sync completed after customer info update');
      } catch (error) {
        console.log('[Subscription] Failed to sync after customer info update:', error);
      }
    });

    // Note: RevenueCat SDK doesn't provide a way to remove this listener
    // It persists for the lifetime of the app, which is actually what we want
    return () => {
      console.log('[Subscription] Component unmounting (listener persists)');
    };
  }, [syncMutateAsync]);

  // Periodic subscription status check (every 30 seconds)
  useEffect(() => {
    const interval = setInterval(async () => {
      console.log('[Subscription] Periodic status check...');
      try {
        await queryClient.invalidateQueries({ queryKey: subscriptionKeys.status });
      } catch (error) {
        // Silently handle network errors during periodic checks
        const errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage?.includes('Network') || errorMessage?.includes('network')) {
          console.log('[Subscription] Network unavailable, will retry later');
        } else {
          console.log('[Subscription] Periodic check failed:', errorMessage);
        }
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [queryClient]);

  // Memoized context value
  const value = useMemo<SubscriptionContextType>(
    () => ({
      status: status || null,
      isLoading,
      error: error as Error | null,
      syncWithRevenueCat,
      checkAccess,
      purchase,
      restore,
      updateTrialForDebug: updateTrialForDebugCallback,
    }),
    [status, isLoading, error, syncWithRevenueCat, checkAccess, purchase, restore, updateTrialForDebugCallback]
  );

  return (
    <SubscriptionContext.Provider value={value}>
      {children}
    </SubscriptionContext.Provider>
  );
}

/**
 * Hook to access subscription context
 */
export function useSubscription() {
  const context = useContext(SubscriptionContext);

  if (!context) {
    throw new Error("useSubscription must be used within SubscriptionProvider");
  }

  return context;
}

/**
 * Hook to check if user has access (memoized)
 * Safe to use anywhere, returns false if not authenticated
 */
export function useHasAccess(): boolean {
  const context = useContext(SubscriptionContext);
  return useMemo(() => context?.status?.hasAccess ?? false, [context?.status?.hasAccess]);
}

/**
 * Hook to check if trial is active (memoized)
 * Safe to use anywhere, returns false if not authenticated
 */
export function useIsTrialActive(): boolean {
  const context = useContext(SubscriptionContext);
  return useMemo(() => context?.status?.isTrialActive ?? false, [context?.status?.isTrialActive]);
}

/**
 * Hook to check if user has active subscription (memoized)
 * Safe to use anywhere, returns false if not authenticated
 */
export function useHasActiveSubscription(): boolean {
  const context = useContext(SubscriptionContext);
  return useMemo(() => context?.status?.hasActiveSubscription ?? false, [context?.status?.hasActiveSubscription]);
}

/**
 * Hook to get days left in trial (memoized)
 * Safe to use anywhere, returns 0 if not authenticated
 */
export function useDaysLeftInTrial(): number {
  const context = useContext(SubscriptionContext);
  return useMemo(() => context?.status?.daysLeftInTrial ?? 0, [context?.status?.daysLeftInTrial]);
}
