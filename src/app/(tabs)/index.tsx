import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  FadeIn,
  FadeInDown,
  Easing,
} from 'react-native-reanimated';
import {
  useLifeStore,
  calculateDaysRemaining,
  getSecondsRemainingToday,
  getTotalSecondsInDay,
  formatDate,
} from '@/lib/state/life-store';
import {
  useStreakStore,
} from '@/lib/state/streak-store';
import { useWorksStore, Work } from '@/lib/state/works-store';
import { AlertTriangle } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useDayChange } from '@/lib/providers/DayChangeProvider';
import { StreakIcon } from '@/components/StreakIcon';
import { StreakCelebration } from '@/components/StreakCelebration';
import { WorksProgressBar } from '@/components/WorksProgressBar';
import { WorksList } from '@/components/WorksList';
import { AllWorksCelebration } from '@/components/AllWorksCelebration';
import { useProfile } from '@/lib/hooks/useApiData';

const SCREEN_WIDTH = Dimensions.get('window').width;

// Helper to check if a work is active for a given date
function isWorkActiveForDate(work: Work, date: string, today: string): boolean {
  if (!work.skipType) return true;
  if (work.skipType === 'indefinite') return false;
  if (work.skipType === 'tomorrow' && work.skipDate) {
    // If checking for today, always active (can't skip today)
    if (date === today) return true;
    // If skip date is in the past, the skip has expired
    if (work.skipDate < today) return true;
    // If checking for a date that is >= skip date (tomorrow or later), it's inactive
    if (date >= work.skipDate) return false;
  }
  return true;
}

export default function TodayScreen() {
  const router = useRouter();
  const profile = useLifeStore((s) => s.profile);

  // Use API hook for real-time data updates
  const { refetch: refetchProfile, isRefetching } = useProfile();

  const celebratedDates = useStreakStore((s) => s.celebratedDates);
  const markDayCelebrated = useStreakStore((s) => s.markDayCelebrated);

  // Works store
  const works = useWorksStore((s) => s.works);
  const allWorksCelebratedDates = useWorksStore((s) => s.allWorksCelebratedDates);
  const markAllWorksCelebrated = useWorksStore((s) => s.markAllWorksCelebrated);

  const [secondsRemaining, setSecondsRemaining] = useState(getSecondsRemainingToday());
  const [showCelebration, setShowCelebration] = useState(false);
  const [showAllWorksCelebration, setShowAllWorksCelebration] = useState(false);
  const [isStoreHydrated, setIsStoreHydrated] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Track previous all works fulfilled state
  const prevAllWorksFulfilledRef = useRef<boolean>(false);
  // Track previous work achievement state for streak celebration
  const prevHasAnyWorkAchievementRef = useRef<boolean>(false);

  // Use currentDate from DayChangeProvider to ensure UI updates on day change
  const { currentDate } = useDayChange();
  const today = useMemo(() => {
    console.log('[Home] 📅 Current date from DayChangeProvider:', currentDate);
    return currentDate;
  }, [currentDate]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull to refresh triggered on Home page');
    setIsRefreshing(true);
    try {
      await refetchProfile();
      console.log('✅ Pull to refresh completed on Home page');
    } catch (error) {
      console.log('❌ Pull to refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchProfile]);

  // Wait for store to hydrate before checking celebration status
  useEffect(() => {
    // Small delay to ensure Zustand has fully hydrated from AsyncStorage
    const timer = setTimeout(() => {
      setIsStoreHydrated(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Check if all works celebration was already shown today
  const hasAllWorksCelebratedToday = useMemo(() => {
    return allWorksCelebratedDates.includes(today);
  }, [allWorksCelebratedDates, today]);

  // Get active works only (not skipped)
  const activeWorks = useMemo(() => {
    return works.filter((w) => isWorkActiveForDate(w, today, today));
  }, [works, today]);

  // Calculate if all active works are fulfilled
  const allActiveWorksFulfilled = useMemo(() => {
    if (activeWorks.length === 0) return false;
    const fulfilled = activeWorks.every((w) => {
      const workAchievements = w.achievements[today] || [];
      return workAchievements.length > 0;
    });
    console.log('[Home] 📊 All active works fulfilled:', fulfilled, 'for date:', today);
    return fulfilled;
  }, [activeWorks, today]);

  // Check if any active work has achievements (for streak)
  const hasAnyActiveWorkAchievement = useMemo(() => {
    return activeWorks.some((w) => {
      const workAchievements = w.achievements[today] || [];
      return workAchievements.length > 0;
    });
  }, [activeWorks, today]);

  // Calculate current streak based on work achievements (any work, active or not)
  const currentStreak = useMemo(() => {
    let streak = 0;
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const todayStr = formatDate(new Date());

    while (true) {
      const dateStr = formatDate(currentDate);
      // Check if any work has achievement on this date
      const hasAchievementOnDate = works.some((w) => {
        const workAchievements = w.achievements[dateStr] || [];
        return workAchievements.length > 0;
      });

      if (hasAchievementOnDate) {
        streak++;
        currentDate.setDate(currentDate.getDate() - 1);
      } else {
        break;
      }
    }

    return streak;
  }, [works]);

  const isTodayComplete = hasAnyActiveWorkAchievement;

  const hasCelebratedToday = useMemo(
    () => celebratedDates.includes(today),
    [celebratedDates, today]
  );

  // Check if we should show streak celebration (first work achievement of the day)
  useEffect(() => {
    const prevHasAny = prevHasAnyWorkAchievementRef.current;

    // Celebrate when going from no achievements to having achievements AND not already celebrated
    if (!prevHasAny && hasAnyActiveWorkAchievement && !hasCelebratedToday) {
      const timer = setTimeout(() => {
        setShowCelebration(true);
        markDayCelebrated(today);
      }, 300);

      return () => clearTimeout(timer);
    }

    prevHasAnyWorkAchievementRef.current = hasAnyActiveWorkAchievement;
  }, [hasAnyActiveWorkAchievement, hasCelebratedToday, markDayCelebrated, today]);

  // Check if all active works are fulfilled and show celebration
  useEffect(() => {
    // Wait for store hydration before checking
    if (!isStoreHydrated) return;

    // Only trigger when transitioning from not-all-fulfilled to all-fulfilled
    if (
      allActiveWorksFulfilled &&
      !prevAllWorksFulfilledRef.current &&
      !hasAllWorksCelebratedToday &&
      activeWorks.length > 0
    ) {
      const timer = setTimeout(() => {
        setShowAllWorksCelebration(true);
        markAllWorksCelebrated(today);
      }, 500);

      return () => clearTimeout(timer);
    }

    prevAllWorksFulfilledRef.current = allActiveWorksFulfilled;
  }, [allActiveWorksFulfilled, hasAllWorksCelebratedToday, markAllWorksCelebrated, today, activeWorks.length, isStoreHydrated]);

  // Reset celebration flag at midnight
  useEffect(() => {
    const checkMidnight = setInterval(() => {
      const now = new Date();
      if (now.getHours() === 0 && now.getMinutes() === 0) {
        prevAllWorksFulfilledRef.current = false;
        prevHasAnyWorkAchievementRef.current = false;
      }
    }, 60000);

    return () => clearInterval(checkMidnight);
  }, []);

  // Initialize the refs on mount
  useEffect(() => {
    prevAllWorksFulfilledRef.current = allActiveWorksFulfilled;
    prevHasAnyWorkAchievementRef.current = hasAnyActiveWorkAchievement;
  }, []);

  const daysRemaining = useMemo(
    () => (profile ? calculateDaysRemaining(profile.birthday) : 0),
    [profile]
  );
  const totalSecondsInDay = useMemo(() => getTotalSecondsInDay(), []);
  const progressPercent = useMemo(
    () => ((totalSecondsInDay - secondsRemaining) / totalSecondsInDay) * 100,
    [totalSecondsInDay, secondsRemaining]
  );

  const progressWidth = useSharedValue(progressPercent);

  useEffect(() => {
    const interval = setInterval(() => {
      const newSeconds = getSecondsRemainingToday();
      setSecondsRemaining(newSeconds);
      const newProgress =
        ((totalSecondsInDay - newSeconds) / totalSecondsInDay) * 100;
      progressWidth.value = withTiming(newProgress, {
        duration: 1000,
        easing: Easing.linear,
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [progressWidth, totalSecondsInDay]);

  const animatedProgressStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  const formatTime = useCallback((seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  const handleStreakPress = useCallback(() => {
    router.push('/streak');
  }, [router]);

  const handleCelebrationDismiss = useCallback(() => {
    setShowCelebration(false);
  }, []);

  const handleAllWorksCelebrationDismiss = useCallback(() => {
    setShowAllWorksCelebration(false);
  }, []);

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
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing || isRefetching}
              onRefresh={onRefresh}
              tintColor="#F59E0B"
              colors={['#F59E0B']}
            />
          }
        >
          {/* Header with Streak Icon */}
          <Animated.View
            entering={FadeIn.duration(600)}
            className="px-6 pt-4 pb-6 flex-row justify-between items-start"
          >
            <View>
              <Text className="text-gray-500 text-sm uppercase tracking-wider">
                {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
              </Text>
              <Text className="text-white text-3xl font-bold mt-1">
                {new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                })}
              </Text>
            </View>

            {/* Streak Icon */}
            <StreakIcon
              streakCount={currentStreak}
              isCompleted={isTodayComplete}
              onPress={handleStreakPress}
            />
          </Animated.View>

          {/* Year Progress Tracking Bar - Month boxes */}
          <Animated.View
            entering={FadeInDown.delay(150).duration(600)}
            className="mx-6 mb-4"
          >
            <View className="bg-[#1A1A1A] rounded-2xl p-4 border border-gray-800">
              <Text className="text-gray-400 text-[10px] uppercase tracking-wider mb-3 text-center">
                Year Progress
              </Text>
              <View className="flex-row justify-between">
                {['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'].map((monthName, index) => {
                  const currentMonth = new Date().getMonth();
                  const isCurrentMonth = index === currentMonth;
                  const isPastMonth = index < currentMonth;

                  return (
                    <View key={monthName} className="items-center">
                      <View
                        className={`rounded-md items-center justify-center ${
                          isCurrentMonth
                            ? 'bg-amber-500/30'
                            : isPastMonth
                            ? 'bg-gray-700'
                            : 'bg-gray-800'
                        }`}
                        style={{
                          width: (SCREEN_WIDTH - 80) / 12,
                          height: 28,
                          borderLeftWidth: isCurrentMonth ? 3 : 0,
                          borderLeftColor: isCurrentMonth ? '#F59E0B' : 'transparent',
                        }}
                      >
                        <Text
                          className={`text-[8px] font-bold ${
                            isCurrentMonth
                              ? 'text-amber-400'
                              : isPastMonth
                              ? 'text-gray-400'
                              : 'text-gray-500'
                          }`}
                        >
                          {monthName}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          </Animated.View>

          {/* Days Remaining Card */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(600)}
            className="mx-6 mb-6"
          >
            <View className="bg-[#1A1A1A] rounded-3xl p-6 border border-gray-800">
              <Text className="text-gray-400 text-sm uppercase tracking-wider text-center mb-2">
                Days Remaining
              </Text>
              <Text className="text-5xl font-bold text-amber-500 text-center">
                {daysRemaining.toLocaleString()}
              </Text>
              <Text className="text-gray-600 text-center text-sm mt-2">
                Make today count, {profile?.name}
              </Text>
            </View>
          </Animated.View>

          {/* Time Progress Card */}
          <Animated.View
            entering={FadeInDown.delay(400).duration(600)}
            className="mx-6 mb-6"
          >
            <View className="bg-[#1A1A1A] rounded-3xl p-6 border border-gray-800">
              <Text className="text-gray-400 text-sm uppercase tracking-wider mb-4">
                Today's Time Remaining
              </Text>

              {/* Progress Bar */}
              <View className="h-4 bg-gray-800 rounded-full overflow-hidden mb-4">
                <Animated.View style={animatedProgressStyle}>
                  <LinearGradient
                    colors={['#F59E0B', '#EF4444']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      height: 16,
                      borderRadius: 8,
                    }}
                  />
                </Animated.View>
              </View>

              {/* Time Display */}
              <View className="flex-row justify-between items-center">
                <Text className="text-gray-500 text-sm">Time left</Text>
                <Text className="text-2xl font-mono text-white">
                  {formatTime(secondsRemaining)}
                </Text>
              </View>

              <View className="flex-row justify-between items-center mt-2">
                <Text className="text-gray-500 text-sm">Day progress</Text>
                <Text className="text-amber-500 font-semibold">
                  {progressPercent.toFixed(1)}%
                </Text>
              </View>
            </View>
          </Animated.View>

          {/* Warning Banner (if no activity) */}
          {!hasAnyActiveWorkAchievement && activeWorks.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(500).duration(600)}
              className="mx-6 mb-6"
            >
              <View className="bg-red-500/10 rounded-2xl p-4 border border-red-500/30 flex-row items-center">
                <AlertTriangle size={24} color="#EF4444" />
                <View className="ml-3 flex-1">
                  <Text className="text-red-400 font-semibold">
                    No progress today
                  </Text>
                  <Text className="text-red-400/70 text-sm">
                    Don't waste this day. Log an achievement for your work.
                  </Text>
                </View>
              </View>
            </Animated.View>
          )}

          {/* Works Progress Bar */}
          {activeWorks.length > 0 && (
            <Animated.View
              entering={FadeInDown.delay(550).duration(600)}
              className="mx-6 mb-6"
            >
              <WorksProgressBar />
            </Animated.View>
          )}

          {/* Achievements Section (formerly Works) */}
          <Animated.View
            entering={FadeInDown.delay(600).duration(600)}
            className="mx-6 mb-6"
          >
            <WorksList />
          </Animated.View>
        </ScrollView>
      </SafeAreaView>

      {/* Streak Celebration Overlay */}
      <StreakCelebration
        streakCount={currentStreak}
        onDismiss={handleCelebrationDismiss}
        visible={showCelebration}
      />

      {/* All Works Completed Celebration */}
      <AllWorksCelebration
        visible={showAllWorksCelebration}
        onDismiss={handleAllWorksCelebrationDismiss}
      />
    </View>
  );
}
