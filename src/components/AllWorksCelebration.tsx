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
  runOnJS,
  interpolate,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Trophy, Star, Sparkles } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface AllWorksCelebrationProps {
  visible: boolean;
  onDismiss: () => void;
}

// Particle component for confetti effect
const ParticleComponent = ({ delay, startX }: { delay: number; startX: number }) => {
  const translateY = useSharedValue(-50);
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);
  const rotate = useSharedValue(0);
  const scale = useSharedValue(1);

  useEffect(() => {
    const randomXOffset = (Math.random() - 0.5) * 200;

    translateY.value = withDelay(
      delay,
      withTiming(SCREEN_HEIGHT + 100, { duration: 3000, easing: Easing.out(Easing.quad) })
    );
    translateX.value = withDelay(
      delay,
      withTiming(randomXOffset, { duration: 3000, easing: Easing.out(Easing.quad) })
    );
    opacity.value = withDelay(
      delay + 2000,
      withTiming(0, { duration: 1000 })
    );
    rotate.value = withDelay(
      delay,
      withRepeat(withTiming(360, { duration: 1000 }), -1, false)
    );
    scale.value = withDelay(delay, withSpring(1.2));
  }, [delay, translateY, translateX, opacity, rotate, scale]);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value },
      { translateX: translateX.value },
      { rotate: `${rotate.value}deg` },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));

  const colors = ['#10B981', '#F59E0B', '#3B82F6', '#EC4899', '#8B5CF6'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: 0,
          width: 12,
          height: 12,
          borderRadius: 6,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  );
};

const Particle = memo(ParticleComponent);

const AllWorksCelebrationComponent: React.FC<AllWorksCelebrationProps> = ({
  visible,
  onDismiss,
}) => {
  const overlayOpacity = useSharedValue(0);
  const contentScale = useSharedValue(0.5);
  const contentOpacity = useSharedValue(0);
  const trophyScale = useSharedValue(0);
  const trophyRotate = useSharedValue(-30);
  const glowOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);
  const buttonOpacity = useSharedValue(0);

  useEffect(() => {
    if (visible) {
      // Haptic feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Animate in
      overlayOpacity.value = withTiming(1, { duration: 300 });
      contentScale.value = withSpring(1, { damping: 12, stiffness: 100 });
      contentOpacity.value = withTiming(1, { duration: 300 });

      // Trophy animation
      trophyScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 100 }));
      trophyRotate.value = withDelay(
        200,
        withSequence(
          withSpring(15, { damping: 4, stiffness: 200 }),
          withSpring(0, { damping: 10, stiffness: 100 })
        )
      );

      // Glow pulse
      glowOpacity.value = withDelay(
        400,
        withRepeat(
          withSequence(
            withTiming(0.8, { duration: 1000 }),
            withTiming(0.4, { duration: 1000 })
          ),
          -1,
          true
        )
      );

      // Text fade in
      textOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));

      // Button fade in
      buttonOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));
    } else {
      overlayOpacity.value = withTiming(0, { duration: 200 });
      contentScale.value = withTiming(0.8, { duration: 200 });
      contentOpacity.value = withTiming(0, { duration: 200 });
      trophyScale.value = 0;
      textOpacity.value = 0;
      buttonOpacity.value = 0;
    }
  }, [visible, overlayOpacity, contentScale, contentOpacity, trophyScale, trophyRotate, glowOpacity, textOpacity, buttonOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const contentStyle = useAnimatedStyle(() => ({
    transform: [{ scale: contentScale.value }],
    opacity: contentOpacity.value,
  }));

  const trophyStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: trophyScale.value },
      { rotate: `${trophyRotate.value}deg` },
    ],
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    opacity: textOpacity.value,
  }));

  const buttonStyle = useAnimatedStyle(() => ({
    opacity: buttonOpacity.value,
  }));

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  if (!visible) return null;

  // Generate particles
  const particles = Array.from({ length: 30 }, (_, i) => ({
    id: i,
    delay: Math.random() * 500,
    startX: Math.random() * SCREEN_WIDTH,
  }));

  return (
    <View
      className="absolute inset-0 z-50"
      style={{ width: SCREEN_WIDTH, height: SCREEN_HEIGHT }}
      pointerEvents="box-none"
    >
      {/* Overlay */}
      <Animated.View
        style={[
          {
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.9)',
          },
          overlayStyle,
        ]}
      />

      {/* Particles */}
      {particles.map((particle) => (
        <Particle key={particle.id} delay={particle.delay} startX={particle.startX} />
      ))}

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
        {/* Glow effect */}
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
            colors={['#10B98150', '#10B98100']}
            style={{
              width: 300,
              height: 300,
              borderRadius: 150,
            }}
          />
        </Animated.View>

        {/* Trophy */}
        <Animated.View style={trophyStyle} className="mb-6">
          <View className="bg-emerald-500/20 p-6 rounded-full">
            <Trophy size={80} color="#10B981" />
          </View>
        </Animated.View>

        {/* Stars decoration */}
        <View className="flex-row absolute top-1/4">
          <Star size={20} color="#F59E0B" fill="#F59E0B" style={{ marginRight: 100 }} />
          <Sparkles size={24} color="#10B981" />
          <Star size={20} color="#F59E0B" fill="#F59E0B" style={{ marginLeft: 100 }} />
        </View>

        {/* Text */}
        <Animated.View style={textStyle} className="items-center">
          <Text className="text-4xl font-bold text-white text-center mb-4">
            Incredible!
          </Text>
          <Text className="text-emerald-400 text-xl font-semibold text-center mb-4">
            All Works Fulfilled!
          </Text>
          <Text className="text-gray-400 text-center text-base leading-6 px-4">
            Most people waste their days scrolling and procrastinating.
          </Text>
          <Text className="text-white text-center text-lg font-semibold mt-2">
            But not you.
          </Text>
          <Text className="text-emerald-400 text-center text-base mt-4">
            You showed up. You did the work.{'\n'}That's what separates the successful from the rest.
          </Text>
        </Animated.View>

        {/* Dismiss button */}
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
              }}
            >
              <Text className="text-white text-lg font-bold">
                Keep Going
              </Text>
            </LinearGradient>
          </Pressable>
        </Animated.View>
      </Animated.View>
    </View>
  );
};

export const AllWorksCelebration = memo(AllWorksCelebrationComponent);
