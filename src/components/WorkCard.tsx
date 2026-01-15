import React, { memo, useCallback, useMemo, useState, useEffect } from 'react';
import { View, Text, Pressable, TextInput, Modal, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeInDown,
  FadeIn,
  FadeOut,
  Layout,
} from 'react-native-reanimated';
import { ChevronDown, Plus, X, Check, Circle, MoreVertical, Edit3, SkipForward, Trash2, Play } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { Work, SkipType, WORK_COLORS } from '@/lib/state/works-store';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSubscriptionGuard } from '@/lib/useSubscriptionGuard';
import { useDayChange } from '@/lib/providers/DayChangeProvider';

interface WorkCardProps {
  work: Work;
  isSkipped?: boolean;
  onAddAchievement: (workId: string, text: string) => void;
  onRemoveAchievement: (workId: string, achievementId: string) => void;
  onUpdateWork: (workId: string, updates: { name?: string; description?: string; color?: string }) => void;
  onSkipWork: (workId: string, skipType: SkipType) => void;
  onUnskipWork: (workId: string) => void;
  onDeleteWork: (workId: string) => void;
}

interface EditAchievementState {
  id: string;
  text: string;
}

const WorkCardComponent: React.FC<WorkCardProps> = ({
  work,
  isSkipped = false,
  onAddAchievement,
  onRemoveAchievement,
  onUpdateWork,
  onSkipWork,
  onUnskipWork,
  onDeleteWork,
}) => {
  // Subscription guard
  const { guard, PaywallModal } = useSubscriptionGuard();
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showActionModal, setShowActionModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditAchievementModal, setShowEditAchievementModal] = useState(false);
  const [newAchievementText, setNewAchievementText] = useState('');
  const [editAchievement, setEditAchievement] = useState<EditAchievementState | null>(null);
  const [editName, setEditName] = useState(work.name);
  const [editDescription, setEditDescription] = useState(work.description || '');
  const [editColor, setEditColor] = useState(work.color);

  // Animated values for modal backgrounds
  const addModalOpacity = useSharedValue(0);
  const editModalOpacity = useSharedValue(0);
  const editAchievementModalOpacity = useSharedValue(0);

  // Use currentDate from DayChangeProvider - this updates when day changes
  const { currentDate } = useDayChange();
  const today = currentDate;

  const todayAchievements = useMemo(
    () => work.achievements[today] || [],
    [work.achievements, today]
  );
  const isFulfilled = todayAchievements.length > 0;

  const rotation = useSharedValue(0);
  const contentHeight = useSharedValue(0);

  const toggleExpand = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded((prev) => {
      const newValue = !prev;
      rotation.value = withSpring(newValue ? 180 : 0);
      contentHeight.value = withTiming(newValue ? 1 : 0, { duration: 200 });
      return newValue;
    });
  }, [rotation, contentHeight]);

  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${rotation.value}deg` }],
  }));

  const contentStyle = useAnimatedStyle(() => ({
    opacity: contentHeight.value,
    maxHeight: contentHeight.value * 300,
  }));

  const handleOpenAddModal = useCallback(async () => {
    // Check if user has access before opening modal
    const hasAccess = await guard("create_achievement");
    if (!hasAccess) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowAddModal(true);
  }, [guard]);

  const handleCloseAddModal = useCallback(() => {
    setShowAddModal(false);
    setNewAchievementText('');
  }, []);

  const handleOpenActionModal = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowActionModal(true);
  }, []);

  const handleCloseActionModal = useCallback(() => {
    setShowActionModal(false);
  }, []);

  const handleOpenEditModal = useCallback(() => {
    setEditName(work.name);
    setEditDescription(work.description || '');
    setEditColor(work.color);
    setShowActionModal(false);
    setShowEditModal(true);
  }, [work.name, work.description, work.color]);

  const handleCloseEditModal = useCallback(() => {
    setShowEditModal(false);
  }, []);

  const handleSaveEdit = useCallback(() => {
    if (editName.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onUpdateWork(work.id, {
        name: editName.trim(),
        description: editDescription.trim() || undefined,
        color: editColor,
      });
      setShowEditModal(false);
    }
  }, [editName, editDescription, editColor, onUpdateWork, work.id]);

  const handleOpenSkipModal = useCallback(() => {
    setShowActionModal(false);
    setShowSkipModal(true);
  }, []);

  const handleCloseSkipModal = useCallback(() => {
    setShowSkipModal(false);
  }, []);

  const handleSkipTomorrow = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSkipWork(work.id, 'tomorrow');
    setShowSkipModal(false);
  }, [onSkipWork, work.id]);

  const handleSkipIndefinite = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onSkipWork(work.id, 'indefinite');
    setShowSkipModal(false);
  }, [onSkipWork, work.id]);

  const handleUnskip = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onUnskipWork(work.id);
  }, [onUnskipWork, work.id]);

  const handleOpenDeleteModal = useCallback(() => {
    setShowActionModal(false);
    setShowDeleteModal(true);
  }, []);

  const handleCloseDeleteModal = useCallback(() => {
    setShowDeleteModal(false);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    onDeleteWork(work.id);
    setShowDeleteModal(false);
  }, [onDeleteWork, work.id]);

  const handleAddAchievement = useCallback(() => {
    if (newAchievementText.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onAddAchievement(work.id, newAchievementText.trim());
      setNewAchievementText('');
      setShowAddModal(false);
      // Auto expand to show the achievement
      if (!isExpanded) {
        setIsExpanded(true);
        rotation.value = withSpring(180);
        contentHeight.value = withTiming(1, { duration: 200 });
      }
    }
  }, [newAchievementText, onAddAchievement, work.id, isExpanded, rotation, contentHeight]);

  const handleRemoveAchievement = useCallback(
    (achievementId: string) => {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      onRemoveAchievement(work.id, achievementId);
    },
    [onRemoveAchievement, work.id]
  );

  const handleOpenEditAchievementModal = useCallback((achievementId: string, text: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setEditAchievement({ id: achievementId, text });
    setShowEditAchievementModal(true);
  }, []);

  const handleCloseEditAchievementModal = useCallback(() => {
    setShowEditAchievementModal(false);
    setEditAchievement(null);
  }, []);

  const handleSaveEditAchievement = useCallback(() => {
    if (editAchievement && editAchievement.text.trim()) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Remove old achievement and add new one with updated text
      onRemoveAchievement(work.id, editAchievement.id);
      onAddAchievement(work.id, editAchievement.text.trim());
      setShowEditAchievementModal(false);
      setEditAchievement(null);
    }
  }, [editAchievement, onRemoveAchievement, onAddAchievement, work.id]);

  // Animate modal backgrounds
  useEffect(() => {
    if (showAddModal) {
      addModalOpacity.value = withTiming(1, { duration: 200 });
    } else {
      addModalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showAddModal, addModalOpacity]);

  useEffect(() => {
    if (showEditModal) {
      editModalOpacity.value = withTiming(1, { duration: 200 });
    } else {
      editModalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showEditModal, editModalOpacity]);

  useEffect(() => {
    if (showEditAchievementModal) {
      editAchievementModalOpacity.value = withTiming(1, { duration: 200 });
    } else {
      editAchievementModalOpacity.value = withTiming(0, { duration: 200 });
    }
  }, [showEditAchievementModal, editAchievementModalOpacity]);

  const addModalBackgroundStyle = useAnimatedStyle(() => ({
    opacity: addModalOpacity.value,
  }));

  const editModalBackgroundStyle = useAnimatedStyle(() => ({
    opacity: editModalOpacity.value,
  }));

  const editAchievementModalBackgroundStyle = useAnimatedStyle(() => ({
    opacity: editAchievementModalOpacity.value,
  }));

  return (
    <>
      <Animated.View
        entering={FadeInDown.duration(400)}
        layout={Layout.springify()}
        className="mb-3"
        style={{ opacity: isSkipped ? 0.6 : 1 }}
      >
        <View
          className="bg-[#1A1A1A] rounded-2xl border border-gray-800 overflow-hidden"
          style={{ borderLeftWidth: 4, borderLeftColor: isSkipped ? '#666' : work.color }}
        >
          {/* Header */}
          <Pressable
            onPress={isSkipped ? undefined : toggleExpand}
            className="p-4 flex-row items-center justify-between"
          >
            <View className="flex-row items-center flex-1">
              {/* Fulfillment indicator */}
              {!isSkipped && (
                <View className="relative mr-3">
                  <Circle
                    size={12}
                    color={isFulfilled ? '#10B981' : '#EF4444'}
                    fill={isFulfilled ? '#10B981' : '#EF4444'}
                  />
                </View>
              )}
              {isSkipped && (
                <View className="relative mr-3">
                  <SkipForward size={14} color="#666" />
                </View>
              )}
              <View className="flex-1">
                <Text className={`font-semibold text-base ${isSkipped ? 'text-gray-500' : 'text-white'}`}>
                  {work.name}
                </Text>
                {work.description && (
                  <Text className="text-gray-500 text-sm" numberOfLines={1}>
                    {work.description}
                  </Text>
                )}
                {isSkipped && (
                  <Text className="text-gray-600 text-xs mt-1">
                    {work.skipType === 'tomorrow' ? 'Skipped from tomorrow' : 'Skipped indefinitely'}
                  </Text>
                )}
              </View>
            </View>

            <View className="flex-row items-center">
              {/* Achievement count badge */}
              {!isSkipped && todayAchievements.length > 0 && (
                <View
                  className="px-2 py-1 rounded-full mr-2"
                  style={{ backgroundColor: `${work.color}30` }}
                >
                  <Text style={{ color: work.color }} className="text-xs font-semibold">
                    {todayAchievements.length}
                  </Text>
                </View>
              )}

              {/* Resume button for skipped works */}
              {isSkipped && (
                <Pressable
                  onPress={handleUnskip}
                  className="p-2 rounded-full mr-1 bg-green-500/20"
                >
                  <Play size={16} color="#10B981" />
                </Pressable>
              )}

              {/* Add button (only for active works) */}
              {!isSkipped && (
                <Pressable
                  onPress={handleOpenAddModal}
                  className="p-2 rounded-full mr-1"
                  style={{ backgroundColor: `${work.color}20` }}
                >
                  <Plus size={16} color={work.color} />
                </Pressable>
              )}

              {/* Action menu button */}
              <Pressable
                onPress={handleOpenActionModal}
                className="p-2 rounded-full"
              >
                <MoreVertical size={18} color="#666" />
              </Pressable>

              {/* Expand/collapse chevron (only for active works) */}
              {!isSkipped && (
                <Animated.View style={chevronStyle}>
                  <ChevronDown size={20} color="#666" />
                </Animated.View>
              )}
            </View>
          </Pressable>

          {/* Expandable content (only for active works) */}
          {!isSkipped && (
            <Animated.View style={contentStyle} className="overflow-hidden">
              <View className="px-4 pb-4">
                {todayAchievements.length === 0 ? (
                  <View className="py-4 items-center">
                    <Text className="text-gray-600 text-sm">
                      No achievements logged today
                    </Text>
                    <Pressable
                      onPress={handleOpenAddModal}
                      className="mt-2 px-4 py-2 rounded-full"
                      style={{ backgroundColor: `${work.color}20` }}
                    >
                      <Text style={{ color: work.color }} className="text-sm font-semibold">
                        Log Achievement
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View className="space-y-2">
                    {todayAchievements.map((achievement) => (
                      <Pressable
                        key={achievement.id}
                        onPress={() => handleOpenEditAchievementModal(achievement.id, achievement.text)}
                        className="flex-row items-center bg-[#0D0D0D] rounded-xl p-3 mb-2"
                      >
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center mr-3"
                          style={{ backgroundColor: `${work.color}30` }}
                        >
                          <Check size={14} color={work.color} />
                        </View>
                        <Text className="text-white flex-1 text-sm">
                          {achievement.text}
                        </Text>
                        <Pressable
                          onPress={(e) => {
                            e.stopPropagation();
                            handleRemoveAchievement(achievement.id);
                          }}
                          className="p-1"
                        >
                          <X size={16} color="#666" />
                        </Pressable>
                      </Pressable>
                    ))}
                  </View>
                )}
              </View>
            </Animated.View>
          )}
        </View>
      </Animated.View>

      {/* Action Menu Modal */}
      <Modal
        visible={showActionModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseActionModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseActionModal}>
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden">
                <View className="p-4 border-b border-gray-800">
                  <View className="flex-row items-center">
                    <View
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: work.color }}
                    />
                    <Text className="text-white text-lg font-bold">{work.name}</Text>
                  </View>
                </View>

                <Pressable
                  onPress={handleOpenEditModal}
                  className="flex-row items-center p-4 border-b border-gray-800"
                >
                  <Edit3 size={20} color="#F59E0B" />
                  <Text className="text-white ml-3 text-base">Edit</Text>
                </Pressable>

                {!isSkipped ? (
                  <Pressable
                    onPress={handleOpenSkipModal}
                    className="flex-row items-center p-4 border-b border-gray-800"
                  >
                    <SkipForward size={20} color="#3B82F6" />
                    <Text className="text-white ml-3 text-base">Skip</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    onPress={() => {
                      handleCloseActionModal();
                      handleUnskip();
                    }}
                    className="flex-row items-center p-4 border-b border-gray-800"
                  >
                    <Play size={20} color="#10B981" />
                    <Text className="text-white ml-3 text-base">Resume</Text>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleOpenDeleteModal}
                  className="flex-row items-center p-4"
                >
                  <Trash2 size={20} color="#EF4444" />
                  <Text className="text-red-400 ml-3 text-base">Delete</Text>
                </Pressable>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Edit Modal */}
      <Modal
        visible={showEditModal}
        animationType="none"
        transparent
        onRequestClose={handleCloseEditModal}
      >
        <Animated.View
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, editModalBackgroundStyle]}
        >
          <Pressable onPress={handleCloseEditModal} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="absolute bottom-0 left-0 right-0"
        >
          <View className="bg-[#1A1A1A] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-6">
              <Text className="text-white text-xl font-bold">Edit Category</Text>
              <Pressable onPress={handleCloseEditModal}>
                <X size={24} color="#666" />
              </Pressable>
            </View>

            <Text className="text-gray-400 text-sm mb-2">Name</Text>
            <TextInput
              value={editName}
              onChangeText={setEditName}
              placeholder="Category name"
              placeholderTextColor="#666"
              className="bg-[#0D0D0D] border border-gray-800 rounded-2xl px-5 py-4 text-white text-base mb-4"
              autoFocus
              returnKeyType="next"
            />

            <Text className="text-gray-400 text-sm mb-2">Description (optional)</Text>
            <TextInput
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Description"
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
                    setEditColor(color);
                  }}
                  className="w-10 h-10 rounded-full items-center justify-center"
                  style={{
                    backgroundColor: color,
                    borderWidth: editColor === color ? 3 : 0,
                    borderColor: '#fff',
                  }}
                />
              ))}
            </View>

            <TouchableWithoutFeedback onPress={handleSaveEdit}>
              <View>
                <LinearGradient
                  colors={editName.trim() ? ['#F59E0B', '#D97706'] : ['#333', '#333']}
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
                      editName.trim() ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    Save Changes
                  </Text>
                </LinearGradient>
              </View>
            </TouchableWithoutFeedback>

            <SafeAreaView edges={['bottom']} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Skip Modal */}
      <Modal
        visible={showSkipModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseSkipModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseSkipModal}>
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden">
                <View className="p-5">
                  <Text className="text-white text-xl font-bold mb-2">Skip "{work.name}"</Text>
                  <Text className="text-gray-400 text-sm mb-6">
                    How long do you want to skip this category?
                  </Text>

                  <Pressable
                    onPress={handleSkipTomorrow}
                    className="bg-blue-500/20 rounded-xl p-4 mb-3"
                  >
                    <Text className="text-blue-400 font-semibold text-base">Skip from Tomorrow</Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      Active today, skipped starting tomorrow
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleSkipIndefinite}
                    className="bg-amber-500/20 rounded-xl p-4 mb-4"
                  >
                    <Text className="text-amber-400 font-semibold text-base">Skip Until I Resume</Text>
                    <Text className="text-gray-500 text-sm mt-1">
                      Will stay skipped until you choose to resume
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCloseSkipModal}
                    className="py-3"
                  >
                    <Text className="text-gray-500 text-center font-semibold">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent
        onRequestClose={handleCloseDeleteModal}
      >
        <TouchableWithoutFeedback onPress={handleCloseDeleteModal}>
          <View className="flex-1 bg-black/60 justify-center items-center px-6">
            <TouchableWithoutFeedback>
              <View className="bg-[#1A1A1A] rounded-2xl w-full max-w-sm overflow-hidden">
                <View className="p-5">
                  <View className="items-center mb-4">
                    <View className="bg-red-500/20 p-3 rounded-full mb-3">
                      <Trash2 size={28} color="#EF4444" />
                    </View>
                    <Text className="text-white text-xl font-bold mb-2">Delete "{work.name}"?</Text>
                  </View>

                  <Text className="text-gray-400 text-sm text-center mb-2">
                    This action cannot be undone. All achievements related to this category will also be deleted.
                  </Text>

                  <Text className="text-amber-400 text-sm text-center mb-6">
                    If you just want to pause, consider using "Skip" instead.
                  </Text>

                  <Pressable
                    onPress={handleConfirmDelete}
                    className="bg-red-500 rounded-xl py-4 mb-3"
                  >
                    <Text className="text-white text-center font-semibold text-base">Delete Category</Text>
                  </Pressable>

                  <Pressable
                    onPress={handleCloseDeleteModal}
                    className="py-3"
                  >
                    <Text className="text-gray-500 text-center font-semibold">Cancel</Text>
                  </Pressable>
                </View>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      {/* Add Achievement Modal */}
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
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: work.color }}
                />
                <Text className="text-white text-xl font-bold">
                  {work.name}
                </Text>
              </View>
              <Pressable onPress={handleCloseAddModal}>
                <X size={24} color="#666" />
              </Pressable>
            </View>

            <Text className="text-gray-400 text-sm mb-2">
              What did you accomplish for this category?
            </Text>
            <TextInput
              value={newAchievementText}
              onChangeText={setNewAchievementText}
              placeholder="e.g., Completed 30 min workout..."
              placeholderTextColor="#666"
              className="bg-[#0D0D0D] border border-gray-800 rounded-2xl px-5 py-4 text-white text-base mb-6"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleAddAchievement}
            />

            <TouchableWithoutFeedback onPress={handleAddAchievement}>
              <View>
                <LinearGradient
                  colors={
                    newAchievementText.trim()
                      ? [work.color, work.color]
                      : ['#333', '#333']
                  }
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
                      newAchievementText.trim() ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    Log Achievement
                  </Text>
                </LinearGradient>
              </View>
            </TouchableWithoutFeedback>

            <SafeAreaView edges={['bottom']} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Edit Achievement Modal */}
      <Modal
        visible={showEditAchievementModal}
        animationType="none"
        transparent
        onRequestClose={handleCloseEditAchievementModal}
      >
        <Animated.View
          style={[{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }, editAchievementModalBackgroundStyle]}
        >
          <Pressable onPress={handleCloseEditAchievementModal} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' }} />
        </Animated.View>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          className="absolute bottom-0 left-0 right-0"
        >
          <View className="bg-[#1A1A1A] rounded-t-3xl p-6">
            <View className="flex-row justify-between items-center mb-4">
              <View className="flex-row items-center">
                <View
                  className="w-3 h-3 rounded-full mr-2"
                  style={{ backgroundColor: work.color }}
                />
                <Text className="text-white text-xl font-bold">Edit Achievement</Text>
              </View>
              <Pressable onPress={handleCloseEditAchievementModal}>
                <X size={24} color="#666" />
              </Pressable>
            </View>

            <Text className="text-gray-400 text-sm mb-2">
              Update your achievement
            </Text>
            <TextInput
              value={editAchievement?.text || ''}
              onChangeText={(text) => setEditAchievement(prev => prev ? { ...prev, text } : null)}
              placeholder="Achievement text..."
              placeholderTextColor="#666"
              className="bg-[#0D0D0D] border border-gray-800 rounded-2xl px-5 py-4 text-white text-base mb-6"
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveEditAchievement}
            />

            <TouchableWithoutFeedback onPress={handleSaveEditAchievement}>
              <View>
                <LinearGradient
                  colors={
                    editAchievement?.text.trim()
                      ? [work.color, work.color]
                      : ['#333', '#333']
                  }
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
                      editAchievement?.text.trim() ? 'text-white' : 'text-gray-600'
                    }`}
                  >
                    Save Changes
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

export const WorkCard = memo(WorkCardComponent);
