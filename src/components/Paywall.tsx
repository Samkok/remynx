/**
 * Paywall Component
 * Beautiful subscription screen with monthly and annual options
 */

import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { X, Check, Sparkles } from "lucide-react-native";
import { useState, useMemo } from "react";
import { useSubscription } from "@/lib/subscription-context";
import { getOfferings } from "@/lib/revenuecatClient";
import { useQuery } from "@tanstack/react-query";
import type { PurchasesPackage } from "react-native-purchases";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";

type PaywallProps = {
  onClose: () => void;
  onPurchaseComplete?: () => void;
};

export function Paywall({ onClose, onPurchaseComplete }: PaywallProps) {
  const { purchase, restore, status } = useSubscription();
  const [selectedPackage, setSelectedPackage] = useState<PurchasesPackage | null>(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  // Fetch offerings from RevenueCat
  const { data: offeringsResult, isLoading } = useQuery({
    queryKey: ["revenuecat-offerings"],
    queryFn: getOfferings,
  });

  const packages = useMemo(() => {
    if (!offeringsResult?.ok || !offeringsResult.data.current) return [];
    return offeringsResult.data.current.availablePackages;
  }, [offeringsResult]);

  const monthlyPackage = useMemo(
    () => packages.find((p) => p.identifier === "$rc_monthly"),
    [packages]
  );

  const annualPackage = useMemo(
    () => packages.find((p) => p.identifier === "$rc_annual"),
    [packages]
  );

  // Calculate savings
  const monthlySavings = useMemo(() => {
    if (!monthlyPackage || !annualPackage) return null;
    const monthlyPrice = monthlyPackage.product.price;
    const annualPrice = annualPackage.product.price;
    const monthlyCost = monthlyPrice * 12;
    const savings = monthlyCost - annualPrice;
    const savingsPercent = Math.round((savings / monthlyCost) * 100);
    return { amount: savings, percent: savingsPercent };
  }, [monthlyPackage, annualPackage]);

  const handlePurchase = async (pkg: PurchasesPackage) => {
    try {
      setIsPurchasing(true);
      const success = await purchase(pkg);
      if (success) {
        onPurchaseComplete?.();
        onClose();
      }
    } catch (error: unknown) {
      // Log the error (use console.log instead of console.error to avoid error overlay)
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("Purchase error:", errorMessage);

      // Check if it's a Test Store simulation
      if (errorMessage?.includes("Test Store") || errorMessage?.includes("simulated")) {
        alert("Test Store: Purchase simulation failed. This is expected behavior for testing. In production, real purchases will work.");
      } else {
        alert("Purchase failed. Please try again.");
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleRestore = async () => {
    try {
      setIsRestoring(true);
      const success = await restore();
      if (success) {
        onPurchaseComplete?.();
        onClose();
      } else {
        alert("No previous purchases found.");
      }
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.log("Restore error:", errorMessage);
      alert("Restore failed. Please try again.");
    } finally {
      setIsRestoring(false);
    }
  };

  const daysLeft = status?.daysLeftInTrial ?? 0;

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      {/* Header with close button */}
      <View className="px-6 pt-14 pb-4 flex-row justify-between items-center">
        <View className="w-10" />
        <Text className="text-white text-lg font-semibold">Upgrade to Premium</Text>
        <Pressable
          onPress={onClose}
          className="w-10 h-10 items-center justify-center active:opacity-70"
        >
          <X size={24} color="#fff" />
        </Pressable>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Trial info banner */}
        {status?.isTrialActive && daysLeft > 0 && (
          <Animated.View entering={FadeIn.duration(300)}>
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ marginHorizontal: 24, marginBottom: 24, borderRadius: 16, padding: 16 }}
            >
              <View className="flex-row items-center">
                <Sparkles size={20} color="#fff" style={{ marginRight: 8 }} />
                <Text className="text-white font-semibold flex-1">
                  {daysLeft} {daysLeft === 1 ? "day" : "days"} left in your free trial
                </Text>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Features list */}
        <View className="px-6 mb-8">
          <Text className="text-white text-2xl font-bold mb-6">Premium Features</Text>

          {[
            "Unlimited works and achievements",
            "Advanced streak tracking",
            "Priority support",
            "Sync across all devices",
            "Ad-free experience",
            "Early access to new features",
          ].map((feature, index) => (
            <Animated.View
              key={feature}
              entering={FadeInDown.delay(index * 50).springify()}
              className="flex-row items-center mb-4"
            >
              <View className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center mr-3">
                <Check size={18} color="#F59E0B" strokeWidth={3} />
              </View>
              <Text className="text-gray-200 text-base flex-1">{feature}</Text>
            </Animated.View>
          ))}
        </View>

        {/* Pricing options */}
        {isLoading ? (
          <View className="items-center py-12">
            <ActivityIndicator size="large" color="#F59E0B" />
            <Text className="text-gray-400 mt-4">Loading plans...</Text>
          </View>
        ) : (
          <View className="px-6 mb-8">
            <Text className="text-white text-xl font-bold mb-4">Choose Your Plan</Text>

            {/* Annual package */}
            {annualPackage && (
              <Pressable
                onPress={() => setSelectedPackage(annualPackage)}
                className={`mb-4 rounded-2xl border-2 overflow-hidden ${
                  selectedPackage?.identifier === annualPackage.identifier
                    ? "border-amber-500"
                    : "border-gray-700"
                }`}
              >
                {monthlySavings && (
                  <View className="bg-amber-500 px-3 py-1">
                    <Text className="text-white text-xs font-bold text-center">
                      SAVE {monthlySavings.percent}% • Best Value
                    </Text>
                  </View>
                )}
                <View className="bg-[#1A1A1A] p-5">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white text-xl font-bold">Annual</Text>
                    <Text className="text-white text-2xl font-bold">
                      {annualPackage.product.priceString}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-sm">
                    {annualPackage.product.priceString}/year • Just{" "}
                    {((annualPackage.product.price / 12).toFixed(2))} per month
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Monthly package */}
            {monthlyPackage && (
              <Pressable
                onPress={() => setSelectedPackage(monthlyPackage)}
                className={`mb-4 rounded-2xl border-2 overflow-hidden ${
                  selectedPackage?.identifier === monthlyPackage.identifier
                    ? "border-amber-500"
                    : "border-gray-700"
                }`}
              >
                <View className="bg-[#1A1A1A] p-5">
                  <View className="flex-row justify-between items-center mb-2">
                    <Text className="text-white text-xl font-bold">Monthly</Text>
                    <Text className="text-white text-2xl font-bold">
                      {monthlyPackage.product.priceString}
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-sm">
                    {monthlyPackage.product.priceString}/month • Cancel anytime
                  </Text>
                </View>
              </Pressable>
            )}

            {/* Purchase button */}
            <Pressable
              onPress={() => selectedPackage && handlePurchase(selectedPackage)}
              disabled={!selectedPackage || isPurchasing}
              className={`rounded-2xl overflow-hidden ${
                !selectedPackage || isPurchasing ? "opacity-50" : ""
              }`}
            >
              <LinearGradient
                colors={["#F59E0B", "#D97706"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{ padding: 18 }}
              >
                {isPurchasing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text className="text-white text-lg font-bold text-center">
                    {selectedPackage ? "Subscribe Now" : "Select a Plan"}
                  </Text>
                )}
              </LinearGradient>
            </Pressable>

            {/* Restore purchases button */}
            <Pressable
              onPress={handleRestore}
              disabled={isRestoring}
              className="mt-4 py-3 active:opacity-70"
            >
              {isRestoring ? (
                <ActivityIndicator size="small" color="#F59E0B" />
              ) : (
                <Text className="text-amber-500 text-center font-semibold">
                  Restore Purchases
                </Text>
              )}
            </Pressable>

            {/* Terms */}
            <Text className="text-gray-500 text-xs text-center mt-6 leading-5">
              Subscriptions automatically renew unless auto-renew is turned off at least 24 hours
              before the end of the current period. Payment will be charged to your account at
              confirmation of purchase.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
