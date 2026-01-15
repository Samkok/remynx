import { View, Text, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import type { User } from '@supabase/supabase-js';

export default function Home() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error fetching user:', error);
        router.replace('/');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, []);

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      router.replace('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <View className="flex-1 bg-white items-center justify-center">
        <Text className="text-lg">Loading...</Text>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <View className="w-full max-w-md mx-auto">
        <Text className="text-4xl font-bold text-gray-900 mb-2">
          Home
        </Text>
        <Text className="text-lg text-gray-600 mb-8">
          Welcome, {user?.email}!
        </Text>

        <View className="bg-gray-50 rounded-xl p-6 mb-8">
          <Text className="text-sm font-medium text-gray-500 mb-1">
            User ID
          </Text>
          <Text className="text-base text-gray-900 font-mono">
            {user?.id}
          </Text>
        </View>

        <Pressable
          onPress={handleSignOut}
          className="bg-red-600 rounded-xl py-4 active:opacity-80"
        >
          <Text className="text-white text-center text-lg font-semibold">
            Sign Out
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
