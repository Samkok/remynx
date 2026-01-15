/**
 * Debug Subscription Tools
 * Testing and debugging tools for subscription states
 */

import { View, Text, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { ArrowLeft, Calendar, Check, X, RefreshCw, Zap } from "lucide-react-native";
import { useSubscription, useDaysLeftInTrial, useHasAccess } from "@/lib/subscription-context";
import { useState } from "react";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

export default function DebugSubscriptionScreen() {
  const router = useRouter();
  const { status, syncWithRevenueCat, updateTrialForDebug, isLoading } = useSubscription();
  const daysLeft = useDaysLeftInTrial();
  const hasAccess = useHasAccess();
  const [isSyncing, setIsSyncing] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleSync = async () => {
    try {
      setIsSyncing(true);
      await syncWithRevenueCat();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Sync error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleExpireTrial = async () => {
    try {
      setIsUpdating(true);
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await updateTrialForDebug({
        trialEndDate: yesterday.toISOString(),
        hasActiveSubscription: false,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Update error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleActivateSubscription = async (tier: "monthly" | "annual") => {
    try {
      setIsUpdating(true);
      await updateTrialForDebug({
        hasActiveSubscription: true,
        subscriptionTier: tier,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Update error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleResetTrial = async () => {
    try {
      setIsUpdating(true);
      await updateTrialForDebug({
        trialEndDate: null,
        hasActiveSubscription: false,
        subscriptionTier: null,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error("Update error:", error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsUpdating(false);
    }
  };

  if (isLoading && !status) {
    return (
      <View className="flex-1 bg-[#0D0D0D] items-center justify-center">
        <ActivityIndicator size="large" color="#F59E0B" />
        <Text className="text-gray-400 mt-4">Loading subscription status...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView className="flex-1 bg-[#0D0D0D]" edges={["top"]}>
      {/* Header */}
      <View className="px-6 py-4 flex-row items-center">
        <Pressable onPress={() => router.back()} className="mr-4 active:opacity-70">
          <ArrowLeft size={24} color="#fff" />
        </Pressable>
        <Text className="text-white text-xl font-bold flex-1">Debug Subscription</Text>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Current Status Card */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Current Status</Text>
          <View className="bg-[#1A1A1A] rounded-2xl p-5 border border-gray-800">
            {/* Access Status */}
            <View className="flex-row items-center mb-4">
              <View
                className={`w-10 h-10 rounded-full items-center justify-center mr-3 ${
                  hasAccess ? "bg-green-500/20" : "bg-red-500/20"
                }`}
              >
                {hasAccess ? <Check size={20} color="#22C55E" /> : <X size={20} color="#EF4444" />}
              </View>
              <View className="flex-1">
                <Text className="text-white font-semibold">
                  {hasAccess ? "Has Access" : "No Access"}
                </Text>
                <Text className="text-gray-400 text-sm">
                  {hasAccess
                    ? "User can create works and achievements"
                    : "User must subscribe to continue"}
                </Text>
              </View>
            </View>

            {/* Trial Status */}
            {status?.isTrialActive && (
              <View className="flex-row items-center mb-4">
                <View className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center mr-3">
                  <Calendar size={20} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Trial Active</Text>
                  <Text className="text-gray-400 text-sm">
                    {daysLeft} {daysLeft === 1 ? "day" : "days"} remaining
                  </Text>
                </View>
              </View>
            )}

            {/* Subscription Status */}
            {status?.hasActiveSubscription && (
              <View className="flex-row items-center">
                <View className="w-10 h-10 rounded-full bg-purple-500/20 items-center justify-center mr-3">
                  <Zap size={20} color="#A855F7" />
                </View>
                <View className="flex-1">
                  <Text className="text-white font-semibold">Premium Subscriber</Text>
                  <Text className="text-gray-400 text-sm capitalize">
                    {status.subscriptionTier || "Unknown"} plan
                  </Text>
                </View>
              </View>
            )}

            {/* Details */}
            <View className="mt-4 pt-4 border-t border-gray-700">
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">Trial Start</Text>
                <Text className="text-white">
                  {status?.trialStartDate
                    ? new Date(status.trialStartDate).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
              <View className="flex-row justify-between mb-2">
                <Text className="text-gray-400">Trial End</Text>
                <Text className="text-white">
                  {status?.trialEndDate
                    ? new Date(status.trialEndDate).toLocaleDateString()
                    : "N/A"}
                </Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-400">RevenueCat</Text>
                <Text className="text-white">
                  {status?.isRevenueCatEnabled ? "Enabled" : "Disabled"}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Debug Actions */}
        <View className="mx-6 mb-6">
          <Text className="text-white text-lg font-bold mb-4">Quick Actions</Text>

          {/* Sync with RevenueCat */}
          <Pressable
            onPress={handleSync}
            disabled={isSyncing || isUpdating}
            className="mb-3 active:opacity-70"
          >
            <LinearGradient
              colors={["#3B82F6", "#2563EB"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                padding: 16,
                flexDirection: "row",
                alignItems: "center",
                opacity: isSyncing || isUpdating ? 0.5 : 1,
              }}
            >
              {isSyncing ? (
                <ActivityIndicator size="small" color="#fff" style={{ marginRight: 12 }} />
              ) : (
                <RefreshCw size={20} color="#fff" style={{ marginRight: 12 }} />
              )}
              <View className="flex-1">
                <Text className="text-white font-semibold">Sync with RevenueCat</Text>
                <Text className="text-blue-100 text-xs">Fetch latest subscription status</Text>
              </View>
            </LinearGradient>
          </Pressable>

          {/* Expire Trial */}
          <Pressable
            onPress={handleExpireTrial}
            disabled={isSyncing || isUpdating}
            className="mb-3 active:opacity-70"
          >
            <View
              className="bg-red-500/20 border border-red-500/30 rounded-2xl p-4 flex-row items-center"
              style={{ opacity: isSyncing || isUpdating ? 0.5 : 1 }}
            >
              <X size={20} color="#EF4444" style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-red-400 font-semibold">Expire Trial</Text>
                <Text className="text-red-300/70 text-xs">Test blocked state immediately</Text>
              </View>
            </View>
          </Pressable>

          {/* Activate Subscriptions */}
          <View className="flex-row mb-3">
            <Pressable
              onPress={() => handleActivateSubscription("monthly")}
              disabled={isSyncing || isUpdating}
              className="flex-1 mr-2 active:opacity-70"
            >
              <View
                className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4 items-center"
                style={{ opacity: isSyncing || isUpdating ? 0.5 : 1 }}
              >
                <Check size={20} color="#22C55E" style={{ marginBottom: 4 }} />
                <Text className="text-green-400 font-semibold text-sm">Monthly</Text>
              </View>
            </Pressable>

            <Pressable
              onPress={() => handleActivateSubscription("annual")}
              disabled={isSyncing || isUpdating}
              className="flex-1 ml-2 active:opacity-70"
            >
              <View
                className="bg-purple-500/20 border border-purple-500/30 rounded-2xl p-4 items-center"
                style={{ opacity: isSyncing || isUpdating ? 0.5 : 1 }}
              >
                <Zap size={20} color="#A855F7" style={{ marginBottom: 4 }} />
                <Text className="text-purple-400 font-semibold text-sm">Annual</Text>
              </View>
            </Pressable>
          </View>

          {/* Reset Trial */}
          <Pressable
            onPress={handleResetTrial}
            disabled={isSyncing || isUpdating}
            className="active:opacity-70"
          >
            <View
              className="bg-amber-500/20 border border-amber-500/30 rounded-2xl p-4 flex-row items-center"
              style={{ opacity: isSyncing || isUpdating ? 0.5 : 1 }}
            >
              <RefreshCw size={20} color="#F59E0B" style={{ marginRight: 12 }} />
              <View className="flex-1">
                <Text className="text-amber-400 font-semibold">Reset Trial</Text>
                <Text className="text-amber-300/70 text-xs">Start fresh 2-week trial</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Warning */}
        <View className="mx-6 mb-8 bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
          <Text className="text-amber-400 font-semibold mb-2">⚠️ Development Only</Text>
          <Text className="text-amber-300/70 text-sm">
            These debug tools only work in development and should not be available in production.
            Changes made here affect the database directly.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
