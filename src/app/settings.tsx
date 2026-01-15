import React, { useCallback } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  Crown,
  ChevronRight,
  Sparkles,
  Calendar,
  CreditCard,
  ShoppingBag,
  X,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useQuery } from '@tanstack/react-query';
import type { GetCurrentSubscriptionResponse } from '@/shared/contracts';
import { isRevenueCatEnabled } from '@/lib/revenuecatClient';
import Purchases from 'react-native-purchases';
import { supabase, type UserSubscriptionRow } from '@/lib/supabaseClient';

// Helper to calculate trial end date (14 days from start)
function calculateTrialEndDate(startDate: Date): Date {
  const endDate = new Date(startDate);
  endDate.setDate(endDate.getDate() + 14);
  return endDate;
}

// Helper to check if trial is active
function isTrialActive(trialStartDate: string, trialEndDate: string | null): boolean {
  const now = new Date();
  const start = new Date(trialStartDate);
  const effectiveEnd = trialEndDate ? new Date(trialEndDate) : calculateTrialEndDate(start);
  return now < effectiveEnd;
}

// Helper to fetch subscription data from Supabase
async function fetchCurrentSubscription(): Promise<GetCurrentSubscriptionResponse> {
  try {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return {
        subscription: null,
        hasActiveSubscription: false,
        isTrialActive: false,
        hasAccess: false,
      };
    }

    // Get profile for trial info
    const { data: profile } = await supabase
      .from('profile')
      .select('trial_start_date, trial_end_date')
      .eq('user_id', user.id)
      .single();

    if (!profile) {
      return {
        subscription: null,
        hasActiveSubscription: false,
        isTrialActive: false,
        hasAccess: false,
      };
    }

    // Get active subscription from user_subscriptions table
    const { data: subscriptions } = await supabase
      .from('user_subscriptions')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .or('expires_at.is.null,expires_at.gt.' + new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1);

    const subscription = subscriptions?.[0] as UserSubscriptionRow | undefined;
    const trialActive = isTrialActive(profile.trial_start_date, profile.trial_end_date);
    const hasActiveSub = !!subscription;

    return {
      subscription: subscription ? {
        id: subscription.id,
        userId: subscription.user_id,
        status: subscription.status as any,
        entitlement: subscription.entitlement,
        revenuecatAppUserId: subscription.revenuecat_app_user_id,
        productIdentifier: subscription.product_identifier,
        store: subscription.store,
        expiresAt: subscription.expires_at,
        periodType: subscription.period_type,
        purchaseDate: subscription.purchase_date,
        willRenew: subscription.will_renew,
        billingIssuesDetectedAt: subscription.billing_issues_detected_at,
        unsubscribeDetectedAt: subscription.unsubscribe_detected_at,
        createdAt: subscription.created_at,
        updatedAt: subscription.updated_at,
        lastWebhookReceivedAt: subscription.last_webhook_received_at,
      } : null,
      hasActiveSubscription: hasActiveSub,
      isTrialActive: trialActive,
      hasAccess: trialActive || hasActiveSub,
    };
  } catch (error) {
    console.error('[Settings] Error fetching subscription:', error);
    return {
      subscription: null,
      hasActiveSubscription: false,
      isTrialActive: false,
      hasAccess: false,
    };
  }
}

export default function SettingsScreen() {
  // Fetch current subscription status
  const { data: subscriptionData, isLoading } = useQuery<GetCurrentSubscriptionResponse>({
    queryKey: ['subscription', 'current'],
    queryFn: fetchCurrentSubscription,
    refetchInterval: 60000, // Refetch every minute
    retry: 1, // Only retry once on failure
  });

  const hasActiveSubscription = subscriptionData?.hasActiveSubscription ?? false;
  const isTrialActive = subscriptionData?.isTrialActive ?? false;
  const subscription = subscriptionData?.subscription;

  const handleManageSubscription = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (!isRevenueCatEnabled()) {
      Alert.alert(
        'Subscriptions Not Available',
        'Subscription management is not available on this platform. Please use the mobile app.',
        [{ text: 'OK' }]
      );
      return;
    }

    try {
      // Open native subscription management
      await Purchases.showManageSubscriptions();
    } catch (error) {
      console.error('Failed to show manage subscriptions:', error);
      Alert.alert(
        'Error',
        'Unable to open subscription management. Please try again later.',
        [{ text: 'OK' }]
      );
    }
  }, []);

  const handleUpgradeToPro = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    // TODO: Navigate to paywall screen
    Alert.alert('Coming Soon', 'Paywall screen will be implemented here', [{ text: 'OK' }]);
  }, []);

  const handleDismissBanner = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    // TODO: Add logic to dismiss banner for a period
  }, []);

  const handleGoBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, []);

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'active':
        return '#10B981';
      case 'expired':
        return '#EF4444';
      case 'grace_period':
        return '#F59E0B';
      case 'billing_retry':
        return '#F59E0B';
      case 'cancelled':
        return '#6B7280';
      default:
        return '#6B7280';
    }
  };

  const getStatusText = (status?: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'expired':
        return 'Expired';
      case 'grace_period':
        return 'Grace Period';
      case 'billing_retry':
        return 'Billing Retry';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      <Stack.Screen
        options={{
          headerShown: false,
        }}
      />
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-6 flex-row items-center">
            <Pressable
              onPress={handleGoBack}
              className="w-10 h-10 rounded-full bg-[#1A1A1A] items-center justify-center mr-3 active:bg-gray-800"
            >
              <ChevronRight size={20} color="#FFF" style={{ transform: [{ rotate: '180deg' }] }} />
            </Pressable>
            <Text className="text-3xl font-bold text-white">Subscription</Text>
          </View>

          {/* Upgrade CTA Banner - Only show if not subscribed */}
          {!hasActiveSubscription && !isLoading && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View className="mx-5 mb-6">
                <LinearGradient
                  colors={['#7C3AED', '#EC4899', '#F59E0B']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    borderRadius: 24,
                    padding: 1,
                  }}
                >
                  <View className="bg-[#0D0D0D] rounded-[23px] overflow-hidden">
                    <LinearGradient
                      colors={['rgba(124, 58, 237, 0.1)', 'rgba(236, 72, 153, 0.05)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={{ padding: 16 }}
                    >
                      <View className="flex-row items-start">
                        <View className="flex-1 mr-3">
                          <View className="flex-row items-center mb-2">
                            <Crown size={20} color="#F59E0B" />
                            <Text className="text-white text-lg font-bold ml-2">
                              Upgrade to Pro
                            </Text>
                          </View>
                          <Text className="text-gray-300 text-sm leading-5">
                            Unlock unlimited works, achievements, and premium features
                          </Text>
                          <Pressable
                            onPress={handleUpgradeToPro}
                            className="mt-4 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl py-3 px-5 self-start active:opacity-80"
                          >
                            <LinearGradient
                              colors={['#7C3AED', '#EC4899']}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={{
                                borderRadius: 12,
                                paddingVertical: 12,
                                paddingHorizontal: 20,
                              }}
                            >
                              <View className="flex-row items-center">
                                <Sparkles size={16} color="#FFF" />
                                <Text className="text-white font-semibold ml-2">
                                  See Plans
                                </Text>
                              </View>
                            </LinearGradient>
                          </Pressable>
                        </View>
                        <Pressable
                          onPress={handleDismissBanner}
                          className="w-8 h-8 rounded-full bg-white/10 items-center justify-center active:bg-white/20"
                        >
                          <X size={16} color="#FFF" />
                        </Pressable>
                      </View>
                    </LinearGradient>
                  </View>
                </LinearGradient>
              </View>
            </Animated.View>
          )}

          {/* Current Subscription Status */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <View className="mx-5 mb-4">
              <Text className="text-lg font-semibold text-white mb-4 px-1">
                Current Plan
              </Text>
              <View className="bg-[#1A1A1A] rounded-3xl border border-gray-800 overflow-hidden">
                {isLoading ? (
                  <View className="p-6">
                    <Text className="text-gray-400 text-center">Loading...</Text>
                  </View>
                ) : hasActiveSubscription && subscription ? (
                  <View className="p-6">
                    {/* Subscription Header */}
                    <View className="flex-row items-center justify-between mb-4">
                      <View className="flex-row items-center">
                        <View className="w-12 h-12 rounded-2xl bg-purple-500/20 items-center justify-center mr-3">
                          <Crown size={24} color="#A855F7" />
                        </View>
                        <View>
                          <Text className="text-white text-xl font-bold">Pro Plan</Text>
                          <View className="flex-row items-center mt-1">
                            <View
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: getStatusColor(subscription.status) }}
                            />
                            <Text
                              className="text-sm font-medium"
                              style={{ color: getStatusColor(subscription.status) }}
                            >
                              {getStatusText(subscription.status)}
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* Subscription Details */}
                    <View className="space-y-3">
                      {/* Product */}
                      {subscription.productIdentifier && (
                        <View className="flex-row items-center bg-[#0D0D0D] rounded-2xl p-4">
                          <ShoppingBag size={18} color="#666" />
                          <Text className="text-gray-400 ml-3 flex-1">Product</Text>
                          <Text className="text-white font-medium text-sm">
                            {subscription.productIdentifier}
                          </Text>
                        </View>
                      )}

                      {/* Store */}
                      {subscription.store && (
                        <View className="flex-row items-center bg-[#0D0D0D] rounded-2xl p-4">
                          <CreditCard size={18} color="#666" />
                          <Text className="text-gray-400 ml-3 flex-1">Store</Text>
                          <Text className="text-white font-medium capitalize">
                            {subscription.store.replace('_', ' ')}
                          </Text>
                        </View>
                      )}

                      {/* Expiration */}
                      {subscription.expiresAt && (
                        <View className="flex-row items-center bg-[#0D0D0D] rounded-2xl p-4">
                          <Calendar size={18} color="#666" />
                          <Text className="text-gray-400 ml-3 flex-1">
                            {subscription.willRenew ? 'Renews On' : 'Expires On'}
                          </Text>
                          <Text className="text-white font-medium">
                            {formatDate(subscription.expiresAt)}
                          </Text>
                        </View>
                      )}

                      {/* Purchase Date */}
                      {subscription.purchaseDate && (
                        <View className="flex-row items-center bg-[#0D0D0D] rounded-2xl p-4">
                          <Calendar size={18} color="#666" />
                          <Text className="text-gray-400 ml-3 flex-1">Purchased On</Text>
                          <Text className="text-white font-medium">
                            {formatDate(subscription.purchaseDate)}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Manage Subscription Button */}
                    <Pressable
                      onPress={handleManageSubscription}
                      className="mt-6 bg-purple-500/20 rounded-2xl py-4 active:bg-purple-500/30"
                    >
                      <Text className="text-purple-400 text-center font-semibold">
                        Manage Subscription
                      </Text>
                    </Pressable>
                  </View>
                ) : isTrialActive ? (
                  <View className="p-6">
                    <View className="flex-row items-center mb-4">
                      <View className="w-12 h-12 rounded-2xl bg-amber-500/20 items-center justify-center mr-3">
                        <Sparkles size={24} color="#F59E0B" />
                      </View>
                      <View>
                        <Text className="text-white text-xl font-bold">Free Trial</Text>
                        <Text className="text-amber-500 text-sm mt-1">Active</Text>
                      </View>
                    </View>
                    <Text className="text-gray-400 text-sm mb-4">
                      You're currently enjoying your free trial. Upgrade to Pro to continue accessing all features after your trial ends.
                    </Text>
                    <Pressable
                      onPress={handleUpgradeToPro}
                      className="bg-amber-500/20 rounded-2xl py-4 active:bg-amber-500/30"
                    >
                      <Text className="text-amber-400 text-center font-semibold">
                        View Pro Plans
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="p-6">
                    <View className="flex-row items-center mb-4">
                      <View className="w-12 h-12 rounded-2xl bg-gray-700/30 items-center justify-center mr-3">
                        <Crown size={24} color="#6B7280" />
                      </View>
                      <View>
                        <Text className="text-white text-xl font-bold">Free Plan</Text>
                        <Text className="text-gray-500 text-sm mt-1">Limited Access</Text>
                      </View>
                    </View>
                    <Text className="text-gray-400 text-sm mb-4">
                      You're currently on the free plan. Upgrade to Pro to unlock unlimited works, achievements, and premium features.
                    </Text>
                    <Pressable
                      onPress={handleUpgradeToPro}
                      className="bg-purple-500/20 rounded-2xl py-4 active:bg-purple-500/30"
                    >
                      <Text className="text-purple-400 text-center font-semibold">
                        Upgrade to Pro
                      </Text>
                    </Pressable>
                  </View>
                )}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
