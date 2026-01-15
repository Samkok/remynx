import { View, Text, TextInput, Pressable, Alert } from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function Auth() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const isSignUp = params.mode === 'signup';

  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleAuth = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (isSignUp) {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        Alert.alert('Success', 'Account created! Please sign in.', [
          { text: 'OK', onPress: () => router.replace('/auth') }
        ]);
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (signInError) throw signInError;

        router.replace('/home');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View className="flex-1 bg-white px-6 justify-center">
      <View className="w-full max-w-md mx-auto">
        <Text className="text-3xl font-bold text-gray-900 mb-2">
          {isSignUp ? 'Create Account' : 'Sign In'}
        </Text>
        <Text className="text-gray-600 mb-8">
          {isSignUp
            ? 'Sign up to get started'
            : 'Welcome back! Please sign in'}
        </Text>

        <View className="mb-4">
          <Text className="text-sm font-medium text-gray-700 mb-2">Email</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder="your@email.com"
            keyboardType="email-address"
            autoCapitalize="none"
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          />
        </View>

        <View className="mb-6">
          <Text className="text-sm font-medium text-gray-700 mb-2">Password</Text>
          <TextInput
            value={password}
            onChangeText={setPassword}
            placeholder="••••••••"
            secureTextEntry
            className="border border-gray-300 rounded-lg px-4 py-3 text-base"
          />
        </View>

        {error ? (
          <Text className="text-red-600 mb-4 text-sm">{error}</Text>
        ) : null}

        <Pressable
          onPress={handleAuth}
          disabled={loading}
          className={`rounded-xl py-4 mb-4 ${loading ? 'bg-blue-400' : 'bg-blue-600 active:opacity-80'}`}
        >
          <Text className="text-white text-center text-lg font-semibold">
            {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
          </Text>
        </Pressable>

        <Pressable
          onPress={() => router.back()}
          className="py-2 active:opacity-60"
        >
          <Text className="text-gray-600 text-center">
            Back
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
