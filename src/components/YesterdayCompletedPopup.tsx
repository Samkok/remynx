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
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, TrendingUp, Zap, Award } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface YesterdayCompletedPopupProps {
  visible: boolean;
  onDismiss: () => void;
}

const YesterdayCompletedPopupComponent: React.FC<YesterdayCompletedPopupProps> = ({
  visible,
  onDismiss,
}) => {
  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const sparkle1Opacity = useSharedValue(0);
  const sparkle2Opacity = useSharedValue(0);
  const sparkle3Opacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Success haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      overlayOpacity.value = withTiming(1, { duration: 400 });
      contentScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      contentOpacity.value = withTiming(1, { duration: 400 });

      // Icon animation - pop and rotate
      iconScale.value = withDelay(200, withSpring(1, { damping: 10, stiffness: 120 }));
      iconRotate.value = withDelay(
        200,
        withSequence(
          withTiming(360, { duration: 600 }),
          withTiming(0, { duration: 0 })
        )
      );

      // Glow pulse effect
      glowScale.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1.1, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          true
        )
      );

      // Sparkles animation
      sparkle1Opacity.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0, { duration: 400 })
          ),
          -1,
          true
        )
      );
      sparkle2Opacity.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0, { duration: 400 })
          ),
          -1,
          true
        )
      );
      sparkle3Opacity.value = withDelay(
        700,
        withRepeat(
          withSequence(
            withTiming(1, { duration: 400 }),
            withTiming(0, { duration: 400 })
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
      sparkle1Opacity.value = 0;
      sparkle2Opacity.value = 0;
      sparkle3Opacity.value = 0;
    }
  }, [
    visible,
    overlayOpacity,
    contentScale,
    contentOpacity,
    iconScale,
    iconRotate,
    glowScale,
    textOpacity,
    buttonOpacity,
    sparkle1Opacity,
    sparkle2Opacity,
    sparkle3Opacity,
  ]);

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

  const glowStyle = useAnimatedStyle(() => ({
    transform: [{ scale: glowScale.value }],
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const sparkle1Style = useAnimatedStyle(() => ({
    opacity: sparkle1Opacity.value,
  }));

  const sparkle2Style = useAnimatedStyle(() => ({
    opacity: sparkle2Opacity.value,
  }));

  const sparkle3Style = useAnimatedStyle(() => ({
    opacity: sparkle3Opacity.value,
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
      {/* Dark overlay with subtle gradient */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
          },
          overlayStyle,
        ]}
      >
        <LinearGradient
          colors={['rgba(0, 0, 0, 0.92)', 'rgba(13, 13, 13, 0.95)', 'rgba(0, 0, 0, 0.92)']}
          style={{ flex: 1 }}
        />
      </Animated.View>

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
        {/* Glowing background */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: 150,
            },
            glowStyle,
          ]}
        >
          <LinearGradient
            colors={['#10B98140', '#059669 30', '#10B98100']}
            style={{
              width: 300,
              height: 300,
              borderRadius: 150,
            }}
          />
        </Animated.View>

        {/* Floating sparkles */}
        <Animated.View
          style={[
            sparkle1Style,
            { position: 'absolute', top: '25%', left: '15%' },
          ]}
        >
          <Sparkles size={32} color="#10B981" />
        </Animated.View>
        <Animated.View
          style={[
            sparkle2Style,
            { position: 'absolute', top: '30%', right: '15%' },
          ]}
        >
          <Sparkles size={24} color="#10B981" />
        </Animated.View>
        <Animated.View
          style={[
            sparkle3Style,
            { position: 'absolute', bottom: '35%', left: '20%' },
          ]}
        >
          <Sparkles size={28} color="#10B981" />
        </Animated.View>

        {/* Icon */}
        <Animated.View style={iconStyle} className="mb-8">
          <View className="bg-green-500/20 p-6 rounded-full border-2 border-green-500/50">
            <Award size={80} color="#10B981" strokeWidth={2.5} />
          </View>
        </Animated.View>

        {/* Text content */}
        <Animated.View style={textStyle} className="items-center">
          <Text className="text-5xl font-bold text-green-500 text-center mb-6">
            You're a Legend!
          </Text>

          <View className="flex-row items-center justify-center mb-6">
            <Zap size={32} color="#10B981" fill="#10B981" />
            <Text className="text-white text-center text-2xl font-bold mx-3">
              Yesterday Completed
            </Text>
            <Zap size={32} color="#10B981" fill="#10B981" />
          </View>

          <View className="bg-green-500/10 border border-green-500/30 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center mb-3">
              <TrendingUp size={24} color="#10B981" />
              <Text className="text-green-400 font-bold text-lg ml-2">
                You're Built Different
              </Text>
            </View>
            <Text className="text-gray-300 text-center text-base leading-6">
              While others made excuses, you took action.{'\n'}
              While others wasted time, you made progress.
            </Text>
          </View>

          <Text className="text-white text-center text-xl font-bold mb-3 px-4 leading-7">
            You're a man/woman of action, not words.
          </Text>

          <Text className="text-gray-300 text-center text-base px-4 leading-6 mb-4">
            Most people talk about their goals.{'\n'}
            You're out here actually achieving them.
          </Text>

          <View className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4">
            <Text className="text-amber-400 text-center text-lg font-bold">
              Now let's make today even better.
            </Text>
          </View>
        </Animated.View>

        {/* Action button */}
        <Animated.View style={buttonStyle} className="mt-10 w-full">
          <Pressable onPress={handleDismiss}>
            <LinearGradient
              colors={['#10B981', '#059669']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#10B981',
              }}
            >
              <Text className="text-white text-lg font-bold">
                Let's Keep Going
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export const YesterdayCompletedPopup = memo(YesterdayCompletedPopupComponent);
