# Platform-Specific Persistent Session Indicators

## Overview

This feature provides native platform-specific session indicators that persist even when the app is in the background:

- **iOS**: Live Activities with Lock Screen and Dynamic Island support (iOS 16.1+)
- **Android**: Foreground Service with ongoing notification (Android 8.0+)

Both implementations share the same React Native interface and are controlled by a unified state management system.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│          React Native Layer (Shared)                │
├─────────────────────────────────────────────────────┤
│  • SessionIndicatorStore (Zustand)                  │
│    - Shared state for both platforms                │
│    - User settings (enable/disable per platform)    │
│    - Session lifecycle management                   │
│                                                      │
│  • SessionIndicatorManager (React Component)        │
│    - Headless component managing lifecycle          │
│    - Handles app state changes                      │
│    - Auto-termination logic                         │
│    - Updates progress every 10 seconds              │
│                                                      │
│  • SessionIndicatorModule (Native Bridge)           │
│    - Platform-agnostic API                          │
│    - Routes calls to correct platform               │
└─────────────────────────────────────────────────────┘
                           │
                           ├──────────────┬──────────────┐
                           ▼              ▼              ▼
              ┌────────────────┐  ┌────────────────┐  ┌──────┐
              │  iOS Native    │  │ Android Native │  │ Web  │
              │  (Swift)       │  │ (Kotlin)       │  │(N/A) │
              ├────────────────┤  ├────────────────┤  └──────┘
              │ ActivityKit    │  │ ForegroundSvc  │
              │ • Live         │  │ • Notification │
              │   Activity     │  │   Channel      │
              │ • Dynamic      │  │ • Progress     │
              │   Island       │  │   Updates      │
              │ • Lock Screen  │  │ • Auto-stop    │
              └────────────────┘  └────────────────┘
```

## Key Features

### ✅ User-Initiated
- Sessions must be explicitly started by user actions (e.g., nightly reminder at 11 PM)
- Not automatically triggered without user context

### ✅ Time-Bound
- Every session has a specific end time
- Auto-terminates when time expires
- Maximum duration enforced by platform (iOS: 8 hours, Android: system managed)

### ✅ Platform-Specific
- iOS: ActivityKit Live Activities with Dynamic Island support
- Android: Foreground Service with ongoing notification
- Gracefully degrades on unsupported platforms (Expo Go, web)

### ✅ User Controls
- Platform-specific opt-out toggles in Profile settings
- Respects user preferences for each platform independently
- Settings persist across app restarts

### ✅ Auto-Termination
- Sessions end automatically when:
  - Time expires (primary mechanism)
  - User completes the action (e.g., logs achievement)
  - User manually dismisses
  - System kills the service (Android low memory)

## File Structure

```
src/
├── lib/
│   ├── state/
│   │   └── session-indicator-store.ts       # Zustand state management
│   └── modules/
│       └── SessionIndicatorModule.ts         # Native bridge
├── components/
│   ├── SessionIndicatorManager.tsx           # Lifecycle manager
│   └── NightlyReminder.tsx                   # Enhanced with session support
└── app/
    └── (tabs)/
        └── profile.tsx                       # Settings UI

ios/
└── README_LIVE_ACTIVITIES.md                 # iOS implementation guide

android/
└── README_FOREGROUND_SERVICE.md              # Android implementation guide
```

## Usage

### Starting a Session

```typescript
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';

function MyComponent() {
  const startSession = useSessionIndicatorStore((s) => s.startSession);

  const handleStartSession = () => {
    startSession({
      sessionType: 'nightly_reminder',
      message: '1 hour left to log today\'s achievements',
      durationMinutes: 60, // Auto-terminates after 60 minutes
    });
  };

  return (
    <Button onPress={handleStartSession}>
      Start Session
    </Button>
  );
}
```

### Updating a Session

```typescript
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';

function MyComponent() {
  const updateSession = useSessionIndicatorStore((s) => s.updateSession);

  const handleUpdate = () => {
    updateSession({
      message: 'New message',
      progress: 50, // 0-100
    });
  };

  return (
    <Button onPress={handleUpdate}>
      Update Progress
    </Button>
  );
}
```

### Ending a Session

```typescript
import { useSessionIndicatorStore } from '@/lib/state/session-indicator-store';

function MyComponent() {
  const endSession = useSessionIndicatorStore((s) => s.endSession);

  return (
    <Button onPress={endSession}>
      End Session
    </Button>
  );
}
```

## State Management

### Session State

```typescript
interface SessionState {
  isActive: boolean;           // Whether a session is currently active
  startTime: number | null;    // Timestamp when session started
  endTime: number | null;      // Timestamp when session should end
  sessionType: 'nightly_reminder' | 'work_session' | 'custom' | null;
  message: string;             // Message displayed to user
  progress: number;            // 0-100 percentage
}
```

### Settings State

```typescript
interface Settings {
  iosLiveActivityEnabled: boolean;           // iOS Live Activities toggle
  androidForegroundServiceEnabled: boolean;  // Android notifications toggle
}
```

## Integration with Existing Features

### Nightly Reminder

The `NightlyReminder` component automatically starts a session indicator when:
1. It's 11 PM
2. User hasn't logged any achievements today
3. Platform supports session indicators
4. User has enabled the feature in settings

```typescript
// Automatic integration in NightlyReminder.tsx
if (!isVisible) {
  setIsVisible(true);

  // Start session indicator
  const minutesLeft = Math.ceil(secondsLeft / 60);
  startSession({
    sessionType: 'nightly_reminder',
    message: '1 hour left to log today\'s achievements',
    durationMinutes: minutesLeft,
  });
}
```

When user dismisses or logs achievement:
```typescript
const handleDismiss = () => {
  setIsVisible(false);
  endSession(); // Automatically ends the session indicator
};
```

## Platform Support

### iOS (Live Activities)

**Supported Platforms:**
- iOS 16.1+ (Live Activities)
- iOS 16.2+ (Dynamic Island)
- Physical devices only (not simulator)

**Features:**
- Lock Screen widget
- Dynamic Island compact/expanded/minimal states
- Real-time updates
- Dismissible by user
- Auto-terminates after 8 hours (iOS limit)

**Setup Required:**
1. Add ActivityKit capability
2. Create Activity Attributes
3. Create Widget Extension
4. Add native Swift code
5. Update Info.plist

See `ios/README_LIVE_ACTIVITIES.md` for detailed setup.

### Android (Foreground Service)

**Supported Platforms:**
- Android 8.0+ (API 26) for notification channels
- Android 13+ (API 33) for runtime permissions

**Features:**
- Persistent notification (cannot be dismissed while active)
- Real-time progress updates
- Custom actions (e.g., "End Session")
- Works in background
- Auto-terminates when time expires

**Setup Required:**
1. Add permissions to AndroidManifest.xml
2. Create Service class
3. Create notification channel
4. Add native Kotlin code
5. Request runtime permissions (Android 13+)

See `android/README_FOREGROUND_SERVICE.md` for detailed setup.

### Web / Expo Go

Not supported. The feature gracefully degrades:
- `SessionIndicatorModule.isSupported()` returns `false`
- Session indicator manager does nothing
- App continues to work normally
- Only in-app UI (NightlyReminder) is shown

## Performance Considerations

### Optimization Strategies

1. **Periodic Updates**: Native indicators update every 10 seconds instead of every second
2. **App State Awareness**: Updates pause when app is killed, resume on foreground
3. **Automatic Cleanup**: All timers and listeners cleaned up on unmount
4. **Selective Zustand Subscriptions**: Uses specific slice selectors to prevent re-renders

```typescript
// Good - subscribes only to specific value
const isActive = useSessionIndicatorStore((s) => s.session.isActive);

// Bad - subscribes to entire session object
const session = useSessionIndicatorStore((s) => s.session);
```

### Memory Management

- Native modules handle their own lifecycle
- React Native bridge uses weak references
- Zustand state persisted to AsyncStorage (small footprint)
- No memory leaks with proper cleanup in useEffect

## Testing

### Manual Testing Checklist

**iOS:**
- [ ] Start session and lock device - see Live Activity on Lock Screen
- [ ] Dynamic Island shows on iPhone 14 Pro+
- [ ] Progress updates every 10 seconds
- [ ] Session ends automatically when time expires
- [ ] Can dismiss Live Activity manually
- [ ] Toggle in settings works

**Android:**
- [ ] Start session and go to home screen
- [ ] Notification shows in notification bar
- [ ] Progress bar updates
- [ ] Cannot dismiss notification by swiping
- [ ] "End Session" button works
- [ ] Session ends automatically when time expires
- [ ] Toggle in settings works

**Both Platforms:**
- [ ] Settings persist across app restarts
- [ ] Disabling feature stops new sessions
- [ ] Existing session ends when feature disabled
- [ ] No crashes on unsupported platforms
- [ ] App state changes handled correctly

## Troubleshooting

### iOS Issues

**Live Activity doesn't appear:**
- Check iOS version (16.1+ required)
- Verify device is physical (not simulator)
- Check Info.plist has `NSSupportsLiveActivities`
- Verify user hasn't disabled Live Activities in system settings

**Dynamic Island not showing:**
- Requires iPhone 14 Pro or newer
- iOS 16.2+ required

### Android Issues

**Notification doesn't appear:**
- Check notification channel is created
- Verify POST_NOTIFICATIONS permission granted (Android 13+)
- Check user hasn't disabled notifications for app

**Service stops unexpectedly:**
- System may kill service on low memory
- Check if user force-stopped the app
- Verify foregroundServiceType in manifest

### General Issues

**Module not found:**
- Native code not compiled yet
- Running in Expo Go (not supported)
- Need to rebuild native app

## Future Enhancements

Potential improvements for future versions:

1. **Custom Session Types**: Allow developers to create custom session types beyond nightly reminders
2. **Interactive Actions**: Add more actions to notifications/Live Activities (e.g., "Snooze", "Complete")
3. **Rich Content**: Support images, charts, or custom layouts in indicators
4. **Notification Sounds**: Custom sounds for different session events
5. **Analytics**: Track session completion rates and user engagement
6. **Localization**: Multi-language support for messages
7. **Themes**: Match app theme colors in notifications

## Best Practices

1. **Always set end time**: Never create open-ended sessions
2. **Meaningful messages**: Keep messages concise and actionable
3. **Respect user settings**: Always check if feature is enabled before starting
4. **Handle errors gracefully**: Native modules can fail, always use try-catch
5. **Test on real devices**: Simulators don't support all features
6. **Update progress regularly**: Keep users informed of session status
7. **Clean up resources**: Always end sessions when no longer needed

## API Reference

### SessionIndicatorModule

```typescript
// Check if platform supports session indicators
await SessionIndicatorModule.isSupported(): Promise<boolean>

// Start a session
await SessionIndicatorModule.start(message: string, endTime: number): Promise<void>

// Update session message and progress
await SessionIndicatorModule.update(message: string, progress: number): Promise<void>

// Stop the session
await SessionIndicatorModule.stop(): Promise<void>

// Listen for events
const listener = SessionIndicatorModule.addListener('onSessionEnd', (event) => {
  console.log('Session ended');
});

// Remove listeners
SessionIndicatorModule.removeAllListeners('onSessionEnd');
```

### useSessionIndicatorStore

```typescript
// State
const session = useSessionIndicatorStore((s) => s.session);
const settings = useSessionIndicatorStore((s) => s.settings);

// Actions
const startSession = useSessionIndicatorStore((s) => s.startSession);
const updateSession = useSessionIndicatorStore((s) => s.updateSession);
const endSession = useSessionIndicatorStore((s) => s.endSession);
const setIOSLiveActivityEnabled = useSessionIndicatorStore((s) => s.setIOSLiveActivityEnabled);
const setAndroidForegroundServiceEnabled = useSessionIndicatorStore((s) => s.setAndroidForegroundServiceEnabled);
```

## License

This implementation follows the same license as the main REMYNX app.

---

**Note**: This feature requires native code compilation. It will not work in Expo Go. You must create a development build or production build to test and use this feature.

For questions or issues, please refer to:
- iOS: `ios/README_LIVE_ACTIVITIES.md`
- Android: `android/README_FOREGROUND_SERVICE.md`
