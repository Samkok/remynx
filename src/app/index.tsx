import { Redirect } from 'expo-router';
import { View } from 'react-native';
import { useLifeStore } from '@/lib/state/life-store';

export default function Index() {
  const profile = useLifeStore((s) => s.profile);
  const isOnboardingComplete = profile?.onboardingComplete ?? false;

  // Show empty view briefly to prevent navigation race conditions
  // This gives the navigator time to fully initialize
  if (typeof isOnboardingComplete !== 'boolean') {
    return <View className="flex-1 bg-[#0D0D0D]" />;
  }

  // Redirect based on auth status
  if (isOnboardingComplete) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/auth" />;
}
