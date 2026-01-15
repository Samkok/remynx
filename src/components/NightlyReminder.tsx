import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withRepeat,
  withSequence,
  FadeIn,
  FadeOut,
  SlideInUp,
  SlideOutUp,
  Easing,
  interpolate,
} from 'react-native-reanimated';
import { Clock, X, Flame, Trophy, ChevronRight } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { formatDate } from '@/lib/state/life-store';
import { useWorksStore } from '@/lib/state/works-store';
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';

const { width } = Dimensions.get('window');

interface NightlyReminderProps {
  onDismiss?: () => void;
}

export function NightlyReminder({ onDismiss }: NightlyReminderProps) {
  const router = useRouter();
  const works = useWorksStore((s) => s.works);
  const startSession = useSessionIndicatorStore((s) => s.startSession);
  const endSession = useSessionIndicatorStore((s) => s.endSession);

  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  const [secondsUntilMidnight, setSecondsUntilMidnight] = useState(0);

  const today = formatDate(new Date());

  // Check if any work has achievements today
  const hasAnyWorkAchievement = useMemo(() => {
    return works.some((work) => {
      const workAchievements = work.achievements[today] || [];
      return workAchievements.length > 0;
    });
  }, [works, today]);

  // Count total achievements across all works today
  const totalAchievementsToday = useMemo(() => {
    return works.reduce((total, work) => {
      const workAchievements = work.achievements[today] || [];
      return total + workAchievements.length;
    }, 0);
  }, [works, today]);

  // Animation values
  const pulseAnim = useSharedValue(1);
  const progressWidth = useSharedValue(0);
  const glowOpacity = useSharedValue(0.3);

  // Check if it's between 11 PM and midnight
  const checkTime = useCallback(() => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    const seconds = now.getSeconds();

    // Show between 11 PM (23:00) and midnight (00:00)
    const isReminderTime = hours === 23;

    // Only show reminder if user hasn't completed their daily streak
    if (isReminderTime && !isDismissed && !hasAnyWorkAchievement) {
      // Calculate seconds until midnight
      const secondsLeft = (60 - minutes - 1) * 60 + (60 - seconds);
      setSecondsUntilMidnight(secondsLeft);

      if (!isVisible) {
        setIsVisible(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

        // Start session indicator for persistent notification/Live Activity
        const minutesLeft = Math.ceil(secondsLeft / 60);
        const endTime = Date.now() + secondsLeft * 1000;
        startSession({
          sessionType: 'nightly_reminder',
          message: '1 hour left to log today\'s achievements',
          durationMinutes: minutesLeft,
        });
      }
    } else if (!isReminderTime) {
      // Reset dismissed state when it's no longer 11 PM
      setIsDismissed(false);
      setIsVisible(false);
    }
  }, [isVisible, isDismissed, hasAnyWorkAchievement, startSession]);

  useEffect(() => {
    // Check immediately
    checkTime();

    // Then check every second
    const interval = setInterval(checkTime, 1000);

    return () => clearInterval(interval);
  }, [checkTime]);

  // Pulse animation for urgency
  useEffect(() => {
    if (isVisible) {
      pulseAnim.value = withRepeat(
        withSequence(
          withTiming(1.05, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 1000 }),
          withTiming(0.3, { duration: 1000 })
        ),
        -1,
        true
      );

      // Progress bar animation (1 hour = 3600 seconds)
      const progress = ((3600 - secondsUntilMidnight) / 3600) * 100;
      progressWidth.value = withTiming(progress, { duration: 500 });
    }
  }, [isVisible, secondsUntilMidnight, pulseAnim, glowOpacity, progressWidth]);

  const animatedPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseAnim.value }],
  }));

  const animatedGlowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsDismissed(true);
    setIsVisible(false);
    endSession(); // End the session indicator
    onDismiss?.();
  }, [onDismiss, endSession]);

  const handleLogAchievement = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setIsDismissed(true);
    setIsVisible(false);
    endSession(); // End the session indicator
    router.push('/(tabs)');
  }, [router, endSession]);

  if (!isVisible) return null;

  return (
    <Animated.View
      entering={SlideInUp.duration(400).springify()}
      exiting={SlideOutUp.duration(300)}
      className="absolute top-0 left-0 right-0 z-50"
      style={{ paddingTop: 50 }}
    >
      {/* Glow effect behind the card */}
      <Animated.View
        style={[
          animatedGlowStyle,
          {
            position: 'absolute',
            top: 40,
            left: 10,
            right: 10,
            height: 200,
            backgroundColor: '#EF4444',
            borderRadius: 24,
            shadowColor: '#EF4444',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.8,
            shadowRadius: 20,
          },
        ]}
      />

      <Animated.View style={animatedPulseStyle} className="mx-3">
        <LinearGradient
          colors={['#7F1D1D', '#991B1B']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            borderRadius: 20,
            borderWidth: 1,
            borderColor: 'rgba(239, 68, 68, 0.3)',
            overflow: 'hidden',
          }}
        >
          {/* Header with dismiss */}
          <View className="flex-row items-center justify-between px-4 pt-4">
            <View className="flex-row items-center">
              <View
                className="w-8 h-8 rounded-full items-center justify-center mr-2"
                style={{
                  backgroundColor: 'rgba(239, 68, 68, 0.2)',
                }}
              >
                <Flame size={16} color="#EF4444" />
              </View>
              <Text className="text-white/60 text-xs uppercase tracking-wider font-medium">
                Daily Reminder
              </Text>
            </View>
            <Pressable
              onPress={handleDismiss}
              className="p-1"
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <X size={18} color="rgba(255,255,255,0.5)" />
            </Pressable>
          </View>

          {/* Main content */}
          <View className="px-4 pt-3 pb-4">
            <Text className="text-white text-xl font-bold mb-1">
              1 Hour Left Today
            </Text>
            <Text className="text-white/70 text-sm mb-4">
              The day is ending. Log what you've accomplished or make something count.
            </Text>

            {/* Countdown timer */}
            <View className="flex-row items-center mb-4">
              <Clock size={16} color="rgba(255,255,255,0.6)" />
              <Text className="text-white/60 text-sm ml-2">
                Time until midnight:
              </Text>
              <Text className="text-white text-lg font-mono font-bold ml-2">
                {formatCountdown(secondsUntilMidnight)}
              </Text>
            </View>

            {/* Progress bar */}
            <View className="h-2 bg-black/30 rounded-full overflow-hidden mb-4">
              <Animated.View style={animatedProgressStyle}>
                <LinearGradient
                  colors={['#F59E0B', '#EF4444']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    height: 8,
                    borderRadius: 4,
                  }}
                />
              </Animated.View>
            </View>

            {/* Action button */}
            <Pressable
              onPress={handleLogAchievement}
              className="bg-white/20 rounded-xl py-3 px-4 flex-row items-center justify-between active:bg-white/30"
            >
              <Text className="text-white font-semibold">
                Log Achievement Now
              </Text>
              <ChevronRight size={20} color="white" />
            </Pressable>
          </View>
        </LinearGradient>
      </Animated.View>
    </Animated.View>
  );
}
