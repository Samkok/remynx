import React, { memo, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  Easing,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { AlertCircle, Clock, TrendingDown } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface DayWastedPopupProps {
  visible: boolean;
  onDismiss: () => void;
  daysWasted?: number;
}

const DayWastedPopupComponent: React.FC<DayWastedPopupProps> = ({
  visible,
  onDismiss,
  daysWasted = 1,
}) => {
  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Heavy haptic feedback for failure
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

      // Animate in
      overlayOpacity.value = withTiming(1, { duration: 400 });
      contentScale.value = withSpring(1, { damping: 10, stiffness: 80 });
      contentOpacity.value = withTiming(1, { duration: 400 });

      // Icon animation - shake effect
      iconScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
      iconRotate.value = withDelay(
        200,
        withSequence(
          withTiming(-10, { duration: 100 }),
          withTiming(10, { duration: 100 }),
          withTiming(-10, { duration: 100 }),
          withTiming(10, { duration: 100 }),
          withTiming(0, { duration: 100 })
        )
      );

      // Pulse effect
      pulseScale.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1.05, { duration: 800 }),
            withTiming(1, { duration: 800 })
          ),
          -1,
          true
        )
      );

      // Text fade in
      textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));

      // Button fade in
      buttonOpacity.value = withDelay(1000, withTiming(1, { duration: 400 }));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      contentScale.value = withTiming(0.8, { duration: 200 });
      contentOpacity.value = withTiming(0, { duration: 200 });
      iconScale.value = 0;
      textOpacity.value = 0;
      buttonOpacity.value = 0;
    }
  }, [visible, overlayOpacity, contentScale, contentOpacity, iconScale, iconRotate, pulseScale, textOpacity, buttonOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const iconStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: iconScale.value },
      { rotate: `${iconRotate.value}deg` },
    ],
  }));

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulseScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  return (
    <View
      className="absolute inset-0 z-50"
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
      pointerEvents="box-none"
    >
      {/* Dark overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.95)',
          },
          overlayStyle,
        ]}
      />

      {/* Content */}
      <Animated.View
        style={[
          {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            paddingHorizontal: 32,
          },
          contentStyle,
        ]}
      >
        {/* Pulsing red glow */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 280,
              height: 280,
              borderRadius: 140,
            },
            pulseStyle,
          ]}
        >
          <LinearGradient
            colors={['#EF444440', '#EF444400']}
            style={{
              width: 280,
              height: 280,
              borderRadius: 140,
            }}
          />
        </Animated.View>

        {/* Icon */}
        <Animated.View style={iconStyle} className="mb-8">
          <View className="bg-red-500/20 p-6 rounded-full border-2 border-red-500/50">
            <AlertCircle size={80} color="#EF4444" strokeWidth={2.5} />
          </View>
        </Animated.View>

        {/* Text content */}
        <Animated.View style={textStyle} className="items-center">
          <Text className="text-5xl font-bold text-red-500 text-center mb-6">
            You Wasted
          </Text>

          <View className="flex-row items-center mb-6">
            <Clock size={32} color="#EF4444" />
            <Text className="text-6xl font-bold text-white text-center mx-3">
              {daysWasted}
            </Text>
            <Text className="text-3xl font-semibold text-gray-400">
              {daysWasted === 1 ? 'Day' : 'Days'}
            </Text>
          </View>

          <View className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center mb-3">
              <TrendingDown size={24} color="#EF4444" />
              <Text className="text-red-400 font-bold text-lg ml-2">Reality Check</Text>
            </View>
            <Text className="text-gray-300 text-center text-base leading-6">
              Yesterday is gone. Those hours? Wasted.{'\n'}
              That momentum? Lost.
            </Text>
          </View>

          <Text className="text-white text-center text-xl font-bold mb-3 px-4 leading-7">
            No one is going to improve your life if you don't do it yourself.
          </Text>

          <Text className="text-gray-400 text-center text-base px-4 leading-6">
            Everyone else is moving forward while you stood still.{'\n'}
            Every day wasted is a day you'll never get back.
          </Text>

          <Text className="text-red-400 text-center text-lg font-semibold mt-6">
            Are you going to waste today too?
          </Text>
        </Animated.View>

        {/* Action button */}
        <Animated.View style={buttonStyle} className="mt-10 w-full">
          <Pressable onPress={handleDismiss}>
            <LinearGradient
              colors={['#DC2626', '#991B1B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#EF4444',
              }}
            >
              <Text className="text-white text-lg font-bold">
                No. I'll Do Better Today
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export const DayWastedPopup = memo(DayWastedPopupComponent);
