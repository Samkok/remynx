import React, { memo, useEffect, useCallback } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  withRepeat,
  withSequence,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Sparkles, Rocket, Sun, Heart } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface WelcomeFirstDayPopupProps {
  visible: boolean;
  onDismiss: () => void;
  userName: string;
}

const WelcomeFirstDayPopupComponent: React.FC<WelcomeFirstDayPopupProps> = ({
  visible,
  onDismiss,
  userName,
}) => {
  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const iconRotate = useSharedValue(0);
  const pulseScale = useSharedValue(1);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);
  const sparkleRotate = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Success haptic feedback for welcome
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      overlayOpacity.value = withTiming(1, { duration: 400 });
      contentScale.value = withSpring(1, { damping: 10, stiffness: 80 });
      contentOpacity.value = withTiming(1, { duration: 400 });

      // Icon animation - bounce in
      iconScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
      iconRotate.value = withDelay(
        300,
        withRepeat(
          withSequence(
            withTiming(5, { duration: 500 }),
            withTiming(-5, { duration: 500 })
          ),
          -1,
          true
        )
      );

      // Sparkle rotation
      sparkleRotate.value = withRepeat(
        withTiming(360, { duration: 3000 }),
        -1,
        false
      );

      // Pulse effect
      pulseScale.value = withDelay(
        500,
        withRepeat(
          withSequence(
            withTiming(1.08, { duration: 1000 }),
            withTiming(1, { duration: 1000 })
          ),
          -1,
          true
        )
      );

      // Text fade in
      textOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

      // Button fade in
      buttonOpacity.value = withDelay(900, withTiming(1, { duration: 400 }));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      contentScale.value = withTiming(0.8, { duration: 200 });
      contentOpacity.value = withTiming(0, { duration: 200 });
      iconScale.value = 0;
      textOpacity.value = 0;
      buttonOpacity.value = 0;
    }
  }, [visible, overlayOpacity, contentScale, contentOpacity, iconScale, iconRotate, pulseScale, textOpacity, buttonOpacity, sparkleRotate]);

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

  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sparkleRotate.value}deg` }],
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
        {/* Pulsing amber glow */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 300,
              height: 300,
              borderRadius: 150,
            },
            pulseStyle,
          ]}
        >
          <LinearGradient
            colors={['#F59E0B40', '#F59E0B00']}
            style={{
              width: 300,
              height: 300,
              borderRadius: 150,
            }}
          />
        </Animated.View>

        {/* Rotating sparkles */}
        <Animated.View
          style={[
            {
              position: 'absolute',
              width: 240,
              height: 240,
            },
            sparkleStyle,
          ]}
        >
          <View style={{ position: 'absolute', top: 0, left: '50%', marginLeft: -12 }}>
            <Sparkles size={24} color="#F59E0B" />
          </View>
          <View style={{ position: 'absolute', bottom: 0, left: '50%', marginLeft: -12 }}>
            <Sparkles size={24} color="#F59E0B" />
          </View>
          <View style={{ position: 'absolute', left: 0, top: '50%', marginTop: -12 }}>
            <Sparkles size={24} color="#F59E0B" />
          </View>
          <View style={{ position: 'absolute', right: 0, top: '50%', marginTop: -12 }}>
            <Sparkles size={24} color="#F59E0B" />
          </View>
        </Animated.View>

        {/* Icon */}
        <Animated.View style={iconStyle} className="mb-8">
          <View className="bg-amber-500/20 p-6 rounded-full border-2 border-amber-500/50">
            <Sun size={80} color="#F59E0B" strokeWidth={2} />
          </View>
        </Animated.View>

        {/* Text content */}
        <Animated.View style={textStyle} className="items-center">
          <Text className="text-4xl font-bold text-amber-500 text-center mb-4">
            Welcome, {userName}!
          </Text>

          <Text className="text-2xl font-semibold text-white text-center mb-6">
            Today is Day One
          </Text>

          <View className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-6 mb-6">
            <View className="flex-row items-center justify-center mb-3">
              <Heart size={24} color="#F59E0B" fill="#F59E0B" />
              <Text className="text-amber-400 font-bold text-lg ml-2">A Fresh Start</Text>
            </View>
            <Text className="text-gray-300 text-center text-base leading-6">
              What's gone is gone. Yesterday doesn't exist anymore.{'\n'}
              Today is the first day of your new chapter.
            </Text>
          </View>

          <View className="flex-row items-center mb-4">
            <Rocket size={24} color="#F59E0B" />
            <Text className="text-white text-center text-lg font-semibold ml-2">
              Your journey begins now
            </Text>
          </View>

          <Text className="text-gray-400 text-center text-base px-4 leading-6">
            Every achievement you log from today forward{'\n'}
            builds your streak and shapes your future.
          </Text>

          <Text className="text-amber-400 text-center text-lg font-semibold mt-6">
            Make today count!
          </Text>
        </Animated.View>

        {/* Action button */}
        <Animated.View style={buttonStyle} className="mt-10 w-full">
          <Pressable onPress={handleDismiss}>
            <LinearGradient
              colors={['#F59E0B', '#D97706']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                borderWidth: 1,
                borderColor: '#F59E0B',
              }}
            >
              <Text className="text-black text-lg font-bold">
                Let's Begin!
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export const WelcomeFirstDayPopup = memo(WelcomeFirstDayPopupComponent);
