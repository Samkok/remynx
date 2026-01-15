import React from 'react';
import { Tabs } from 'expo-router';
import { View } from 'react-native';
import { Clock, CalendarDays, User } from 'lucide-react-native';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0D0D0D',
          borderTopColor: '#1A1A1A',
          borderTopWidth: 1,
          height: 85,
          paddingTop: 8,
        },
        tabBarActiveTintColor: '#F59E0B',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginTop: 4,
        },
        animation: 'shift',
        lazy: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Today',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`p-2 rounded-xl ${
                focused ? 'bg-amber-500/20' : 'bg-transparent'
              }`}
            >
              <Clock size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="life"
        options={{
          title: 'Life Calendar',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`p-2 rounded-xl ${
                focused ? 'bg-amber-500/20' : 'bg-transparent'
              }`}
            >
              <CalendarDays size={22} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <View
              className={`p-2 rounded-xl ${
                focused ? 'bg-amber-500/20' : 'bg-transparent'
              }`}
            >
              <User size={22} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}
