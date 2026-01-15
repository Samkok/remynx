import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  FadeInDown,
  FadeInUp,
} from 'react-native-reanimated';
import { useLifeStore, calculateDaysRemaining, getAge, formatDate } from '@/lib/state/life-store';
import { useStreakStore } from '@/lib/state/streak-store';
import { Clock, Skull, Sparkles, Mail, Lock, Check, Eye, EyeOff, ArrowLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { authClient } from '@/lib/authClient';
import { api } from '@/lib/api';
import { type CreateProfileResponse } from '@/shared/contracts';
import { useQueryClient } from '@tanstack/react-query';
import { profileKeys } from '@/lib/hooks/useApiData';

type AuthMode = 'signup' | 'signin';

export default function AuthScreen() {
  // Auth state - default to signin for returning users
  const [authMode, setAuthMode] = useState<AuthMode>('signin');
  const [step, setStep] = useState(4); // Start at step 4 (auth form) for sign-in

  const [name, setName] = useState('');
  const [birthday, setBirthday] = useState(new Date(2000, 0, 1));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setProfile = useLifeStore((s) => s.setProfile);
  const setRegistrationDate = useStreakStore((s) => s.setRegistrationDate);
  const queryClient = useQueryClient();

  const formattedBirthday = useMemo(() => birthday.toISOString().split('T')[0], [birthday]);
  const age = useMemo(() => getAge(formattedBirthday), [formattedBirthday]);
  const daysRemaining = useMemo(() => calculateDaysRemaining(formattedBirthday), [formattedBirthday]);

  const isEmailValid = useMemo(() => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }, [email]);

  const isPasswordValid = useMemo(() => password.length >= 8, [password]);

  const canProceedAuth = useMemo(() => {
    if (authMode === 'signup') {
      return isEmailValid && isPasswordValid && termsAccepted;
    }
    return isEmailValid && isPasswordValid;
  }, [authMode, isEmailValid, isPasswordValid, termsAccepted]);

  const handleContinue = useCallback(() => {
    if (step === 1 && name.trim()) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep(2);
    } else if (step === 2) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setStep(3);
    } else if (step === 3) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setStep(4);
    }
  }, [step, name]);

  const handleAuth = useCallback(async () => {
    if (!canProceedAuth) return;

    setIsLoading(true);
    setError(null);

    try {
      if (authMode === 'signup') {
        // Sign up
        console.log('[Auth] Starting signup process...');
        const result = await authClient.signUp.email({
          email,
          password,
          name: name.trim(),
        });

        console.log('[Auth] Signup result:', {
          hasData: !!result.data,
          hasError: !!result.error,
          errorMessage: result.error?.message
        });

        if (result.error) {
          setError(result.error.message || 'Failed to create account');
          return;
        }

        console.log('[Auth] Signup successful, creating profile...');

        // Create profile in database
        const profileResponse = await api.post<CreateProfileResponse>('/api/profile', {
          name: name.trim(),
          birthday: formattedBirthday,
          termsAccepted: true,
        });

        console.log('[Auth] Profile creation result:', {
          hasProfile: !!profileResponse.profile
        });

        if (profileResponse.profile) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Set registration date to today for new users
          setRegistrationDate(formatDate(new Date()));
          setProfile({
            name: name.trim(),
            birthday: formattedBirthday,
            onboardingComplete: true,
          });
          // Invalidate profile query to force refetch
          queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
          // Delay navigation slightly to ensure state updates
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 50);
        }
      } else {
        // Sign in
        const result = await authClient.signIn.email({
          email,
          password,
        });

        if (result.error) {
          setError(result.error.message || 'Invalid email or password');
          return;
        }

        // Fetch existing profile
        const profileResponse = await api.get<{ profile: { name: string; birthday: string } | null }>('/api/profile');

        if (profileResponse.profile) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setProfile({
            name: profileResponse.profile.name,
            birthday: profileResponse.profile.birthday,
            onboardingComplete: true,
          });
          // Invalidate profile query to force refetch with new session
          queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
          // Delay navigation slightly to ensure state updates
          setTimeout(() => {
            router.replace('/(tabs)');
          }, 50);
        } else {
          // User exists but no profile, create one
          const createProfileResponse = await api.post<CreateProfileResponse>('/api/profile', {
            name: name.trim() || 'User',
            birthday: formattedBirthday,
            termsAccepted: true,
          });

          if (createProfileResponse.profile) {
            setProfile({
              name: createProfileResponse.profile.name,
              birthday: createProfileResponse.profile.birthday,
              onboardingComplete: true,
            });
            // Invalidate profile query to force refetch
            queryClient.invalidateQueries({ queryKey: profileKeys.detail() });
            // Delay navigation slightly to ensure state updates
            setTimeout(() => {
              router.replace('/(tabs)');
            }, 50);
          }
        }
      }
    } catch (err) {
      console.error('Auth error:', err);
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [authMode, canProceedAuth, email, password, name, formattedBirthday, setProfile, setRegistrationDate, queryClient]);

  const onDateChange = useCallback((_: unknown, selectedDate?: Date) => {
    setShowDatePicker(Platform.OS === 'ios');
    if (selectedDate) {
      setBirthday(selectedDate);
    }
  }, []);

  const openTerms = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push('/terms');
  }, []);

  const toggleAuthMode = useCallback(() => {
    setAuthMode((prev) => (prev === 'signup' ? 'signin' : 'signup'));
    setError(null);
    // Reset to appropriate step
    if (authMode === 'signin') {
      // Switching to signup - start onboarding flow
      setStep(1);
    } else {
      // Switching to signin - go directly to auth form
      setStep(4);
    }
  }, [authMode]);

  const handleBack = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step === 1) {
      // From step 1 (name), go back to sign in
      setAuthMode('signin');
      setStep(4);
    } else if (step > 1) {
      // Go back one step
      setStep(step - 1);
    }
  }, [step]);

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1">
        {/* Back Button - Show on signup steps or when on signin with option to go back */}
        {(authMode === 'signup' || step === 4) && (
          <View className="px-6 pt-2">
            <Pressable
              onPress={handleBack}
              className="flex-row items-center active:opacity-70"
              style={{ alignSelf: 'flex-start' }}
            >
              <ArrowLeft size={20} color="#F59E0B" />
              <Text className="text-amber-500 text-base ml-2 font-medium">
                {step === 1 ? 'Back to Sign In' : 'Back'}
              </Text>
            </Pressable>
          </View>
        )}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="flex-1"
        >
          <ScrollView
            className="flex-1"
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
          >
            {/* Step 1: Name */}
            {step === 1 && (
              <Animated.View
                entering={FadeInUp.duration(800)}
                className="flex-1 px-6 pt-8"
              >
                <View className="items-center mb-12">
                  <View className="w-20 h-20 rounded-full bg-amber-500/20 items-center justify-center mb-6">
                    <Clock size={40} color="#F59E0B" />
                  </View>
                  <Text className="text-4xl font-bold text-white text-center mb-3">
                    Your Time is Limited
                  </Text>
                  <Text className="text-lg text-gray-400 text-center px-4">
                    Don't waste it living someone else's life.
                  </Text>
                </View>

                <View className="mb-8">
                  <Text className="text-gray-400 text-sm mb-2 uppercase tracking-wider">
                    What should we call you?
                  </Text>
                  <TextInput
                    value={name}
                    onChangeText={setName}
                    placeholder="Enter your name"
                    placeholderTextColor="#666"
                    className="bg-[#1A1A1A] border border-gray-800 rounded-2xl px-5 py-4 text-white text-lg"
                    autoFocus
                  />
                </View>

                <Pressable
                  onPress={handleContinue}
                  disabled={!name.trim()}
                  className="mt-auto mb-8"
                >
                  <LinearGradient
                    colors={name.trim() ? ['#F59E0B', '#D97706'] : ['#333', '#333']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: 'center',
                    }}
                  >
                    <Text
                      className={`text-lg font-semibold ${
                        name.trim() ? 'text-black' : 'text-gray-600'
                      }`}
                    >
                      Continue
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 2: Birthday */}
            {step === 2 && (
              <Animated.View
                entering={FadeInDown.duration(600)}
                className="flex-1 px-6 pt-8"
              >
                <View className="items-center mb-12">
                  <View className="w-20 h-20 rounded-full bg-red-500/20 items-center justify-center mb-6">
                    <Skull size={40} color="#EF4444" />
                  </View>
                  <Text className="text-4xl font-bold text-white text-center mb-3">
                    Hello, {name}
                  </Text>
                  <Text className="text-lg text-gray-400 text-center px-4">
                    When did your clock start ticking?
                  </Text>
                </View>

                <View className="mb-8">
                  <Text className="text-gray-400 text-sm mb-2 uppercase tracking-wider">
                    Your Birthday
                  </Text>
                  <Pressable
                    onPress={() => setShowDatePicker(true)}
                    className="bg-[#1A1A1A] border border-gray-800 rounded-2xl px-5 py-4"
                  >
                    <Text className="text-white text-lg">
                      {birthday.toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </Text>
                  </Pressable>

                  {(showDatePicker || Platform.OS === 'ios') && (
                    <View className="bg-[#1A1A1A] rounded-2xl mt-4 overflow-hidden">
                      <DateTimePicker
                        value={birthday}
                        mode="date"
                        display="spinner"
                        onChange={onDateChange}
                        maximumDate={new Date()}
                        minimumDate={new Date(1920, 0, 1)}
                        textColor="white"
                        themeVariant="dark"
                      />
                    </View>
                  )}
                </View>

                <Pressable onPress={handleContinue} className="mt-auto mb-8">
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: 'center',
                    }}
                  >
                    <Text className="text-black text-lg font-semibold">
                      Calculate My Time
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 3: Days Remaining */}
            {step === 3 && (
              <Animated.View
                entering={FadeInUp.duration(800)}
                className="flex-1 px-6 pt-4"
              >
                <View className="items-center mb-8">
                  <View className="w-20 h-20 rounded-full bg-amber-500/20 items-center justify-center mb-6">
                    <Sparkles size={40} color="#F59E0B" />
                  </View>
                  <Text className="text-3xl font-bold text-white text-center mb-2">
                    {name}, You Are {age} Years Old
                  </Text>
                </View>

                <View className="bg-[#1A1A1A] rounded-3xl p-6 mb-6 border border-gray-800">
                  <Text className="text-gray-400 text-center text-sm uppercase tracking-wider mb-3">
                    Days Remaining
                  </Text>
                  <Text className="text-6xl font-bold text-amber-500 text-center">
                    {daysRemaining.toLocaleString()}
                  </Text>
                  <Text className="text-gray-500 text-center mt-2">
                    Assuming you live until 60
                  </Text>
                </View>

                <View className="bg-red-500/10 rounded-2xl p-5 border border-red-500/30 mb-6">
                  <Text className="text-red-400 text-center text-base leading-6">
                    Every single day that passes is a day you'll never get back.
                    Make each one count.
                  </Text>
                </View>

                <Text className="text-gray-500 text-center text-sm mb-8 px-4">
                  Create an account to save your progress and sync across devices.
                </Text>

                <Pressable onPress={handleContinue} className="mt-auto mb-8">
                  <LinearGradient
                    colors={['#F59E0B', '#D97706']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: 'center',
                    }}
                  >
                    <Text className="text-black text-lg font-semibold">
                      Create Account
                    </Text>
                  </LinearGradient>
                </Pressable>
              </Animated.View>
            )}

            {/* Step 4: Email/Password */}
            {step === 4 && (
              <Animated.View
                entering={FadeInDown.duration(600)}
                className="flex-1 px-6 pt-4"
              >
                <View className="items-center mb-8">
                  <View className="w-16 h-16 rounded-full bg-amber-500/20 items-center justify-center mb-4">
                    <Mail size={32} color="#F59E0B" />
                  </View>
                  <Text className="text-2xl font-bold text-white text-center mb-2">
                    {authMode === 'signup' ? 'Create Your Account' : 'Welcome Back'}
                  </Text>
                  <Text className="text-gray-400 text-center">
                    {authMode === 'signup'
                      ? 'Sign up to save your progress'
                      : 'Sign in to continue your journey'}
                  </Text>
                </View>

                {error && (
                  <View className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 mb-4">
                    <Text className="text-red-400 text-center">{error}</Text>
                  </View>
                )}

                <View className="mb-4">
                  <Text className="text-gray-400 text-sm mb-2 uppercase tracking-wider">
                    Email
                  </Text>
                  <View className="flex-row items-center bg-[#1A1A1A] border border-gray-800 rounded-2xl px-4">
                    <Mail size={20} color="#666" />
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your@email.com"
                      placeholderTextColor="#666"
                      className="flex-1 py-4 px-3 text-white text-lg"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    {isEmailValid && <Check size={20} color="#10B981" />}
                  </View>
                </View>

                <View className="mb-6">
                  <Text className="text-gray-400 text-sm mb-2 uppercase tracking-wider">
                    Password
                  </Text>
                  <View className="flex-row items-center bg-[#1A1A1A] border border-gray-800 rounded-2xl px-4">
                    <Lock size={20} color="#666" />
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Min. 8 characters"
                      placeholderTextColor="#666"
                      className="flex-1 py-4 px-3 text-white text-lg"
                      secureTextEntry={!showPassword}
                      autoCapitalize="none"
                    />
                    <Pressable onPress={() => setShowPassword(!showPassword)}>
                      {showPassword ? (
                        <EyeOff size={20} color="#666" />
                      ) : (
                        <Eye size={20} color="#666" />
                      )}
                    </Pressable>
                  </View>
                  {password.length > 0 && !isPasswordValid && (
                    <Text className="text-red-400 text-sm mt-2">
                      Password must be at least 8 characters
                    </Text>
                  )}
                </View>

                {authMode === 'signup' && (
                  <Pressable
                    onPress={() => setTermsAccepted(!termsAccepted)}
                    className="flex-row items-start mb-6"
                  >
                    <View
                      className={`w-6 h-6 rounded-md border-2 mr-3 items-center justify-center ${
                        termsAccepted ? 'bg-amber-500 border-amber-500' : 'border-gray-600'
                      }`}
                    >
                      {termsAccepted && <Check size={16} color="#000" />}
                    </View>
                    <Text className="flex-1 text-gray-400 text-sm leading-5">
                      I agree to the{' '}
                      <Text onPress={openTerms} className="text-amber-500 underline">
                        Terms and Conditions
                      </Text>
                    </Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleAuth}
                  disabled={!canProceedAuth || isLoading}
                  className="mb-4"
                >
                  <LinearGradient
                    colors={canProceedAuth ? ['#F59E0B', '#D97706'] : ['#333', '#333']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: 'center',
                    }}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#000" />
                    ) : (
                      <Text
                        className={`text-lg font-semibold ${
                          canProceedAuth ? 'text-black' : 'text-gray-600'
                        }`}
                      >
                        {authMode === 'signup' ? 'Create Account' : 'Sign In'}
                      </Text>
                    )}
                  </LinearGradient>
                </Pressable>

                <Pressable onPress={toggleAuthMode} className="py-4">
                  <Text className="text-gray-400 text-center">
                    {authMode === 'signup'
                      ? 'Already have an account? '
                      : "Don't have an account? "}
                    <Text className="text-amber-500 font-semibold">
                      {authMode === 'signup' ? 'Sign In' : 'Sign Up'}
                    </Text>
                  </Text>
                </Pressable>
              </Animated.View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
