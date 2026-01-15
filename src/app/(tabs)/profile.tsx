import React, { useCallback, useMemo } from 'react';
import { View, Text, Pressable, ScrollView, Alert, Switch, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import Animated, { FadeInDown } from 'react-native-reanimated';
import {
  User,
  FileText,
  LogOut,
  ChevronRight,
  Calendar,
  Flame,
  Trophy,
  Pencil,
  Bell,
  Smartphone,
  Wrench,
  Crown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useLifeStore, getAge } from '@/lib/state/life-store';
import { useStreakStore } from '@/lib/state/streak-store';
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';
import { authClient } from '@/lib/authClient';

export default function ProfileScreen() {
  const profile = useLifeStore((s) => s.profile);
  const reset = useLifeStore((s) => s.reset);
  const currentStreak = useStreakStore((s) => s.currentStreak);
  const longestStreak = useStreakStore((s) => s.longestStreak);

  // Session Indicator settings
  const iosLiveActivityEnabled = useSessionIndicatorStore(
    (s) => s.settings.iosLiveActivityEnabled
  );
  const androidForegroundServiceEnabled = useSessionIndicatorStore(
    (s) => s.settings.androidForegroundServiceEnabled
  );
  const setIOSLiveActivityEnabled = useSessionIndicatorStore(
    (s) => s.setIOSLiveActivityEnabled
  );
  const setAndroidForegroundServiceEnabled = useSessionIndicatorStore(
    (s) => s.setAndroidForegroundServiceEnabled
  );

  const age = useMemo(() => {
    if (!profile?.birthday) return 0;
    return getAge(profile.birthday);
  }, [profile?.birthday]);

  const formattedBirthday = useMemo(() => {
    if (!profile?.birthday) return '';
    const date = new Date(profile.birthday);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }, [profile?.birthday]);

  const handleSignOut = useCallback(async () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            try {
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              await authClient.signOut();
              // Reset state and navigate - use setTimeout to ensure state updates first
              reset();
              // Small delay to allow state to update before navigation
              setTimeout(() => {
                router.replace('/auth');
              }, 50);
            } catch (error) {
              console.error('Sign out error:', error);
            }
          },
        },
      ]
    );
  }, [reset]);

  const handleOpenTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/terms');
  }, []);

  const handleEditProfile = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/edit-profile');
  }, []);

  const handleDebugSubscription = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/debug-subscription');
  }, []);

  const handleToggleLiveActivity = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setIOSLiveActivityEnabled(value);
    },
    [setIOSLiveActivityEnabled]
  );

  const handleToggleForegroundService = useCallback(
    (value: boolean) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setAndroidForegroundServiceEnabled(value);
    },
    [setAndroidForegroundServiceEnabled]
  );

  return (
    <View className="flex-1 bg-[#0D0D0D]">
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
          <View className="px-5 pt-4 pb-6">
            <Text className="text-3xl font-bold text-white">Profile</Text>
          </View>

          {/* Profile Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            <View className="mx-5 bg-[#1A1A1A] rounded-3xl p-6 border border-gray-800 mb-6">
              <View className="flex-row items-center mb-6">
                <View className="w-16 h-16 rounded-full bg-amber-500/20 items-center justify-center mr-4">
                  <User size={32} color="#F59E0B" />
                </View>
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-white">
                    {profile?.name || 'User'}
                  </Text>
                  <Text className="text-gray-400 text-sm mt-1">
                    {age} years old
                  </Text>
                </View>
                <Pressable
                  onPress={handleEditProfile}
                  className="w-10 h-10 rounded-full bg-amber-500/20 items-center justify-center active:bg-amber-500/30"
                >
                  <Pencil size={18} color="#F59E0B" />
                </Pressable>
              </View>

              <View className="flex-row items-center bg-[#0D0D0D] rounded-2xl p-4">
                <Calendar size={18} color="#666" />
                <Text className="text-gray-400 ml-3 flex-1">Birthday</Text>
                <Text className="text-white font-medium">{formattedBirthday}</Text>
              </View>
            </View>
          </Animated.View>

          {/* Stats Card */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <View className="mx-5 bg-[#1A1A1A] rounded-3xl p-6 border border-gray-800 mb-6">
              <Text className="text-lg font-semibold text-white mb-4">
                Your Progress
              </Text>
              <View className="flex-row">
                <View className="flex-1 bg-[#0D0D0D] rounded-2xl p-4 mr-2">
                  <View className="flex-row items-center mb-2">
                    <Flame size={18} color="#F59E0B" />
                    <Text className="text-gray-400 text-sm ml-2">Current Streak</Text>
                  </View>
                  <Text className="text-3xl font-bold text-amber-500">
                    {currentStreak}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">days</Text>
                </View>
                <View className="flex-1 bg-[#0D0D0D] rounded-2xl p-4 ml-2">
                  <View className="flex-row items-center mb-2">
                    <Trophy size={18} color="#10B981" />
                    <Text className="text-gray-400 text-sm ml-2">Best Streak</Text>
                  </View>
                  <Text className="text-3xl font-bold text-emerald-500">
                    {longestStreak}
                  </Text>
                  <Text className="text-gray-500 text-xs mt-1">days</Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Session Indicator Settings */}
          <Animated.View entering={FadeInDown.duration(400).delay(300)}>
            <View className="mx-5 mb-6">
              <Text className="text-lg font-semibold text-white mb-4 px-1">
                Notifications
              </Text>
              <View className="bg-[#1A1A1A] rounded-3xl border border-gray-800 overflow-hidden">
                {/* iOS Live Activities */}
                {Platform.OS === 'ios' && (
                  <View className="px-5 py-4 border-b border-gray-800">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-4">
                        <View className="w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center mr-4">
                          <Bell size={20} color="#A855F7" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-base font-medium">
                            Live Activities
                          </Text>
                          <Text className="text-gray-400 text-xs mt-1">
                            Show session progress on Lock Screen and Dynamic Island
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={iosLiveActivityEnabled}
                        onValueChange={handleToggleLiveActivity}
                        trackColor={{ false: '#374151', true: '#A855F7' }}
                        thumbColor={iosLiveActivityEnabled ? '#E9D5FF' : '#9CA3AF'}
                        ios_backgroundColor="#374151"
                      />
                    </View>
                  </View>
                )}

                {/* Android Foreground Service */}
                {Platform.OS === 'android' && (
                  <View className="px-5 py-4 border-b border-gray-800">
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center flex-1 mr-4">
                        <View className="w-10 h-10 rounded-xl bg-green-500/20 items-center justify-center mr-4">
                          <Smartphone size={20} color="#22C55E" />
                        </View>
                        <View className="flex-1">
                          <Text className="text-white text-base font-medium">
                            Persistent Notifications
                          </Text>
                          <Text className="text-gray-400 text-xs mt-1">
                            Show session progress in notification bar
                          </Text>
                        </View>
                      </View>
                      <Switch
                        value={androidForegroundServiceEnabled}
                        onValueChange={handleToggleForegroundService}
                        trackColor={{ false: '#374151', true: '#22C55E' }}
                        thumbColor={androidForegroundServiceEnabled ? '#D1FAE5' : '#9CA3AF'}
                      />
                    </View>
                  </View>
                )}

                {/* Info text */}
                <View className="px-5 py-3 bg-[#0D0D0D]">
                  <Text className="text-gray-500 text-xs">
                    {Platform.OS === 'ios'
                      ? 'Live Activities show real-time session progress on your Lock Screen and in the Dynamic Island.'
                      : 'Persistent notifications keep you updated on session progress even when the app is in the background.'}
                  </Text>
                </View>
              </View>
            </View>
          </Animated.View>

          {/* Settings Section */}
          <Animated.View entering={FadeInDown.duration(400).delay(400)}>
            <View className="mx-5">
              <Text className="text-lg font-semibold text-white mb-4 px-1">
                Settings
              </Text>
              <View className="bg-[#1A1A1A] rounded-3xl border border-gray-800 overflow-hidden">
                {/* Subscription Settings */}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push('/settings');
                  }}
                  className="flex-row items-center px-5 py-4 border-b border-gray-800 active:bg-gray-800/50"
                >
                  <View className="w-10 h-10 rounded-xl bg-purple-500/20 items-center justify-center mr-4">
                    <Crown size={20} color="#A855F7" />
                  </View>
                  <View className="flex-1">
                    <Text className="text-white text-base">Subscription</Text>
                    <Text className="text-gray-400 text-xs mt-1">Manage your plan</Text>
                  </View>
                  <ChevronRight size={20} color="#666" />
                </Pressable>

                {/* Debug Subscription (Development Only) */}
                {__DEV__ && (
                  <Pressable
                    onPress={handleDebugSubscription}
                    className="flex-row items-center px-5 py-4 border-b border-gray-800 active:bg-gray-800/50"
                  >
                    <View className="w-10 h-10 rounded-xl bg-amber-500/20 items-center justify-center mr-4">
                      <Wrench size={20} color="#F59E0B" />
                    </View>
                    <View className="flex-1">
                      <Text className="text-white text-base">Debug Subscription</Text>
                      <Text className="text-gray-400 text-xs mt-1">Test subscription states</Text>
                    </View>
                    <ChevronRight size={20} color="#666" />
                  </Pressable>
                )}

                {/* Terms and Conditions */}
                <Pressable
                  onPress={handleOpenTerms}
                  className="flex-row items-center px-5 py-4 border-b border-gray-800 active:bg-gray-800/50"
                >
                  <View className="w-10 h-10 rounded-xl bg-blue-500/20 items-center justify-center mr-4">
                    <FileText size={20} color="#3B82F6" />
                  </View>
                  <Text className="flex-1 text-white text-base">
                    Terms & Conditions
                  </Text>
                  <ChevronRight size={20} color="#666" />
                </Pressable>

                {/* Sign Out */}
                <Pressable
                  onPress={handleSignOut}
                  className="flex-row items-center px-5 py-4 active:bg-gray-800/50"
                >
                  <View className="w-10 h-10 rounded-xl bg-red-500/20 items-center justify-center mr-4">
                    <LogOut size={20} color="#EF4444" />
                  </View>
                  <Text className="flex-1 text-red-400 text-base">Sign Out</Text>
                  <ChevronRight size={20} color="#666" />
                </Pressable>
              </View>
            </View>
          </Animated.View>

          {/* App Info */}
          <Animated.View entering={FadeInDown.duration(400).delay(500)}>
            <View className="mt-8 items-center">
              <Text className="text-gray-600 text-sm">REMYNX</Text>
              <Text className="text-gray-700 text-xs mt-1">Version 1.0.0</Text>
            </View>
          </Animated.View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
