import React, { memo, useMemo } from 'react';
import { View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useWorksStore } from '@/lib/state/works-store';
import { useDayChange } from '@/lib/providers/DayChangeProvider';

interface WorksProgressBarProps {
  className?: string;
}

const WorksProgressBarComponent: React.FC<WorksProgressBarProps> = ({ className }) => {
  const works = useWorksStore((s) => s.works);

  // Use currentDate from DayChangeProvider to ensure UI updates on day change
  const { currentDate } = useDayChange();
  const today = useMemo(() => {
    console.log('[WorksProgressBar] 📅 Current date:', currentDate);
    return currentDate;
  }, [currentDate]);

  // Calculate stats using only active works (not skipped)
  const stats = useMemo(() => {
    // Filter to active works only
    const activeWorks = works.filter((w) => {
      if (!w.skipType) return true;
      if (w.skipType === 'indefinite') return false;
      if (w.skipType === 'tomorrow' && w.skipDate && w.skipDate <= today) return false;
      return true;
    });

    if (activeWorks.length === 0) {
      return { fulfilled: 0, total: 0, percentage: 0 };
    }

    const fulfilled = activeWorks.filter((w) => {
      const achievements = w.achievements[today] || [];
      return achievements.length > 0;
    }).length;

    const result = {
      fulfilled,
      total: activeWorks.length,
      percentage: (fulfilled / activeWorks.length) * 100,
    };

    console.log('[WorksProgressBar] 📊 Stats calculated:', result, 'for date:', today);

    return result;
  }, [works, today]);

  const progressWidth = useSharedValue(stats.percentage);

  // Update animation when percentage changes
  React.useEffect(() => {
    progressWidth.value = withSpring(stats.percentage, {
      damping: 15,
      stiffness: 100,
    });
  }, [stats.percentage, progressWidth]);

  const animatedStyle = useAnimatedStyle(() => ({
    width: `${progressWidth.value}%`,
  }));

  // Get color based on percentage
  const getGradientColors = useMemo((): [string, string] => {
    if (stats.percentage >= 100) {
      return ['#10B981', '#059669']; // Green
    } else if (stats.percentage >= 40) {
      return ['#F59E0B', '#D97706']; // Yellow/Amber
    } else {
      return ['#EF4444', '#DC2626']; // Red
    }
  }, [stats.percentage]);

  if (stats.total === 0) {
    return null;
  }

  return (
    <View className={className}>
      {/* Label */}
      <View className="flex-row justify-between items-center mb-2">
        <Text className="text-gray-400 text-sm uppercase tracking-wider">
          Today's Progress
        </Text>
        <Text
          className="text-sm font-semibold"
          style={{
            color:
              stats.percentage >= 100
                ? '#10B981'
                : stats.percentage >= 40
                ? '#F59E0B'
                : '#EF4444',
          }}
        >
          {stats.fulfilled}/{stats.total} fulfilled
        </Text>
      </View>

      {/* Progress Bar */}
      <View className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <Animated.View style={animatedStyle}>
          <LinearGradient
            colors={getGradientColors}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{
              height: 12,
              borderRadius: 6,
            }}
          />
        </Animated.View>
      </View>
    </View>
  );
};

export const WorksProgressBar = memo(WorksProgressBarComponent);
