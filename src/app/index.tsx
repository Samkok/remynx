import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Index() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          router.replace('/home');
        }
      } catch (error) {
        console.error('Auth check error:', error);
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <View className="w-full max-w-md">
        <Text className="text-4xl font-bold text-gray-900 mb-2">
          Welcome
        </Text>
        <Text className="text-lg text-gray-600 mb-12">
          Get started with your account
        </Text>

        <Pressable
          onPress={() => router.push('/auth')}
          className="bg-blue-600 rounded-xl py-4 mb-4 active:opacity-80"
        >
          <Text className="text-white text-center text-lg font-semibold">
            Sign In
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.push('/auth?mode=signup')}
          className="bg-gray-100 rounded-xl py-4 active:opacity-80"
        >
          <Text className="text-gray-900 text-center text-lg font-semibold">
            Create Account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
