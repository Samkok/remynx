import React, { useState } from 'react';
import { View, Text, Pressable, TextInput, ScrollView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { X, Check, Calendar as CalendarIcon, AlertCircle } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as Haptics from 'expo-haptics';
import { useQueryClient } from '@tanstack/react-query';
import { useLifeStore } from '@/lib/state/life-store';
import { api } from '@/lib/api';
import { type UpdateProfileResponse } from '@/shared/contracts';
import { profileKeys } from '@/lib/hooks/useApiData';

export default function EditProfileModal() {
  const queryClient = useQueryClient();
  const profile = useLifeStore((s) => s.profile);
  const setProfile = useLifeStore((s) => s.setProfile);

  const [name, setName] = useState<string>(profile?.name || '');
  const [birthday, setBirthday] = useState<Date>(
    profile?.birthday ? new Date(profile.birthday) : new Date()
  );
  const [showDatePicker, setShowDatePicker] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  const handleSave = async () => {
    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // Format birthday to YYYY-MM-DD
      const year = birthday.getFullYear();
      const month = String(birthday.getMonth() + 1).padStart(2, '0');
      const day = String(birthday.getDate()).padStart(2, '0');
      const formattedBirthday = `${year}-${month}-${day}`;

      // Update profile in database
      await api.patch<UpdateProfileResponse>('/api/profile', {
        name: name.trim(),
        birthday: formattedBirthday,
      });

      // Invalidate profile query to refresh data
      queryClient.invalidateQueries({ queryKey: profileKeys.detail() });

      // Update local state
      setProfile({
        name: name.trim(),
        birthday: formattedBirthday,
        onboardingComplete: true,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.back();
    } catch (err) {
      console.error('Failed to update profile:', err);
      setError('Failed to update profile. Please try again.');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  const formatDisplayDate = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1" edges={['top']}>
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ paddingBottom: 40 }}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <View className="px-5 pt-4 pb-6 flex-row items-center justify-between">
            <Pressable
              onPress={handleCancel}
              className="w-10 h-10 rounded-full bg-gray-800 items-center justify-center active:bg-gray-700"
            >
              <X size={20} color="#FFF" />
            </Pressable>
            <Text className="text-xl font-bold text-white">Edit Profile</Text>
            <Pressable
              onPress={handleSave}
              disabled={isLoading}
              className="w-10 h-10 rounded-full bg-amber-500 items-center justify-center active:bg-amber-600 disabled:opacity-50"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Check size={20} color="#FFF" />
              )}
            </Pressable>
          </View>

          {/* Form */}
          <View className="px-5 mt-6">
            {/* Name Input */}
            <View className="mb-6">
              <Text className="text-gray-400 text-sm mb-2 px-1">Full Name</Text>
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Enter your name"
                placeholderTextColor="#666"
                className="bg-[#1A1A1A] text-white text-base px-5 py-4 rounded-2xl border border-gray-800"
                autoCapitalize="words"
                autoCorrect={false}
              />
            </View>

            {/* Birthday Input */}
            <View className="mb-6">
              <Text className="text-gray-400 text-sm mb-2 px-1">Date of Birth</Text>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setShowDatePicker(true);
                }}
                className="bg-[#1A1A1A] px-5 py-4 rounded-2xl border border-gray-800 flex-row items-center justify-between active:bg-gray-800/50"
              >
                <Text className="text-white text-base">{formatDisplayDate(birthday)}</Text>
                <CalendarIcon size={20} color="#F59E0B" />
              </Pressable>
            </View>

            {/* Date Picker */}
            {showDatePicker && (
              <DateTimePicker
                value={birthday}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={(event, selectedDate) => {
                  setShowDatePicker(Platform.OS === 'ios');
                  if (selectedDate) {
                    setBirthday(selectedDate);
                  }
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1900, 0, 1)}
              />
            )}

            {/* Error Message */}
            {error ? (
              <View className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mt-4 flex-row items-center">
                <AlertCircle size={18} color="#EF4444" />
                <Text className="text-red-400 text-sm ml-2 flex-1">{error}</Text>
              </View>
            ) : null}

            {/* Info Card */}
            <View className="bg-amber-500/10 border border-amber-500/20 rounded-2xl p-4 mt-4">
              <Text className="text-amber-500 text-sm leading-5">
                Your name and date of birth help personalize your experience and calculate your life progress accurately.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}
