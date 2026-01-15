import React, { memo, useCallback, useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown, useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
import { Plus, X, Briefcase, ChevronDown, ChevronUp } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { WORK_COLORS, type SkipType } from '@/lib/state/works-store';
import { useWorksWithSync } from '@/lib/hooks/useWorksWithSync';
import { WorkCard } from './WorkCard';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscriptionGuard } from '@/lib/useSubscriptionGuard';
import { useDayChange } from '@/lib/providers/DayChangeProvider';

interface WorksListProps {
  className?: string;
}

const WorksListComponent: React.FC<WorksListProps> = ({ className }) => {
  // Subscription guard
  const { guard, PaywallModal } = useSubscriptionGuard();

  // Use the sync hook for actions that should sync to backend
  const {
    works,
    addWork,
    updateWork,
    removeWork,
    skipWork,
    unskipWork,
    addWorkAchievement,
    removeWorkAchievement,
  } = useWorksWithSync();

  const [showAddModal, setShowAddModal] = useState(false);
  const [newWorkName, setNewWorkName] = useState('');
  const [newWorkDescription, setNewWorkDescription] = useState('');
  const [selectedColor, setSelectedColor] = useState(WORK_COLORS[0]);
  const [showSkippedSection, setShowSkippedSection] = useState(false);

  // Animated value for modal background
  const addModalOpacity = useSharedValue(0);

  // Use currentDate from DayChangeProvider - this updates when day changes
  const { currentDate, getCurrentDate } = useDayChange();
  // Use currentDate for display purposes, but getCurrentDate() for actions to always get fresh date
  const today = currentDate;

  // Split works into active and skipped
  const { activeWorks, skippedWorks } = useMemo(() => {
    const active: typeof works = [];
    const skipped: typeof works = [];

    works.forEach((w) => {
      if (!w.skipType) {
        active.push(w);
      } else if (w.skipType === 'indefinite') {
        skipped.push(w);
      } else if (w.skipType === 'tomorrow' && w.skipDate) {
        // Tomorrow skip - active today, skipped from tomorrow onward
        if (w.skipDate > today) {
          skipped.push(w);
        } else {
          active.push(w);
        }
      } else {
        active.push(w);
      }
    });

    return { activeWorks: active, skippedWorks: skipped };
  }, [works, today]);

  const handleOpenAddModal = useCallback(async () => {
    // Check if user has access before opening modal
    const hasAccess = await guard("create_work");
    if (!hasAccess) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedColor(WORK_COLORS[works.length % WORK_COLORS.length]);
    setShowAddModal(true);
  }, [works.length, guard]);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewWorkName('');
    setNewWorkDescription('');
  }, []);

  const handleAddWork = useCallback(() => {
    if (newWorkName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      addWork(newWorkName.trim(), newWorkDescription.trim() || undefined, selectedColor);
      setNewWorkName('');
      setNewWorkDescription('');
      setShowAddModal(false);
    }
  }, [newWorkName, newWorkDescription, selectedColor, addWork]);

  // Use getCurrentDate() for actions to always get the fresh current date
  const handleAddAchievement = useCallback(
    (workId: string, text: string) => {
      const freshDate = getCurrentDate();
      console.log('[WorksList] Adding achievement for date:', freshDate);
      addWorkAchievement(workId, freshDate, text);
    },
    [addWorkAchievement, getCurrentDate]
  );

  const handleRemoveAchievement = useCallback(
    (workId: string, achievementId: string) => {
      const freshDate = getCurrentDate();
      removeWorkAchievement(workId, freshDate, achievementId);
    },
    [removeWorkAchievement, getCurrentDate]
  );

  const handleUpdateWork = useCallback(
    (workId: string, updates: { name?: string; description?: string; color?: string }) => {
      updateWork(workId, updates);
    },
    [updateWork]
  );

  const handleSkipWork = useCallback(
    (workId: string, skipType: SkipType) => {
      skipWork(workId, skipType);
    },
    [skipWork]
  );

  const handleUnskipWork = useCallback(
    (workId: string) => {
      unskipWork(workId);
    },
    [unskipWork]
  );

  const handleDeleteWork = useCallback(
    (workId: string) => {
      removeWork(workId);
    },
    [removeWork]
  );

  const toggleSkippedSection = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowSkippedSection((prev) => !prev);
  }, []);

  // Animate modal background
  useEffect(() => {
    if (showAddModal) {
      addModalOpacity.value = withTiming(1, { duration: 200 });
    } else {
      addModalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showAddModal, addModalOpacity]);

  const addModalBackgroundStyle = useAnimatedStyle(() => ({
    opacity: addModalOpacity.value,
  }));

  return (
    <>
      <View className={className}>
        {/* Header */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-white text-xl font-bold">Your Achievements</Text>
        </View>

        {/* Empty state */}
        {works.length === 0 ? (
          <Animated.View entering={FadeInDown.duration(400)}>
            <View className="bg-[#1A1A1A] rounded-2xl p-8 border border-gray-800 items-center">
              <Briefcase size={40} color="#666" />
              <Text className="text-gray-500 text-center mt-4">
                No achievements created yet.
              </Text>
              <Text className="text-gray-600 text-center text-sm mt-1">
                Add categories like gym, business, or habits to track daily.
              </Text>
              <Pressable
                onPress={handleOpenAddModal}
                className="mt-4 px-6 py-3 bg-amber-500/20 rounded-full"
              >
                <Text className="text-amber-500 font-semibold">Add Your First Category</Text>
              </Pressable>
            </View>
          </Animated.View>
        ) : (
          <View>
            {/* Active works */}
            {activeWorks.map((work) => (
              <WorkCard
                key={work.id}
                work={work}
                isSkipped={false}
                onAddAchievement={handleAddAchievement}
                onRemoveAchievement={handleRemoveAchievement}
                onUpdateWork={handleUpdateWork}
                onSkipWork={handleSkipWork}
                onUnskipWork={handleUnskipWork}
                onDeleteWork={handleDeleteWork}
              />
            ))}

            {/* Add more works button */}
            <Pressable
              onPress={handleOpenAddModal}
              className="mb-4"
            >
              <View className="bg-[#1A1A1A] rounded-2xl border border-dashed border-gray-700 p-4 flex-row items-center justify-center">
                <Plus size={20} color="#F59E0B" />
                <Text className="text-amber-500 font-semibold ml-2">
                  More works to be done
                </Text>
              </View>
            </Pressable>

            {/* Skipped works section */}
            {skippedWorks.length > 0 && (
              <View className="mt-2">
                <Pressable
                  onPress={toggleSkippedSection}
                  className="flex-row items-center justify-between py-3"
                >
                  <Text className="text-gray-500 text-sm uppercase tracking-wider">
                    Skipped ({skippedWorks.length})
                  </Text>
                  {showSkippedSection ? (
                    <ChevronUp size={18} color="#666" />
                  ) : (
                    <ChevronDown size={18} color="#666" />
                  )}
                </Pressable>

                {showSkippedSection && (
                  <View>
                    {skippedWorks.map((work) => (
                      <WorkCard
                        key={work.id}
                        work={work}
                        isSkipped={true}
                        onAddAchievement={handleAddAchievement}
                        onRemoveAchievement={handleRemoveAchievement}
                        onUpdateWork={handleUpdateWork}
                        onSkipWork={handleSkipWork}
                        onUnskipWork={handleUnskipWork}
                        onDeleteWork={handleDeleteWork}
                      />
                    ))}
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </View>

      {/* Add Work Modal */}
      <Modal
        visible={showAddModal}
        animationType="none"
        transparent
        onRequestClose={handleCloseAddModal}
      >
        <Animated.View
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, addModalBackgroundStyle]}
        >
          <Pressable onPress={handleCloseAddModal} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="absolute bottom-0 left-0 right-0"
        >
          <View className="bg-[#1A1A1A] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Add New Category</Text>
              <Pressable onPress={handleCloseAddModal}>
                <X size={24} color="#666" />
              </Pressable>
            </View>

            <Text className="text-gray-400 text-sm mb-2">Category Name</Text>
            <TextInput
              value={newWorkName}
              onChangeText={setNewWorkName}
              placeholder="e.g., Gym, Business, Reading..."
              placeholderTextColor="#666"
              className="bg-[#0D0D0D] border border-gray-800 rounded-2xl px-5 py-4 text-white text-base mb-4"
              autoFocus
              returnKeyType="next"
            />

            <Text className="text-gray-400 text-sm mb-2">Description (optional)</Text>
            <TextInput
              value={newWorkDescription}
              onChangeText={setNewWorkDescription}
              placeholder="e.g., Daily workout routine..."
              placeholderTextColor="#666"
              className="bg-[#0D0D0D] border border-gray-800 rounded-2xl px-5 py-4 text-white text-base mb-4"
              returnKeyType="done"
            />

            <Text className="text-gray-400 text-sm mb-3">Color</Text>
            <View className="flex-row flex-wrap gap-3 mb-6">
              {WORK_COLORS.map((color) => (
                <Pressable
                  key={color}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedColor(color);
                  }}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: color,
                    borderWidth: selectedColor === color ? 3 : 0,
                    borderColor: '#fff',
                  }}
                />
              ))}
            </View>

            <TouchableWithoutFeedback onPress={handleAddWork}>
              <View>
                <LinearGradient
                  colors={newWorkName.trim() ? [selectedColor, selectedColor] : ['#333', '#333']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                  }}
                >
                  <Text
                    className={`text-lg font-semibold ${
                      newWorkName.trim() ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    Create Category
                  </Text>
                </LinearGradient>
              </View>
            </TouchableWithoutFeedback>

            <SafeAreaView edges={['bottom']} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Paywall Modal */}
      <PaywallModal />
    </>
  );
};

export const WorksList = memo(WorksListComponent);
