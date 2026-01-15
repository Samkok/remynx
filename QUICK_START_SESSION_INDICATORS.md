# Session Indicators - Quick Start Guide

This guide helps you quickly implement native session indicators in your development or production builds.

## ⚠️ Important Notes

1. **Native Code Required**: This feature requires native code compilation. It will NOT work in Expo Go.
2. **Development Build Required**: You must create a development build or production build.
3. **Platform-Specific**: iOS and Android require separate implementations.

## Quick Setup Steps

### For Development

1. **Install dependencies** (already installed in this project):
   ```bash
   # No additional dependencies needed
   # React Native, expo-notifications, and other required packages are already installed
   ```

2. **Add native code** (see platform-specific guides):
   - iOS: Follow `ios/README_LIVE_ACTIVITIES.md`
   - Android: Follow `android/README_FOREGROUND_SERVICE.md`

3. **Create development build**:
   ```bash
   # iOS
   npx expo run:ios

   # Android
   npx expo run:android
   ```

4. **Test the feature**:
   - Open the app at 11 PM
   - Or manually trigger a session (see Usage section below)
   - Check Profile > Notifications to toggle on/off

### For Production

1. **Complete native setup** for both platforms
2. **Test thoroughly** on physical devices
3. **Build production app**:
   ```bash
   eas build --platform ios
   eas build --platform android
   ```

## Current Implementation Status

### ✅ Completed (React Native Layer)

- [x] State management (Zustand store)
- [x] Native bridge module (TypeScript)
- [x] Lifecycle manager component
- [x] Integration with NightlyReminder
- [x] Settings UI in Profile tab
- [x] Auto-termination logic
- [x] Progress updates every 10 seconds
- [x] App state handling (background/foreground)

### ⏳ Pending (Native Layer)

- [ ] iOS: Swift code for ActivityKit
- [ ] iOS: Widget Extension for Live Activities
- [ ] iOS: Activity Attributes definition
- [ ] Android: Kotlin code for Foreground Service
- [ ] Android: Notification channel setup
- [ ] Android: Service lifecycle management

## Manual Testing (After Native Setup)

### Test on iOS (Physical Device)

1. Enable Live Activities in Profile > Notifications
2. Wait for 11 PM or manually trigger session
3. Lock device - see Live Activity on Lock Screen
4. On iPhone 14 Pro+: see Dynamic Island
5. Verify progress updates
6. Test auto-termination (wait for end time)
7. Test manual dismiss

### Test on Android

1. Enable Persistent Notifications in Profile > Notifications
2. Wait for 11 PM or manually trigger session
3. Go to home screen or lock device
4. See notification in notification bar
5. Verify progress bar updates
6. Test "End Session" button
7. Test auto-termination

## Manual Session Triggering (for Testing)

Add this temporarily to test without waiting for 11 PM:

```typescript
// In any screen (e.g., Today screen)
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';
import { Button } from 'react-native';

function TestButton() {
  const startSession = useSessionIndicatorStore((s) => s.startSession);

  return (
    <Button
      title="Test Session (5 min)"
      onPress={() => {
        startSession({
          sessionType: 'custom',
          message: 'Test session - 5 minutes',
          durationMinutes: 5,
        });
      }}
    />
  );
}
```

## Troubleshooting Common Issues

### "Module not found" Error

**Problem**: `SessionIndicatorModule` cannot be found.

**Solution**:
1. Ensure you're NOT using Expo Go
2. Rebuild the app with native code:
   ```bash
   npx expo run:ios    # or run:android
   ```

### Live Activity Doesn't Appear (iOS)

**Possible causes**:
1. Running in simulator (use physical device)
2. iOS version < 16.1
3. Live Activities disabled in system settings
4. Native code not implemented yet

**Solution**:
1. Use physical device with iOS 16.1+
2. Check Settings > [Your App] > Allow Live Activities
3. Implement native Swift code (see iOS guide)

### Notification Doesn't Appear (Android)

**Possible causes**:
1. Missing POST_NOTIFICATIONS permission (Android 13+)
2. Notification channel not created
3. Native code not implemented yet

**Solution**:
1. Request permission at runtime
2. Implement native Kotlin code (see Android guide)
3. Check app notification settings in system

### Session Doesn't End Automatically

**Possible causes**:
1. Timer not set up correctly
2. App killed by system
3. Native module not handling auto-termination

**Solution**:
1. Check `endTime` is set correctly
2. Verify native code implements auto-termination
3. Test with shorter duration (e.g., 2 minutes)

## Architecture Overview (What's Already Done)

```
React Native ✅ (Complete)
  ├── State Management
  │   └── session-indicator-store.ts
  ├── Native Bridge
  │   └── SessionIndicatorModule.ts
  ├── Lifecycle Manager
  │   └── SessionIndicatorManager.tsx
  ├── Integration
  │   ├── NightlyReminder.tsx
  │   └── Profile settings UI
  └── Documentation
      ├── SESSION_INDICATORS.md
      ├── ios/README_LIVE_ACTIVITIES.md
      └── android/README_FOREGROUND_SERVICE.md

Native Code ⏳ (Needs Implementation)
  ├── iOS
  │   ├── SessionActivityAttributes.swift
  │   ├── SessionActivityWidget.swift
  │   ├── SessionIndicatorModule.swift
  │   └── SessionIndicatorModule.m
  └── Android
      ├── SessionIndicatorService.kt
      ├── SessionIndicatorModule.kt
      └── SessionIndicatorPackage.kt
```

## Next Steps

1. **Choose your platform** (iOS or Android)
2. **Follow the platform guide**:
   - iOS: `ios/README_LIVE_ACTIVITIES.md`
   - Android: `android/README_FOREGROUND_SERVICE.md`
3. **Implement native code** (step-by-step instructions provided)
4. **Rebuild the app** with native code
5. **Test thoroughly** on physical devices
6. **Submit to app stores** (optional)

## Performance Tips

- Native indicators update every 10 seconds (not every second) to save battery
- Sessions auto-terminate to prevent resource leaks
- Clean up happens automatically on app close
- State persists across app restarts via AsyncStorage

## Support

For detailed implementation:
- **Complete documentation**: `SESSION_INDICATORS.md`
- **iOS setup**: `ios/README_LIVE_ACTIVITIES.md`
- **Android setup**: `android/README_FOREGROUND_SERVICE.md`

For questions about React Native layer, check:
- State: `src/lib/state/session-indicator-store.ts`
- Bridge: `src/lib/modules/SessionIndicatorModule.ts`
- Manager: `src/components/SessionIndicatorManager.tsx`

---

**Remember**: The React Native layer is complete and working. You only need to add the native platform code to see the Live Activities (iOS) or persistent notifications (Android).
