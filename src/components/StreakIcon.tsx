import React, { memo, useCallback, useEffect } from 'react';
import { View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { Flame, AlertCircle } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { BlurView } from 'expo-blur';

interface StreakIconProps {
  streakCount: number;
  isCompleted: boolean;
  onPress: () => void;
}

export const StreakIcon = memo(function StreakIcon({
  streakCount,
  isCompleted,
  onPress,
}: StreakIconProps) {
  const scale = useSharedValue(1);
  const flameScale = useSharedValue(1);
  const glowOpacity = useSharedValue(0.3);

  useEffect(() => {
    if (isCompleted) {
      // Animated flame effect for completed streak
      flameScale.value = withRepeat(
        withSequence(
          withTiming(1.1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      );

      glowOpacity.value = withRepeat(
        withSequence(
          withTiming(0.6, { duration: 800 }),
          withTiming(0.3, { duration: 800 })
        ),
        -1,
        true
      );
    } else {
      flameScale.value = 1;
      glowOpacity.value = 0;
    }
  }, [isCompleted, flameScale, glowOpacity]);

  const handlePressIn = useCallback(() => {
    scale.value = withSpring(0.9, { damping: 15 });
  }, [scale]);

  const handlePressOut = useCallback(() => {
    scale.value = withSpring(1, { damping: 15 });
  }, [scale]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onPress();
  }, [onPress]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const flameAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: flameScale.value }],
  }));

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <Pressable
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={containerAnimatedStyle}
        className="relative items-center justify-center"
      >
        {/* Glow effect for completed streak */}
        {isCompleted && (
          <Animated.View
            style={[
              glowAnimatedStyle,
              {
                position: 'absolute',
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: '#F97316',
                shadowColor: '#F97316',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 1,
                shadowRadius: 12,
              },
            ]}
          />
        )}

        {/* Main container */}
        <View
          className={`w-14 h-14 rounded-full items-center justify-center overflow-hidden ${
            isCompleted ? 'bg-orange-500/20' : 'bg-gray-800/50'
          }`}
        >
          {!isCompleted && (
            <BlurView
              intensity={20}
              tint="dark"
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                borderRadius: 28,
              }}
            />
          )}

          <Animated.View style={flameAnimatedStyle}>
            <Flame
              size={28}
              color={isCompleted ? '#F97316' : '#666'}
              fill={isCompleted ? '#F97316' : 'transparent'}
            />
          </Animated.View>

          {/* Exclamation mark overlay for incomplete */}
          {!isCompleted && (
            <View className="absolute -bottom-0.5 -right-0.5">
              <View className="bg-red-500 rounded-full p-0.5">
                <AlertCircle size={14} color="white" fill="#EF4444" />
              </View>
            </View>
          )}
        </View>

        {/* Streak count badge */}
        <View
          className={`absolute -bottom-1 px-2 py-0.5 rounded-full ${
            isCompleted ? 'bg-orange-500' : 'bg-gray-700'
          }`}
        >
          <Text
            className={`text-xs font-bold ${
              isCompleted ? 'text-white' : 'text-gray-400'
            }`}
          >
            {streakCount}
          </Text>
        </View>
      </Animated.View>
    </Pressable>
  );
});
