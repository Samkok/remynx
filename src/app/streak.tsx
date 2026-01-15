import React, { useMemo, useCallback, memo } from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeIn, FadeInDown, FadeInRight } from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import {
  Flame,
  ChevronLeft,
  Trophy,
  Target,
  Calendar,
  Check,
  X,
  Sparkles,
  Crown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { formatDate } from '@/lib/state/life-store';
import { useWorksStore } from '@/lib/state/works-store';
import {
  useStreakStore,
  calculateCurrentStreak,
  generateWeeklyQuests,
  generateFutureWeekQuest,
  type WeeklyQuest,
  type StreakDay,
} from '@/lib/state/streak-store';

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

interface WeekCardProps {
  quest: WeeklyQuest;
  isCurrent: boolean;
  isFuture: boolean;
  index: number;
  registrationDate: string | null;
}

const DayCircle = memo(function DayCircle({
  day,
  dayIndex,
  isToday,
  isFuture,
  isBlank,
}: {
  day: StreakDay;
  dayIndex: number;
  isToday: boolean;
  isFuture: boolean;
  isBlank: boolean;
}) {
  const dayDate = new Date(day.date);
  const dayOfMonth = dayDate.getDate();

  return (
    <View className="items-center">
      <Text className="text-gray-500 text-xs mb-1">{DAYS_OF_WEEK[dayIndex]}</Text>
      <View
        className={`w-10 h-10 rounded-full items-center justify-center ${
          day.completed
            ? 'bg-green-500'
            : isToday
            ? 'bg-amber-500/30 border-2 border-amber-500'
            : isFuture
            ? 'bg-gray-800/50 border border-dashed border-gray-600'
            : isBlank
            ? 'bg-gray-700/30 border border-gray-700'
            : 'bg-red-500/20 border border-red-500/50'
        }`}
      >
        {day.completed ? (
          <Check size={18} color="white" strokeWidth={3} />
        ) : isFuture ? (
          <Text className="text-gray-500 text-sm font-medium">{dayOfMonth}</Text>
        ) : isToday ? (
          <Text className="text-amber-500 text-sm font-bold">{dayOfMonth}</Text>
        ) : isBlank ? (
          <Text className="text-gray-600 text-sm font-medium">{dayOfMonth}</Text>
        ) : (
          <X size={16} color="#EF4444" strokeWidth={2} />
        )}
      </View>
    </View>
  );
});

const WeekCard = memo(function WeekCard({
  quest,
  isCurrent,
  isFuture,
  index,
  registrationDate,
}: WeekCardProps) {
  const today = formatDate(new Date());
  const completedDays = quest.days.filter((d) => d.completed).length;
  const progress = (completedDays / 7) * 100;

  const getWeekLabel = () => {
    if (isFuture) return 'Next Week';
    if (isCurrent) return 'This Week';
    return `Week ${index + 1}`;
  };

  const startDate = new Date(quest.startDate);
  const endDate = new Date(quest.endDate);
  const dateRange = `${startDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`;

  return (
    <Animated.View
      entering={FadeInDown.delay(index * 100).duration(400)}
      className="mb-4"
    >
      <View
        className={`rounded-2xl overflow-hidden ${
          isCurrent
            ? 'border-2 border-amber-500/50'
            : isFuture
            ? 'border border-dashed border-gray-600'
            : quest.isComplete
            ? 'border border-green-500/30'
            : 'border border-gray-800'
        }`}
      >
        <LinearGradient
          colors={
            isCurrent
              ? ['#1F1F1F', '#1A1A1A']
              : isFuture
              ? ['#151515', '#121212']
              : quest.isComplete
              ? ['#052E16', '#022C22']
              : ['#1A1A1A', '#151515']
          }
          style={{ padding: 16 }}
        >
          {/* Header */}
          <View className="flex-row justify-between items-center mb-4">
            <View className="flex-row items-center">
              {quest.isComplete ? (
                <View className="w-8 h-8 rounded-full bg-green-500/20 items-center justify-center mr-2">
                  <Crown size={16} color="#10B981" />
                </View>
              ) : isCurrent ? (
                <View className="w-8 h-8 rounded-full bg-amber-500/20 items-center justify-center mr-2">
                  <Target size={16} color="#F59E0B" />
                </View>
              ) : isFuture ? (
                <View className="w-8 h-8 rounded-full bg-gray-700/50 items-center justify-center mr-2">
                  <Calendar size={16} color="#666" />
                </View>
              ) : (
                <View className="w-8 h-8 rounded-full bg-gray-800 items-center justify-center mr-2">
                  <Calendar size={16} color="#666" />
                </View>
              )}
              <View>
                <Text
                  className={`font-bold ${
                    isCurrent
                      ? 'text-amber-500'
                      : isFuture
                      ? 'text-gray-500'
                      : quest.isComplete
                      ? 'text-green-400'
                      : 'text-white'
                  }`}
                >
                  {getWeekLabel()}
                </Text>
                <Text className="text-gray-500 text-xs">{dateRange}</Text>
              </View>
            </View>

            <View className="items-end">
              <Text
                className={`text-2xl font-bold ${
                  quest.isComplete
                    ? 'text-green-400'
                    : isFuture
                    ? 'text-gray-600'
                    : 'text-white'
                }`}
              >
                {completedDays}/7
              </Text>
              <Text className="text-gray-500 text-xs">days</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View className="h-2 bg-gray-800 rounded-full overflow-hidden mb-4">
            <View
              style={{ width: `${progress}%` }}
              className={`h-full rounded-full ${
                quest.isComplete
                  ? 'bg-green-500'
                  : isCurrent
                  ? 'bg-amber-500'
                  : 'bg-gray-600'
              }`}
            />
          </View>

          {/* Days grid */}
          <View className="flex-row justify-between">
            {quest.days.map((day, dayIndex) => {
              const isToday = day.date === today;
              const dayIsFuture = new Date(day.date) > new Date();
              // Check if day is blank (before registration)
              const isBlank = registrationDate ? day.date < registrationDate : false;

              return (
                <DayCircle
                  key={day.date}
                  day={day}
                  dayIndex={dayIndex}
                  isToday={isToday}
                  isFuture={dayIsFuture}
                  isBlank={isBlank}
                />
              );
            })}
          </View>

          {/* Quest complete badge */}
          {quest.isComplete && (
            <View className="mt-4 bg-green-500/10 rounded-xl p-3 flex-row items-center justify-center">
              <Sparkles size={16} color="#10B981" />
              <Text className="text-green-400 font-semibold ml-2">
                Perfect Week Achieved!
              </Text>
              <Sparkles size={16} color="#10B981" />
            </View>
          )}
        </LinearGradient>
      </View>
    </Animated.View>
  );
});

export default function StreakScreen() {
  const router = useRouter();
  const works = useWorksStore((s) => s.works);
  const longestStreak = useStreakStore((s) => s.longestStreak);
  const registrationDate = useStreakStore((s) => s.registrationDate);

  const currentStreak = useMemo(
    () => calculateCurrentStreak(works),
    [works]
  );

  const weeklyQuests = useMemo(
    () => generateWeeklyQuests(works, 4),
    [works]
  );

  const futureQuest = useMemo(
    () => generateFutureWeekQuest(works, 1),
    [works]
  );

  const totalCompletedDays = useMemo(() => {
    // Get all unique dates that have at least one work achievement
    const datesSet = new Set<string>();
    works.forEach((work) => {
      Object.keys(work.achievements).forEach((dateStr) => {
        if (work.achievements[dateStr].length > 0) {
          datesSet.add(dateStr);
        }
      });
    });
    return datesSet.size;
  }, [works]);

  const perfectWeeks = useMemo(() => {
    return weeklyQuests.filter((q) => q.isComplete).length;
  }, [weeklyQuests]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  }, [router]);

  // Determine which week is current
  const today = formatDate(new Date());
  const currentWeekIndex = weeklyQuests.findIndex((quest) =>
    quest.days.some((day) => day.date === today)
  );

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />

      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <Animated.View
          entering={FadeIn.duration(400)}
          className="flex-row items-center justify-between px-4 py-3"
        >
          <Pressable
            onPress={handleBack}
            className="w-10 h-10 rounded-full bg-gray-800/50 items-center justify-center"
          >
            <ChevronLeft size={24} color="white" />
          </Pressable>

          <Text className="text-white text-xl font-bold">Daily Streak</Text>

          <View className="w-10" />
        </Animated.View>

        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
        >
          {/* Streak Hero */}
          <Animated.View
            entering={FadeInDown.delay(100).duration(500)}
            className="items-center py-8"
          >
            <View className="w-28 h-28 rounded-full bg-orange-500/20 items-center justify-center mb-4">
              <Flame size={64} color="#F97316" fill="#F97316" />
            </View>

            <Text className="text-6xl font-bold text-white">{currentStreak}</Text>
            <Text className="text-gray-400 text-lg">
              {currentStreak === 1 ? 'day streak' : 'day streak'}
            </Text>

            {currentStreak > 0 && (
              <View className="mt-2 bg-orange-500/10 px-4 py-1 rounded-full">
                <Text className="text-orange-400 text-sm font-medium">
                  Keep it going!
                </Text>
              </View>
            )}
          </Animated.View>

          {/* Stats Row */}
          <Animated.View
            entering={FadeInDown.delay(200).duration(500)}
            className="flex-row justify-between mb-8"
          >
            <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 mr-2 items-center border border-gray-800">
              <Trophy size={24} color="#FBBF24" />
              <Text className="text-2xl font-bold text-white mt-2">
                {longestStreak}
              </Text>
              <Text className="text-gray-500 text-xs">Longest Streak</Text>
            </View>

            <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 mx-2 items-center border border-gray-800">
              <Check size={24} color="#10B981" />
              <Text className="text-2xl font-bold text-white mt-2">
                {totalCompletedDays}
              </Text>
              <Text className="text-gray-500 text-xs">Total Days</Text>
            </View>

            <View className="flex-1 bg-[#1A1A1A] rounded-2xl p-4 ml-2 items-center border border-gray-800">
              <Crown size={24} color="#A855F7" />
              <Text className="text-2xl font-bold text-white mt-2">
                {perfectWeeks}
              </Text>
              <Text className="text-gray-500 text-xs">Perfect Weeks</Text>
            </View>
          </Animated.View>

          {/* Weekly Quests Section */}
          <Animated.View entering={FadeInRight.delay(300).duration(400)}>
            <Text className="text-white text-xl font-bold mb-4">
              Weekly Quests
            </Text>
            <Text className="text-gray-500 text-sm mb-4">
              Complete all 7 days to achieve a perfect week
            </Text>
          </Animated.View>

          {/* Future Week */}
          <WeekCard
            quest={futureQuest}
            isCurrent={false}
            isFuture={true}
            index={0}
            registrationDate={registrationDate}
          />

          {/* Weekly Quest Cards (newest first) */}
          {[...weeklyQuests].reverse().map((quest, index) => {
            const isCurrentWeek =
              currentWeekIndex !== -1 &&
              index === weeklyQuests.length - 1 - currentWeekIndex;

            return (
              <WeekCard
                key={quest.startDate}
                quest={quest}
                isCurrent={isCurrentWeek}
                isFuture={false}
                index={index + 1}
                registrationDate={registrationDate}
              />
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
