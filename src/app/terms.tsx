import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { router, Stack } from 'expo-router';
import { ChevronLeft } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';

export default function TermsScreen() {
  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.back();
  };

  return (
    <View className="flex-1 bg-[#0D0D0D]">
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={['#0D0D0D', '#1A1A1A', '#0D0D0D']}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView className="flex-1">
        {/* Header */}
        <View className="flex-row items-center px-4 py-3 border-b border-gray-800">
          <Pressable
            onPress={handleBack}
            className="p-2 -ml-2 rounded-full active:bg-gray-800"
          >
            <ChevronLeft size={24} color="#F59E0B" />
          </Pressable>
          <Text className="text-xl font-bold text-white ml-2">Terms & Conditions</Text>
        </View>

        <ScrollView
          className="flex-1 px-5"
          contentContainerStyle={{ paddingVertical: 20 }}
          showsVerticalScrollIndicator={false}
        >
          <Text className="text-amber-500 text-2xl font-bold mb-6">
            REMYNX Terms of Service
          </Text>

          <Text className="text-gray-400 text-sm mb-6">
            Last Updated: December 2024
          </Text>

          <Section title="1. Acceptance of Terms">
            By downloading, installing, or using REMYNX ("the App"), you agree to be bound
            by these Terms and Conditions. If you do not agree to these terms, please do
            not use the App.
          </Section>

          <Section title="2. Description of Service">
            REMYNX is a personal productivity and life tracking application designed to
            help users:
            {'\n\n'}• Track daily achievements and productive activities
            {'\n'}• Maintain daily streaks and build positive habits
            {'\n'}• Monitor works and goals they commit to
            {'\n'}• Visualize their life calendar and time remaining
            {'\n'}• Stay motivated through progress tracking
          </Section>

          <Section title="3. User Accounts">
            To use REMYNX, you must create an account using a valid email address. You
            are responsible for:
            {'\n\n'}• Maintaining the confidentiality of your account credentials
            {'\n'}• All activities that occur under your account
            {'\n'}• Providing accurate and complete information
            {'\n'}• Notifying us immediately of any unauthorized use
          </Section>

          <Section title="4. User Data and Privacy">
            Your privacy is important to us. By using REMYNX:
            {'\n\n'}• You grant us permission to store and process your data to provide
            the service
            {'\n'}• Your personal achievements and works are stored securely
            {'\n'}• We do not sell or share your personal data with third parties
            {'\n'}• You may request deletion of your account and data at any time
          </Section>

          <Section title="5. Acceptable Use">
            You agree not to:
            {'\n\n'}• Use the App for any unlawful purpose
            {'\n'}• Attempt to gain unauthorized access to our systems
            {'\n'}• Interfere with or disrupt the App's functionality
            {'\n'}• Upload malicious content or harmful data
            {'\n'}• Impersonate others or provide false information
          </Section>

          <Section title="6. Intellectual Property">
            All content, features, and functionality of REMYNX, including but not limited
            to text, graphics, logos, and software, are the exclusive property of REMYNX
            and are protected by copyright, trademark, and other intellectual property laws.
          </Section>

          <Section title="7. Disclaimer of Warranties">
            REMYNX is provided "as is" without warranties of any kind. We do not guarantee
            that the App will be error-free, uninterrupted, or meet your specific
            requirements. The life expectancy calculations are for motivational purposes
            only and should not be considered medical advice.
          </Section>

          <Section title="8. Limitation of Liability">
            To the maximum extent permitted by law, REMYNX and its creators shall not be
            liable for any indirect, incidental, special, consequential, or punitive
            damages arising from your use of the App.
          </Section>

          <Section title="9. Changes to Terms">
            We reserve the right to modify these terms at any time. Continued use of the
            App after changes constitutes acceptance of the new terms. We will notify
            users of significant changes through the App.
          </Section>

          <Section title="10. Termination">
            We may terminate or suspend your account at our discretion if you violate
            these terms. Upon termination, your right to use the App will immediately
            cease.
          </Section>

          <Section title="11. Contact Information">
            If you have any questions about these Terms and Conditions, please contact
            us through the App's support feature or email us at support@remynx.app
          </Section>

          <View className="h-10" />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-white font-semibold text-lg mb-3">{title}</Text>
      <Text className="text-gray-400 text-base leading-6">{children}</Text>
    </View>
  );
}
