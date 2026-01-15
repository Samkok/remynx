/**
 * Subscription Guard Hook
 * Provides gating for premium features with automatic paywall display
 */

import { useCallback, useState } from "react";
import { useHasAccess, useSubscription } from "./subscription-context";
import { Modal } from "react-native";
import { Paywall } from "@/components/Paywall";

type SubscriptionGuardAction = "create_work" | "create_achievement" | "premium_feature";

export function useSubscriptionGuard() {
  const hasAccess = useHasAccess();
  const { checkAccess } = useSubscription();
  const [showPaywall, setShowPaywall] = useState(false);

  /**
   * Check if user has access to perform an action
   * If not, shows the paywall
   */
  const guard = useCallback(
    async (action: SubscriptionGuardAction = "premium_feature"): Promise<boolean> => {
      // Check local state first (fast)
      if (hasAccess) {
        return true;
      }

      // Double-check with server (in case status changed)
      const serverHasAccess = await checkAccess(action);

      if (!serverHasAccess) {
        setShowPaywall(true);
        return false;
      }

      return true;
    },
    [hasAccess, checkAccess]
  );

  /**
   * Wrapper component that conditionally renders children based on access
   */
  const PaywallModal = useCallback(
    () => (
      <Modal visible={showPaywall} animationType="slide" presentationStyle="pageSheet">
        <Paywall
          onClose={() => setShowPaywall(false)}
          onPurchaseComplete={() => setShowPaywall(false)}
        />
      </Modal>
    ),
    [showPaywall]
  );

  return {
    hasAccess,
    guard,
    showPaywall,
    setShowPaywall,
    PaywallModal,
  };
}
