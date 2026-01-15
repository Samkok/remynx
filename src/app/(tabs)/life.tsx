import React, { useMemo, useState, useCallback, memo, useRef, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  Modal,
  TouchableWithoutFeedback,
  Dimensions,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import {
  calculateDaysLived,
  calculateTotalDays,
  formatDate,
} from '@/lib/state/life-store';
import { useWorksStore, WorkAchievement } from '@/lib/state/works-store';
import { useProfile } from '@/lib/hooks/useApiData';
import {
  Calendar,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ArrowDown,
} from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const LIFE_EXPECTANCY_YEARS = 60;
const SCREEN_WIDTH = Dimensions.get('window').width;

type ZoomLevel = 'year' | 'month' | 'week' | 'day';

interface WorkAchievementGroup {
  workName: string;
  workColor: string;
  achievements: WorkAchievement[];
}

interface DayData {
  date: Date;
  dateStr: string;
  dayOfWeek: number;
  status: 'future' | 'today' | 'productive' | 'wasted' | 'lived';
  workAchievements: WorkAchievementGroup[];
  hasAchievements: boolean;
}

interface WeekData {
  weekOfMonth: number;
  days: DayData[];
}

interface MonthData {
  year: number;
  month: number; // 0-11
  monthName: string;
  weeks: WeekData[];
  allDays: DayData[];
}

interface YearData {
  year: number;
  months: MonthData[];
}

// Memoized Year Tile Component
const YearTileComponent = memo(function YearTile({
  year,
  isCurrentYear,
  isPastYear,
  isFutureYear,
  onPress,
  hasData,
}: {
  year: number;
  isCurrentYear: boolean;
  isPastYear: boolean;
  isFutureYear: boolean;
  onPress: () => void;
  hasData: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl p-4 border-2 relative ${
        isCurrentYear
          ? 'bg-amber-500/20 border-amber-500'
          : isPastYear
          ? 'bg-gray-800/50 border-gray-700'
          : 'bg-[#1A1A1A] border-gray-800'
      }`}
      style={{ width: (SCREEN_WIDTH - 48 - 16) / 3 }}
    >
      {/* Future year indicator - green dot */}
      {isFutureYear && (
        <View className="absolute top-2 right-2 w-2.5 h-2.5 bg-green-500 rounded-full" />
      )}

      <View className="relative">
        <Text
          className={`text-xl font-bold text-center ${
            isCurrentYear ? 'text-amber-500' : isPastYear ? 'text-gray-500' : 'text-white'
          }`}
        >
          {year}
        </Text>

        {/* Past year crossed line */}
        {isPastYear && (
          <View
            className="absolute top-1/2 left-0 right-0 h-0.5 bg-gray-600"
            style={{ transform: [{ translateY: -1 }] }}
          />
        )}
      </View>

      {isCurrentYear && (
        <Text className="text-amber-400 text-center text-xs mt-1">Now</Text>
      )}
    </Pressable>
  );
});

// Memoized Month Tile Component
const MonthTileComponent = memo(function MonthTile({
  month,
  isCurrentMonth,
  onPress,
  productiveDays,
  totalDays,
}: {
  month: MonthData;
  isCurrentMonth: boolean;
  onPress: () => void;
  productiveDays: number;
  totalDays: number;
}) {
  const percentage = totalDays > 0 ? Math.round((productiveDays / totalDays) * 100) : 0;

  return (
    <Pressable
      onPress={onPress}
      className={`rounded-2xl p-4 mb-3 border ${
        isCurrentMonth
          ? 'bg-amber-500/20 border-amber-500'
          : productiveDays > 0
          ? 'bg-green-500/10 border-green-500/30'
          : 'bg-[#1A1A1A] border-gray-800'
      }`}
    >
      <View className="flex-row justify-between items-center">
        <View>
          <Text
            className={`text-xl font-bold ${
              isCurrentMonth ? 'text-amber-500' : 'text-white'
            }`}
          >
            {month.monthName}
          </Text>
          {productiveDays > 0 && (
            <Text className="text-green-400 text-sm mt-1">
              {productiveDays} productive days ({percentage}%)
            </Text>
          )}
        </View>
        <ChevronRight size={24} color="#999" />
      </View>
    </Pressable>
  );
});

// Memoized Day Cell Component for Month View
const DayCellComponent = memo(function DayCell({
  day,
  onPress,
}: {
  day: DayData | null;
  onPress: () => void;
}) {
  if (!day) {
    return (
      <View
        style={{
          width: (SCREEN_WIDTH - 48) / 7,
          height: (SCREEN_WIDTH - 48) / 7,
          padding: 2,
        }}
      />
    );
  }

  const getColorClass = () => {
    switch (day.status) {
      case 'productive':
        return 'bg-green-500';
      case 'wasted':
        return 'bg-red-500';
      case 'today':
        return 'bg-amber-500';
      case 'lived':
        return 'bg-gray-600';
      case 'future':
      default:
        return 'bg-gray-800';
    }
  };

  return (
    <Pressable
      onPress={onPress}
      style={{
        width: (SCREEN_WIDTH - 48) / 7,
        height: (SCREEN_WIDTH - 48) / 7,
        padding: 2,
      }}
    >
      <View
        className={`rounded-lg ${getColorClass()} items-center justify-center flex-1 ${
          day.status === 'today' ? 'border-2 border-amber-300' : ''
        }`}
      >
        <Text
          className={`text-xs font-semibold ${
            day.status === 'future' ? 'text-gray-500' : 'text-white'
          }`}
        >
          {day.date.getDate()}
        </Text>
        {day.hasAchievements && (
          <View className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-green-400 rounded-full" />
        )}
      </View>
    </Pressable>
  );
});

export default function LifeCalendarScreen() {
  const { data: profileData, refetch: refetchProfile, isRefetching, isLoading, error } = useProfile();
  const profile = profileData?.profile;
  const works = useWorksStore((s) => s.works);

  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('year');
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<MonthData | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Refs for ScrollViews
  const yearScrollRef = useRef<ScrollView>(null);
  const monthScrollRef = useRef<ScrollView>(null);
  const hasInitialScrolledYear = useRef(false);
  const hasInitialScrolledMonth = useRef(false);

  // Animation values for zoom button
  const zoomButtonScale = useSharedValue(1);
  const zoomButtonRotation = useSharedValue(0);

  // Animation values for floating button
  const floatingButtonOpacity = useSharedValue(0);
  const floatingButtonScale = useSharedValue(0.8);

  const daysLived = profile ? calculateDaysLived(profile.birthday) : 0;
  const totalDays = calculateTotalDays();
  const percentLived = ((daysLived / totalDays) * 100).toFixed(1);

  // Memoize today and todayStr to prevent unnecessary recalculations
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDate(today), [today]);
  const currentYear = useMemo(() => today.getFullYear(), [today]);
  const currentMonth = useMemo(() => today.getMonth(), [today]);

  // Pull to refresh handler
  const onRefresh = useCallback(async () => {
    console.log('🔄 Pull to refresh triggered on Calendar page');
    setIsRefreshing(true);
    try {
      await refetchProfile();
      console.log('✅ Pull to refresh completed on Calendar page');
    } catch (error) {
      console.log('❌ Pull to refresh failed:', error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchProfile]);

  // Helper to get all work achievements for a specific date
  const getWorkAchievementsForDate = useCallback((dateStr: string): WorkAchievementGroup[] => {
    const groups: WorkAchievementGroup[] = [];

    works.forEach((work) => {
      const achievements = work.achievements[dateStr] || [];
      if (achievements.length > 0) {
        groups.push({
          workName: work.name,
          workColor: work.color,
          achievements,
        });
      }
    });

    return groups;
  }, [works]);

  // Generate all year data with months
  const yearData = useMemo(() => {
    if (!profile) return [];

    const birthDate = new Date(profile.birthday);
    const birthYear = birthDate.getFullYear();

    // Registration date - the day the user created their profile
    const registrationDate = new Date(profile.createdAt);
    // Set to start of day for accurate comparison
    registrationDate.setHours(0, 0, 0, 0);

    const years: YearData[] = [];

    for (let y = 0; y < LIFE_EXPECTANCY_YEARS; y++) {
      const yearNum = birthYear + y;
      const months: MonthData[] = [];

      for (let m = 0; m < 12; m++) {
        const monthStart = new Date(yearNum, m, 1);
        const monthEnd = new Date(yearNum, m + 1, 0);

        // Skip months before birth
        if (monthEnd < birthDate) continue;

        const monthName = monthStart.toLocaleString('en-US', { month: 'long' });
        const allDays: DayData[] = [];

        // Generate all days in the month
        for (let d = 1; d <= monthEnd.getDate(); d++) {
          const dayDate = new Date(yearNum, m, d);

          // Skip days before birth
          if (dayDate < birthDate) continue;

          const dateStr = formatDate(dayDate);
          const workAchievements = getWorkAchievementsForDate(dateStr);
          const hasAchievements = workAchievements.length > 0;

          let dayStatus: DayData['status'] = 'future';
          if (dateStr === todayStr) {
            dayStatus = 'today';
          } else if (dayDate < today) {
            if (hasAchievements) {
              dayStatus = 'productive';
            } else {
              // Check if day is after registration date
              const dayDateNormalized = new Date(dayDate);
              dayDateNormalized.setHours(0, 0, 0, 0);

              if (dayDateNormalized >= registrationDate) {
                // Day after registration with no achievements = wasted
                dayStatus = 'wasted';
              } else {
                // Day before registration = lived (past)
                dayStatus = 'lived';
              }
            }
          }

          allDays.push({
            date: dayDate,
            dateStr,
            dayOfWeek: dayDate.getDay(),
            status: dayStatus,
            workAchievements,
            hasAchievements,
          });
        }

        // Group days into weeks for the month view
        const weeks: WeekData[] = [];
        let currentWeek: DayData[] = [];
        let weekOfMonth = 0;

        // Add empty days at the start for proper calendar alignment
        const firstDayOfWeek = allDays[0]?.dayOfWeek || 0;
        for (let i = 0; i < firstDayOfWeek; i++) {
          currentWeek.push(null as any);
        }

        allDays.forEach((day) => {
          currentWeek.push(day);

          // Week ends on Saturday (day 6)
          if (day.dayOfWeek === 6 || day === allDays[allDays.length - 1]) {
            weeks.push({
              weekOfMonth,
              days: [...currentWeek],
            });
            currentWeek = [];
            weekOfMonth++;
          }
        });

        months.push({
          year: yearNum,
          month: m,
          monthName,
          weeks,
          allDays,
        });
      }

      years.push({
        year: yearNum,
        months,
      });
    }

    return years;
  }, [profile, works, today, todayStr, currentYear, currentMonth, getWorkAchievementsForDate]);

  const selectedYearData = useMemo(() => {
    return yearData.find(y => y.year === selectedYear);
  }, [yearData, selectedYear]);

  // Handlers
  const handleYearPress = useCallback((year: YearData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedYear(year.year);
    setZoomLevel('month');
  }, []);

  const handleMonthPress = useCallback((month: MonthData) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedMonth(month);
    setZoomLevel('week');
  }, []);

  const handleDayPress = useCallback((day: DayData) => {
    if (day.status !== 'future') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      setSelectedDay(day);
    }
  }, []);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (zoomLevel === 'week') {
      setZoomLevel('month');
      setTimeout(() => setSelectedMonth(null), 50);
    } else if (zoomLevel === 'month') {
      setZoomLevel('year');
      setTimeout(() => setSelectedYear(null), 50);
    }
  }, [zoomLevel]);

  const handleCloseDay = useCallback(() => {
    setSelectedDay(null);
  }, []);

  // Calculate the row index for the current year
  const currentYearRowIndex = useMemo(() => {
    if (!profile) return 0;
    const birthYear = new Date(profile.birthday).getFullYear();
    const yearIndex = yearData.findIndex(y => y.year === currentYear);
    return Math.floor(yearIndex / 3);
  }, [profile, yearData, currentYear]);

  // Calculate the index for current month in month list
  const currentMonthIndex = useMemo(() => {
    if (!selectedYearData) return 0;
    return selectedYearData.months.findIndex(m => m.month === currentMonth);
  }, [selectedYearData, currentMonth]);

  // Auto-scroll to current year on initial render
  useEffect(() => {
    if (zoomLevel === 'year' && profile && !hasInitialScrolledYear.current && yearData.length > 0) {
      // Small delay to ensure layout is complete
      const timer = setTimeout(() => {
        const rowHeight = 76; // Approximate height of each row (including margin)
        // Subtract a small offset to keep current year more visible (not at the very top)
        const scrollPosition = Math.max(0, (currentYearRowIndex * rowHeight) - 40);
        yearScrollRef.current?.scrollTo({ y: scrollPosition, animated: true });
        hasInitialScrolledYear.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [zoomLevel, profile, yearData.length, currentYearRowIndex]);

  // Auto-scroll to current month when entering month view for current year
  useEffect(() => {
    if (zoomLevel === 'month' && selectedYear === currentYear && !hasInitialScrolledMonth.current && selectedYearData) {
      // Reset for new year selections
      const timer = setTimeout(() => {
        const monthTileHeight = 72; // Approximate height of each month tile
        const scrollPosition = currentMonthIndex * monthTileHeight;
        monthScrollRef.current?.scrollTo({ y: scrollPosition, animated: true });
        hasInitialScrolledMonth.current = true;
      }, 300);
      return () => clearTimeout(timer);
    }
    // Reset flag when going back to year view
    if (zoomLevel === 'year') {
      hasInitialScrolledMonth.current = false;
    }
  }, [zoomLevel, selectedYear, currentYear, currentMonthIndex, selectedYearData]);

  // Show/hide floating button based on zoom level
  useEffect(() => {
    if (zoomLevel === 'year' || zoomLevel === 'month') {
      floatingButtonOpacity.value = withTiming(1, { duration: 300 });
      floatingButtonScale.value = withSpring(1, { damping: 12 });
    } else {
      floatingButtonOpacity.value = withTiming(0, { duration: 200 });
      floatingButtonScale.value = withTiming(0.8, { duration: 200 });
    }
  }, [zoomLevel, floatingButtonOpacity, floatingButtonScale]);

  // Zoom to day button handler - goes to current month's week view
  const handleZoomToDay = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Animate the button
    zoomButtonScale.value = withSpring(0.9, { damping: 10 }, () => {
      zoomButtonScale.value = withSpring(1, { damping: 10 });
    });
    zoomButtonRotation.value = withTiming(360, { duration: 500, easing: Easing.out(Easing.cubic) }, () => {
      zoomButtonRotation.value = 0;
    });

    // Find current year and month data
    const currentYearData = yearData.find(y => y.year === currentYear);
    if (!currentYearData) return;

    const currentMonthData = currentYearData.months.find(m => m.month === currentMonth);
    if (!currentMonthData) return;

    // Navigate to the week view with animation
    setSelectedYear(currentYear);
    setSelectedMonth(currentMonthData);
    setZoomLevel('week');
  }, [yearData, currentYear, currentMonth, zoomButtonScale, zoomButtonRotation]);

  // Scroll to current handler for floating button
  const handleScrollToCurrent = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (zoomLevel === 'year') {
      const rowHeight = 76;
      // Subtract offset to keep current year more visible
      const scrollPosition = Math.max(0, (currentYearRowIndex * rowHeight) - 40);
      yearScrollRef.current?.scrollTo({ y: scrollPosition, animated: true });
    } else if (zoomLevel === 'month') {
      const monthTileHeight = 72;
      const scrollPosition = currentMonthIndex * monthTileHeight;
      monthScrollRef.current?.scrollTo({ y: scrollPosition, animated: true });
    }
  }, [zoomLevel, currentYearRowIndex, currentMonthIndex]);

  // Animated styles
  const zoomButtonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: zoomButtonScale.value },
      { rotate: `${zoomButtonRotation.value}deg` },
    ],
  }));

  const floatingButtonAnimatedStyle = useAnimatedStyle(() => ({
    opacity: floatingButtonOpacity.value,
    transform: [{ scale: floatingButtonScale.value }],
  }));

  // Get title based on zoom level
  const getTitle = () => {
    if (zoomLevel === 'year') return 'Your Life';
    if (zoomLevel === 'month' && selectedYear) return `${selectedYear}`;
    if (zoomLevel === 'week' && selectedMonth) {
      return `${selectedMonth.monthName} ${selectedMonth.year}`;
    }
    return 'Your Life';
  };

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1" edges={['top']}>
        {/* Header */}
        <View className="px-6 pt-4 pb-3">
          <View className="flex-row items-center justify-between mb-1">
            <View className="flex-row items-center">
              {zoomLevel !== 'year' && (
                <Pressable onPress={handleBack} className="mr-3 p-1">
                  <ChevronLeft size={24} color="#F59E0B" />
                </Pressable>
              )}
              <Calendar size={22} color="#F59E0B" />
              <Text className="text-white text-xl font-bold ml-2">{getTitle()}</Text>
            </View>

            {/* Zoom to Day Button */}
            <Animated.View style={zoomButtonAnimatedStyle}>
              <Pressable
                onPress={handleZoomToDay}
                className="bg-amber-500/20 p-2.5 rounded-xl border border-amber-500/30"
              >
                <ZoomIn size={20} color="#F59E0B" />
              </Pressable>
            </Animated.View>
          </View>
          <Text className="text-gray-400 text-xs">
            {zoomLevel === 'year' && 'Select a year to view months'}
            {zoomLevel === 'month' && 'Select a month to view calendar'}
            {zoomLevel === 'week' && 'Tap any day to view achievements'}
          </Text>
        </View>

        {/* Life Progress Bar */}
        <View className="mx-6 mb-6">
          <View className="bg-[#1A1A1A] rounded-3xl p-5 border border-gray-800 overflow-hidden">
            {/* Progress bar background with gradient */}
            <View className="h-8 bg-gray-900 rounded-full overflow-hidden mb-4 border border-gray-700">
              {/* Lived portion - dramatic gradient */}
              <LinearGradient
                colors={['#EF4444', '#DC2626', '#7F1D1D']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  width: `${percentLived}%` as any,
                  height: '100%',
                  position: 'absolute',
                  left: 0,
                }}
              />
              {/* Remaining portion - hopeful gradient */}
              <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={{
                  width: `${100 - parseFloat(percentLived)}%` as any,
                  height: '100%',
                  position: 'absolute',
                  right: 0,
                }}
              />
              {/* Divider line */}
              <View
                style={{
                  position: 'absolute',
                  height: '100%',
                  width: 2,
                  backgroundColor: '#fff',
                  left: `${percentLived}%` as any,
                }}
              />
            </View>

            {/* Labels */}
            <View className="flex-row justify-between items-center mb-3">
              <View className="flex-1">
                <Text className="text-red-400 text-xs font-semibold uppercase tracking-wider">
                  Gone Forever
                </Text>
                <Text className="text-white text-2xl font-bold mt-1">
                  {percentLived}%
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {daysLived.toLocaleString()} days
                </Text>
              </View>
              <View className="flex-1 items-end">
                <Text className="text-green-400 text-xs font-semibold uppercase tracking-wider">
                  Still Possible
                </Text>
                <Text className="text-white text-2xl font-bold mt-1">
                  {(100 - parseFloat(percentLived)).toFixed(1)}%
                </Text>
                <Text className="text-gray-500 text-xs mt-0.5">
                  {(totalDays - daysLived).toLocaleString()} days
                </Text>
              </View>
            </View>

            {/* Motivational message */}
            <View className="pt-3 border-t border-gray-800">
              <Text className="text-amber-400 text-center text-sm font-semibold">
                {parseFloat(percentLived) < 25
                  ? "Your life is just beginning. Make every day count."
                  : parseFloat(percentLived) < 50
                  ? "You're in your prime. Don't let this time slip away."
                  : parseFloat(percentLived) < 75
                  ? "Time is running faster. What will you do with what's left?"
                  : "The hourglass is nearly empty. Make these days legendary."}
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="flex-row mx-6 mb-3">
          <View className="flex-1 bg-[#1A1A1A] rounded-xl p-3 mr-2 border border-gray-800">
            <Text className="text-gray-500 text-xs uppercase">Days Lived</Text>
            <Text className="text-white text-xl font-bold">{daysLived.toLocaleString()}</Text>
          </View>
          <View className="flex-1 bg-[#1A1A1A] rounded-xl p-3 ml-2 border border-gray-800">
            <Text className="text-gray-500 text-xs uppercase">Life Used</Text>
            <Text className="text-amber-500 text-xl font-bold">{percentLived}%</Text>
          </View>
        </View>

        {/* Legend */}
        <View className="flex-row justify-center mx-6 mb-3 flex-wrap">
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-sm bg-amber-500 mr-1" />
            <Text className="text-gray-400 text-xs">Today</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-sm bg-green-500 mr-1" />
            <Text className="text-gray-400 text-xs">Productive</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-sm bg-red-500 mr-1" />
            <Text className="text-gray-400 text-xs">Wasted</Text>
          </View>
          <View className="flex-row items-center mr-3 mb-1">
            <View className="w-2.5 h-2.5 rounded-sm bg-gray-600 mr-1" />
            <Text className="text-gray-400 text-xs">Past</Text>
          </View>
          <View className="flex-row items-center mb-1">
            <View className="w-2.5 h-2.5 rounded-sm bg-gray-800 mr-1" />
            <Text className="text-gray-400 text-xs">Future</Text>
          </View>
        </View>

        {/* Loading State */}
        {isLoading && (
          <View className="flex-1 items-center justify-center px-6">
            <Text className="text-gray-400 text-center">Loading your calendar...</Text>
          </View>
        )}

        {/* No Profile State */}
        {!isLoading && !profile && (
          <ScrollView
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 40 }}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing || isRefetching}
                onRefresh={onRefresh}
                tintColor="#F59E0B"
                colors={['#F59E0B']}
              />
            }
          >
            <View className="items-center justify-center">
              <Calendar size={48} color="#666" />
              <Text className="text-white text-xl font-bold mt-4 mb-2 text-center">
                No Profile Found
              </Text>
              <Text className="text-gray-400 text-center mb-6">
                Pull down to refresh and load your calendar
              </Text>
            </View>
          </ScrollView>
        )}

        {/* YEAR VIEW - Grid of all years (3 per row) */}
        {zoomLevel === 'year' && profile && (
          <ScrollView
            ref={yearScrollRef}
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing || isRefetching}
                onRefresh={onRefresh}
                tintColor="#F59E0B"
                colors={['#F59E0B']}
              />
            }
          >
            {yearData.reduce((rows: YearData[][], year, index) => {
              if (index % 3 === 0) rows.push([]);
              rows[rows.length - 1].push(year);
              return rows;
            }, []).map((row, rowIndex) => {
              const birthYear = new Date(profile.birthday).getFullYear();
              return (
                <View key={rowIndex} className="flex-row justify-between mb-4">
                  {row.map((year) => {
                    const hasData = year.months.some(m =>
                      m.allDays.some(d => d.hasAchievements)
                    );
                    const isPastYear = year.year < birthYear;
                    const isFutureYear = year.year > currentYear;

                    return (
                      <YearTileComponent
                        key={year.year}
                        year={year.year}
                        isCurrentYear={year.year === currentYear}
                        isPastYear={isPastYear}
                        isFutureYear={isFutureYear}
                        onPress={() => handleYearPress(year)}
                        hasData={hasData}
                      />
                    );
                  })}
                  {/* Add empty placeholders if row has less than 3 items */}
                  {row.length < 3 && [...Array(3 - row.length)].map((_, i) => (
                    <View
                      key={`placeholder-${rowIndex}-${i}`}
                      style={{ width: (SCREEN_WIDTH - 48 - 16) / 3 }}
                    />
                  ))}
                </View>
              );
            })}
          </ScrollView>
        )}

        {/* MONTH VIEW - List of 12 months */}
        {zoomLevel === 'month' && selectedYearData && (
          <ScrollView
            ref={monthScrollRef}
            className="flex-1 px-6"
            contentContainerStyle={{ paddingBottom: 100 }}
            showsVerticalScrollIndicator={false}
            removeClippedSubviews={true}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing || isRefetching}
                onRefresh={onRefresh}
                tintColor="#F59E0B"
                colors={['#F59E0B']}
              />
            }
          >
            {selectedYearData.months.map((month) => {
              const productiveDays = month.allDays.filter(
                d => d.hasAchievements
              ).length;
              const livedDays = month.allDays.filter(
                d => d.status !== 'future'
              ).length;
              const isCurrentMonth =
                month.year === currentYear && month.month === currentMonth;

              return (
                <MonthTileComponent
                  key={`${month.year}-${month.month}`}
                  month={month}
                  isCurrentMonth={isCurrentMonth}
                  onPress={() => handleMonthPress(month)}
                  productiveDays={productiveDays}
                  totalDays={livedDays}
                />
              );
            })}
          </ScrollView>
        )}

        {/* WEEK VIEW - Calendar grid of the month */}
        {zoomLevel === 'week' && selectedMonth && (
          <ScrollView
            className="flex-1 px-6"
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
            {/* Day headers */}
            <View className="flex-row mb-2">
              {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, idx) => (
                <View
                  key={idx}
                  style={{ width: (SCREEN_WIDTH - 48) / 7 }}
                  className="items-center"
                >
                  <Text className="text-gray-500 text-xs font-semibold">{day}</Text>
                </View>
              ))}
            </View>

            {/* Calendar grid */}
            {selectedMonth.weeks.map((week, weekIdx) => (
              <View key={weekIdx} className="flex-row">
                {week.days.map((day, dayIdx) => (
                  <DayCellComponent
                    key={dayIdx}
                    day={day || null}
                    onPress={() => day && handleDayPress(day)}
                  />
                ))}
              </View>
            ))}

            {/* Quick stats for the month */}
            <View className="bg-[#1A1A1A] rounded-2xl p-4 mt-4 border border-gray-800">
              <Text className="text-white font-semibold mb-2">Month Summary</Text>
              <Text className="text-gray-400 text-sm">
                Productive days:{' '}
                {selectedMonth.allDays.filter(d => d.hasAchievements).length}
              </Text>
              <Text className="text-gray-400 text-sm">
                Total achievements:{' '}
                {selectedMonth.allDays.reduce((total, d) =>
                  total + d.workAchievements.reduce((sum, g) => sum + g.achievements.length, 0), 0
                )}
              </Text>
            </View>
          </ScrollView>
        )}

        {/* Floating Scroll to Current Button */}
        {(zoomLevel === 'year' || zoomLevel === 'month') && (
          <Animated.View
            style={[
              {
                position: 'absolute',
                bottom: 24,
                right: 24,
              },
              floatingButtonAnimatedStyle,
            ]}
          >
            <Pressable
              onPress={handleScrollToCurrent}
              className="bg-amber-500 w-14 h-14 rounded-full items-center justify-center shadow-lg"
              style={{
                shadowColor: '#F59E0B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 8,
              }}
            >
              <ArrowDown size={24} color="#0D0D0D" />
            </Pressable>
          </Animated.View>
        )}
      </SafeAreaView>

      {/* Day Detail Modal */}
      <Modal
        visible={selectedDay !== null}
        animationType="slide"
        transparent
        onRequestClose={handleCloseDay}
      >
        <TouchableWithoutFeedback onPress={handleCloseDay}>
          <View className="flex-1 bg-black/60" />
        </TouchableWithoutFeedback>
        <View className="absolute bottom-0 left-0 right-0 bg-[#1A1A1A] rounded-t-3xl p-6 max-h-[70%]">
          <View className="flex-row justify-between items-center mb-4">
            <View>
              <Text className="text-white text-2xl font-bold">
                {selectedDay?.date.toLocaleDateString('en-US', {
                  weekday: 'long',
                })}
              </Text>
              <Text className="text-gray-400 text-sm">
                {selectedDay?.date.toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </Text>
            </View>
            <Pressable onPress={handleCloseDay}>
              <X size={24} color="#666" />
            </Pressable>
          </View>

          {/* Day status indicator */}
          <View
            className={`rounded-2xl p-4 mb-4 ${
              selectedDay?.status === 'productive'
                ? 'bg-green-500/20 border border-green-500/30'
                : selectedDay?.status === 'today'
                ? 'bg-amber-500/20 border border-amber-500/30'
                : selectedDay?.status === 'wasted'
                ? 'bg-red-500/20 border border-red-500/30'
                : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <Text
              className={`text-center font-semibold ${
                selectedDay?.status === 'productive'
                  ? 'text-green-400'
                  : selectedDay?.status === 'today'
                  ? 'text-amber-400'
                  : selectedDay?.status === 'wasted'
                  ? 'text-red-400'
                  : 'text-gray-400'
              }`}
            >
              {selectedDay?.status === 'productive'
                ? 'Productive Day'
                : selectedDay?.status === 'today'
                ? 'Today'
                : selectedDay?.status === 'wasted'
                ? 'Wasted Day'
                : 'Day Lived'}
            </Text>
          </View>

          {/* Work Achievements */}
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedDay?.workAchievements && selectedDay.workAchievements.length > 0 ? (
              <View className="mb-4">
                <Text className="text-white font-semibold mb-3">Achievements</Text>
                {selectedDay.workAchievements.map((group, groupIdx) => (
                  <View key={groupIdx} className="mb-4">
                    <View className="flex-row items-center mb-2">
                      <View
                        className="w-3 h-3 rounded-full mr-2"
                        style={{ backgroundColor: group.workColor }}
                      />
                      <Text className="text-gray-300 font-semibold">{group.workName}</Text>
                    </View>
                    {group.achievements.map((achievement) => (
                      <View key={achievement.id} className="flex-row items-start mb-2 ml-5">
                        <Check size={14} color={group.workColor} />
                        <Text className="text-white ml-2 flex-1 text-sm">{achievement.text}</Text>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            ) : (
              <View className="bg-gray-800/50 rounded-2xl p-4 mb-4">
                <Text className="text-gray-500 text-center">
                  No achievements recorded for this day
                </Text>
              </View>
            )}
          </ScrollView>

          <SafeAreaView edges={['bottom']} />
        </View>
      </Modal>
    </View>
  );
}
