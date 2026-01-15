import React, { useEffect, useCallback, memo } from 'react';
import { View, Text, Pressable, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withSequence,
  withDelay,
  withRepeat,
  runOnJS,
  Easing,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { Flame, X, Sparkles, Trophy } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width, height } = Dimensions.get('window');

interface StreakCelebrationProps {
  streakCount: number;
  onDismiss: () => void;
  visible: boolean;
}

interface ParticleProps {
  delay: number;
  startX: number;
  color: string;
}

const Particle = memo(function Particle({ delay, startX, color }: ParticleProps) {
  const translateY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(0);
  const scale = useSharedValue(0);
  const rotation = useSharedValue(0);

  useEffect(() => {
    const randomX = (Math.random() - 0.5) * 200;

    opacity.value = withDelay(delay, withSequence(
      withTiming(1, { duration: 200 }),
      withDelay(800, withTiming(0, { duration: 400 }))
    ));

    translateY.value = withDelay(delay, withTiming(-height * 0.4, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    }));

    translateX.value = withDelay(delay, withTiming(randomX, {
      duration: 1400,
      easing: Easing.out(Easing.cubic),
    }));

    scale.value = withDelay(delay, withSequence(
      withSpring(1, { damping: 8 }),
      withDelay(600, withTiming(0, { duration: 400 }))
    ));

    rotation.value = withDelay(delay, withTiming(Math.random() * 720 - 360, {
      duration: 1400,
    }));
  }, [delay, opacity, translateY, translateX, scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          bottom: height * 0.35,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
});

const FireEmoji = memo(function FireEmoji() {
  const scale = useSharedValue(0);
  const rotation = useSharedValue(-10);

  useEffect(() => {
    scale.value = withDelay(300, withSpring(1, { damping: 6, stiffness: 100 }));
    rotation.value = withDelay(300, withRepeat(
      withSequence(
        withTiming(10, { duration: 200 }),
        withTiming(-10, { duration: 200 })
      ),
      3,
      true
    ));
  }, [scale, rotation]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
  }));

  return (
    <Animated.View style={animatedStyle}>
      <View className="w-24 h-24 rounded-full bg-orange-500/20 items-center justify-center">
        <Flame size={64} color="#F97316" fill="#F97316" />
      </View>
    </Animated.View>
  );
});

export const StreakCelebration = memo(function StreakCelebration({
  streakCount,
  onDismiss,
  visible,
}: StreakCelebrationProps) {
  const containerOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.8);
  const textOpacity = useSharedValue(0);

  const triggerHaptics = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }, []);

  useEffect(() => {
    if (visible) {
      containerOpacity.value = withTiming(1, { duration: 300 });
      contentScale.value = withDelay(100, withSpring(1, { damping: 12 }));
      textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
      runOnJS(triggerHaptics)();
    } else {
      containerOpacity.value = withTiming(0, { duration: 200 });
      contentScale.value = withTiming(0.8, { duration: 200 });
      textOpacity.value = withTiming(0, { duration: 150 });
    }
  }, [visible, containerOpacity, contentScale, textOpacity, triggerHaptics]);

  const containerAnimatedStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const contentAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
  }));

  const textAnimatedStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    delay: Math.random() * 400,
    startX: width * 0.3 + Math.random() * width * 0.4,
    color: ['#F97316', '#FBBF24', '#EF4444', '#F59E0B', '#FCD34D'][Math.floor(Math.random() * 5)],
  }));

  const getMessage = () => {
    if (streakCount === 1) return "You've started your journey!";
    if (streakCount === 7) return "One week strong! Incredible!";
    if (streakCount === 14) return "Two weeks of dedication!";
    if (streakCount === 21) return "Three weeks! A habit is forming!";
    if (streakCount === 30) return "One month! You're unstoppable!";
    if (streakCount % 7 === 0) return `${streakCount / 7} weeks of consistency!`;
    return "Keep the momentum going!";
  };

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 100,
        },
        containerAnimatedStyle,
      ]}
    >
      {/* Backdrop */}
      <Pressable
        onPress={handleDismiss}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      >
        <LinearGradient
          colors={['rgba(0,0,0,0.9)', 'rgba(15,15,15,0.95)', 'rgba(0,0,0,0.9)']}
          style={{ flex: 1 }}
        />
      </Pressable>

      {/* Particles */}
      {particles.map((particle) => (
        <Particle
          key={particle.id}
          delay={particle.delay}
          startX={particle.startX}
          color={particle.color}
        />
      ))}

      {/* Content */}
      <Animated.View
        style={[
          {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            paddingHorizontal: 32,
          },
          contentAnimatedStyle,
        ]}
      >
        {/* Close button */}
        <Pressable
          onPress={handleDismiss}
          className="absolute top-16 right-6 p-2 bg-white/10 rounded-full"
        >
          <X size={24} color="rgba(255,255,255,0.6)" />
        </Pressable>

        {/* Fire Icon */}
        <FireEmoji />

        {/* Streak Count */}
        <Animated.View style={textAnimatedStyle} className="items-center mt-8">
          <View className="flex-row items-center mb-2">
            <Sparkles size={20} color="#FBBF24" />
            <Text className="text-amber-400 text-lg font-semibold mx-2">
              DAILY STREAK
            </Text>
            <Sparkles size={20} color="#FBBF24" />
          </View>

          <Text className="text-white text-7xl font-bold">
            {streakCount}
          </Text>
          <Text className="text-gray-400 text-lg mt-1">
            {streakCount === 1 ? 'day' : 'days'}
          </Text>
        </Animated.View>

        {/* Message */}
        <Animated.View style={textAnimatedStyle} className="mt-8">
          <Text className="text-white text-xl font-semibold text-center">
            {getMessage()}
          </Text>
          <Text className="text-gray-400 text-center mt-2">
            You logged an achievement today.{'\n'}Your future self thanks you.
          </Text>
        </Animated.View>

        {/* Continue Button */}
        <Animated.View style={textAnimatedStyle} className="mt-10 w-full">
          <Pressable onPress={handleDismiss}>
            <LinearGradient
              colors={['#F97316', '#EA580C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
              }}
            >
              <View className="flex-row items-center">
                <Trophy size={20} color="white" />
                <Text className="text-white text-lg font-bold ml-2">
                  Keep Going!
                </Text>
              </View>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
});
