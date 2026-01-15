# Session Indicators Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         USER INTERFACE                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────────────┐         ┌──────────────────────┐         │
│  │  NightlyReminder    │         │   Profile Screen     │         │
│  │  (11 PM Overlay)    │         │   (Settings UI)      │         │
│  ├─────────────────────┤         ├──────────────────────┤         │
│  │ • Shows at 11 PM    │         │ • iOS Live Activity  │         │
│  │ • Countdown timer   │         │   toggle             │         │
│  │ • Progress bar      │         │ • Android Foreground │         │
│  │ • Dismiss/Log btns  │         │   Service toggle     │         │
│  └──────┬──────────────┘         └──────────┬───────────┘         │
│         │                                    │                     │
│         │ startSession()          setEnabled()                    │
│         │                                    │                     │
└─────────┼────────────────────────────────────┼─────────────────────┘
          │                                    │
          ▼                                    ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    STATE MANAGEMENT LAYER                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              useSessionIndicatorStore (Zustand)                     │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ Session State:                 Settings:                   │    │
│  │ • isActive: boolean            • iosLiveActivityEnabled    │    │
│  │ • startTime: number            • androidForegroundService  │    │
│  │ • endTime: number                Enabled                   │    │
│  │ • sessionType: string                                      │    │
│  │ • message: string              Persisted to AsyncStorage   │    │
│  │ • progress: number (0-100)                                 │    │
│  │                                                            │    │
│  │ Actions:                                                   │    │
│  │ • startSession({ message, durationMinutes })              │    │
│  │ • updateSession({ message?, progress? })                  │    │
│  │ • endSession()                                            │    │
│  │ • setIOSLiveActivityEnabled(enabled)                      │    │
│  │ • setAndroidForegroundServiceEnabled(enabled)             │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                            │
                            │ State changes trigger...
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                   LIFECYCLE MANAGEMENT LAYER                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│            SessionIndicatorManager (React Component)                │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ Responsibilities:                                          │    │
│  │                                                            │    │
│  │ 1. Monitor session state changes                          │    │
│  │    ├─ Start native indicator when session.isActive=true   │    │
│  │    └─ Stop native indicator when session.isActive=false   │    │
│  │                                                            │    │
│  │ 2. Periodic updates (every 10 seconds)                    │    │
│  │    ├─ Calculate current progress                          │    │
│  │    ├─ Update native UI                                    │    │
│  │    └─ Check if time expired                               │    │
│  │                                                            │    │
│  │ 3. Handle app state changes                               │    │
│  │    ├─ App goes background: keep updating                  │    │
│  │    └─ App returns foreground: sync state                  │    │
│  │                                                            │    │
│  │ 4. Auto-termination                                       │    │
│  │    ├─ Set timeout for endTime                             │    │
│  │    └─ Clean up resources                                  │    │
│  │                                                            │    │
│  │ 5. Respect user settings                                  │    │
│  │    └─ Only act if platform toggle enabled                 │    │
│  │                                                            │    │
│  │ Headless: Returns null (no UI)                            │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└────────────────────────────┬────────────────────────────────────────┘
                            │
                            │ Calls native methods...
                            │
                            ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    NATIVE BRIDGE LAYER                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│              SessionIndicatorModule (TypeScript)                    │
│  ┌───────────────────────────────────────────────────────────┐    │
│  │ Platform-Agnostic API:                                     │    │
│  │                                                            │    │
│  │ async isSupported(): Promise<boolean>                     │    │
│  │   └─ Check if platform has native implementation          │    │
│  │                                                            │    │
│  │ async start(message: string, endTime: number): Promise    │    │
│  │   ├─ iOS: SessionIndicatorNative.startLiveActivity()      │    │
│  │   └─ Android: SessionIndicatorNative.startForegroundService()│  │
│  │                                                            │    │
│  │ async update(message: string, progress: number): Promise  │    │
│  │   ├─ iOS: SessionIndicatorNative.updateLiveActivity()     │    │
│  │   └─ Android: SessionIndicatorNative.updateForegroundService()││
│  │                                                            │    │
│  │ async stop(): Promise<void>                               │    │
│  │   ├─ iOS: SessionIndicatorNative.endLiveActivity()        │    │
│  │   └─ Android: SessionIndicatorNative.stopForegroundService()││
│  │                                                            │    │
│  │ Event Listeners:                                           │    │
│  │   • onSessionEnd: Native tells RN session ended           │    │
│  │   • onSessionInteraction: User tapped notification        │    │
│  └───────────────────────────────────────────────────────────┘    │
│                                                                     │
└───────────────┬──────────────────────────┬──────────────────────────┘
                │                          │
    ┌───────────┴───────────┐  ┌──────────┴───────────┐
    │      iOS Native       │  │   Android Native     │
    │      (Swift)          │  │   (Kotlin)           │
    └───────────┬───────────┘  └──────────┬───────────┘
                │                         │
                ▼                         ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│   iOS IMPLEMENTATION    │  │ ANDROID IMPLEMENTATION  │
├─────────────────────────┤  ├─────────────────────────┤
│                         │  │                         │
│ ActivityKit Framework   │  │ Foreground Service      │
│                         │  │                         │
│ Components:             │  │ Components:             │
│                         │  │                         │
│ 1. Activity Attributes  │  │ 1. Service Class        │
│    └─ ContentState      │  │    └─ Lifecycle methods │
│                         │  │                         │
│ 2. Widget Extension     │  │ 2. Notification Builder │
│    ├─ Lock Screen UI    │  │    ├─ Channel setup     │
│    └─ Dynamic Island    │  │    └─ Progress bar      │
│       ├─ Compact        │  │                         │
│       ├─ Minimal        │  │ 3. Broadcast Receiver   │
│       └─ Expanded       │  │    └─ Send events to RN │
│                         │  │                         │
│ 3. Native Module        │  │ 4. Native Module        │
│    ├─ Start activity    │  │    ├─ Start service     │
│    ├─ Update state      │  │    ├─ Update notif      │
│    └─ End activity      │  │    └─ Stop service      │
│                         │  │                         │
│ Requirements:           │  │ Requirements:           │
│ • iOS 16.1+             │  │ • Android 8.0+          │
│ • Physical device       │  │ • Notification perms    │
│ • Push notification cap │  │ • Foreground service    │
│                         │  │   permission            │
└─────────────────────────┘  └─────────────────────────┘
          │                           │
          ▼                           ▼
┌─────────────────────────┐  ┌─────────────────────────┐
│   SYSTEM UI (iOS)       │  │  SYSTEM UI (Android)    │
├─────────────────────────┤  ├─────────────────────────┤
│                         │  │                         │
│ Lock Screen:            │  │ Notification Bar:       │
│ ┌─────────────────────┐ │  │ ┌─────────────────────┐ │
│ │ Session Active      │ │  │ │ ⏰ Session Active   │ │
│ │ 1hr left • 50% ▓▓▓░ │ │  │ │ 1hr left • 50% done │ │
│ └─────────────────────┘ │  │ │ ▓▓▓▓▓▓▓▓▓▓░░░░░░░░  │ │
│                         │  │ │ [End Session]       │ │
│ Dynamic Island:         │  │ └─────────────────────┘ │
│    ⏰ 60m               │  │                         │
│  (on 14 Pro+)           │  │ Persistent:             │
│                         │  │ • Cannot dismiss        │
│ User can:               │  │ • Always visible        │
│ • Tap to open app       │  │ • Tap to open app       │
│ • Dismiss manually      │  │ • Action buttons        │
└─────────────────────────┘  └─────────────────────────┘


DATA FLOW EXAMPLE (Nightly Reminder at 11 PM):

  User opens app at 11 PM, no achievements logged
           │
           ▼
  NightlyReminder detects time + conditions
           │
           ├─────────► Show in-app overlay (existing)
           │
           └─────────► startSession({
                         sessionType: 'nightly_reminder',
                         message: '1 hour left to log...',
                         durationMinutes: 60
                       })
                         │
                         ▼
                  Zustand store updates:
                    • isActive = true
                    • startTime = now
                    • endTime = now + 60min
                    • message = '1 hour...'
                    • progress = 0
                         │
                         ▼
           SessionIndicatorManager detects state change
                         │
                         ├─ Check: iOS enabled? ✓
                         │  └─ Call: SessionIndicatorModule.start()
                         │     └─ iOS: startLiveActivity()
                         │        └─ ActivityKit creates Live Activity
                         │           └─ Appears on Lock Screen
                         │
                         └─ Check: Android enabled? ✓
                            └─ Call: SessionIndicatorModule.start()
                               └─ Android: startForegroundService()
                                  └─ Service starts with notification
                                     └─ Appears in notification bar
           │
           ▼
  Every 10 seconds:
    SessionIndicatorManager calculates new progress
           │
           ├─ progress = (now - startTime) / (endTime - startTime) * 100
           │
           └─ SessionIndicatorModule.update(message, progress)
                 │
                 ├─ iOS: Updates Live Activity state
                 │  └─ Lock Screen refreshes
                 │
                 └─ Android: Updates notification
                    └─ Progress bar updates
           │
           ▼
  At midnight (endTime reached):
    SessionIndicatorManager auto-terminates
           │
           ├─ SessionIndicatorModule.stop()
           │    │
           │    ├─ iOS: Ends Live Activity
           │    │  └─ Removed from Lock Screen
           │    │
           │    └─ Android: Stops service
           │       └─ Notification dismissed
           │
           └─ Zustand: endSession()
              └─ isActive = false
              └─ Cleanup resources


ALTERNATIVE FLOW (User Logs Achievement):

  User taps "Log Achievement" in overlay
           │
           ▼
  NightlyReminder.handleLogAchievement()
           │
           ├─────────► Navigate to home tab
           │
           └─────────► endSession()
                         │
                         ▼
                  Zustand store updates:
                    • isActive = false
                    • Clear session data
                         │
                         ▼
           SessionIndicatorManager detects state change
                         │
                         └─ SessionIndicatorModule.stop()
                            │
                            ├─ iOS: Ends Live Activity
                            │  └─ Removed from Lock Screen
                            │
                            └─ Android: Stops service
                               └─ Notification dismissed
```

## Key Points

1. **Separation of Concerns**: Each layer has a single responsibility
2. **Platform Agnostic**: React Native code doesn't know about iOS/Android details
3. **State-Driven**: Everything flows from Zustand state changes
4. **Automatic Cleanup**: Lifecycle manager handles all resource management
5. **User Control**: Settings respected at every layer
6. **Type Safety**: TypeScript throughout React Native layer
7. **Performance**: 10-second updates, not continuous polling
8. **Graceful Degradation**: Works without native code (just no system UI)

## Implementation Status

✅ **Complete**: All boxes above the "Native Implementation" layer
⏳ **Pending**: Native iOS and Android implementations (guides provided)
