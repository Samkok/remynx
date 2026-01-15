# REMYNX

A gamified mortality awareness app that helps you stop wasting your life by visualizing time's passage and tracking daily achievements.

## ⚠️ IMPORTANT: Subscription Table Setup Required

Before the subscription management features will work, you **must** run the SQL migration:

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Open **SQL Editor**
3. Copy and paste the contents of `supabase-user-subscriptions-migration.sql`
4. Click **Run**

This creates the `user_subscriptions` table in Supabase that tracks subscription status from RevenueCat webhooks.

**Note**: All subscription status checks query Supabase directly, not the backend API. This ensures real-time subscription data from RevenueCat webhooks.

## Features

### Subscription & Payment System
- **2-Week Free Trial**: All users get 14 days of free access starting from registration
- **Premium Subscriptions**:
  - Monthly: $4.99/month
  - Annual: $49.99/year (save 17%)
- **RevenueCat Integration**: Seamless subscription management across iOS, Android
- **Subscription Management Screen**: View current plan, manage subscriptions, upgrade to Pro (accessible via Profile → Subscription)
  - Displays active subscription details (product, store, expiration date)
  - Shows trial status for users on free trial
  - Beautiful gradient upgrade banner for non-subscribers
  - Native subscription management via RevenueCat
  - **All data queries Supabase directly** for real-time subscription status
- **User Subscriptions Table**: Supabase tracks subscription status from RevenueCat webhooks
  - Table: `user_subscriptions` in Supabase PostgreSQL
  - Tracks status, entitlement, product, store, expiration, renewal status
  - Frontend and backend both query Supabase directly (no API middleman)
  - Ensures consistent, real-time subscription data across the app
- **Access Control**: Premium features (creating works and achievements) locked after trial expires
  - Backend validates subscription status from Supabase before allowing operations
  - Clear error messages directing users to subscribe
- **Trial Management**: Automatic trial expiration after 2 weeks, requiring subscription to continue
- **Debug Tools**: Development-only screen to test subscription states (expire trial, activate subscriptions, reset trial)
- **Subscription Sync**: Real-time sync with RevenueCat via webhooks to Supabase
- **Event Logging**: Complete audit trail of all subscription events for debugging

### Authentication & User Accounts
- **Email/Password Sign In**: Returning users sign in with email and password
- **Email/Password Sign Up**: New users complete onboarding flow with name, birthday, and account creation
- **Terms & Conditions**: Required acceptance during sign up with link to full terms
- **Session Persistence**: Stay logged in across app restarts
- **Profile Management**: View profile info and sign out from Profile tab

### Sign Up Flow (New Users)
- Enter your name
- Select your birthday
- View your calculated days remaining (assuming 60 years of life)
- Reveals your mortality in a motivating way
- Create account with email and password
- Accept Terms and Conditions

### Profile Tab
- **User Info Display**: Shows name, age, and birthday
- **Edit Profile**: Icon button in profile card to update name and date of birth
  - Modal with form to edit name and birthday
  - Date picker for selecting new birthday
  - Changes sync to database and persist across devices
  - Loading states and error handling for network requests
- **Streak Stats**: Current streak and longest streak cards
- **Notification Settings**:
  - Platform-specific session indicator toggles
  - iOS: Enable/disable Live Activities for Lock Screen and Dynamic Island
  - Android: Enable/disable persistent notifications
  - Settings persist across app restarts
- **Settings Section**: Terms & Conditions link, Sign Out button
- **App Version Info**: REMYNX version display

### Today Screen
- **Days Remaining Counter**: Shows how many days you have left
- **Live Progress Bar**: Counts down every second of the day with animated progress
- **Warning Alert**: Reminds you if you haven't logged any achievements
- **Pull-to-Refresh**: Swipe down to refresh data from the server

### Achievements System
- **Daily Achievement Categories**: Create categories for things you do every day to better your life
  - Business tasks, gym routines, habits, reading, etc.
  - Each category has a customizable name, description, and color
- **Category Fulfillment**: Log achievements for each individual category
  - Green dot indicates fulfilled (has at least one achievement today)
  - Red dot indicates unfulfilled (no achievements yet)
- **Collapsible Achievement Cards**:
  - Tap to expand/collapse and view today's achievements for that category
  - Smooth animations for expand/collapse transitions
  - Quick-add button for logging achievements
  - **Tap any achievement to edit it** - update achievement text inline
- **Smooth Modal Experience**:
  - Animated blur backgrounds that fade in/out smoothly
  - No keyboard dismissal delay - tap submit button directly while typing
  - Keyboard submit with "done" button for faster input
- **Category Action Menu**:
  - Edit: Change name, description, or color
  - Skip: Skip for today only (excluded from progress, returns tomorrow) or indefinitely (until manually resumed)
  - Delete: Remove category with warning about losing all achievements
- **Active and Skipped Sections**:
  - Active categories appear at the top with full functionality
  - Skipped categories appear in a collapsible section at the bottom
  - Skipped categories show "Skipped today" or "Skipped indefinitely" badge
  - One-tap resume to bring skipped categories back to active
- **Add Category Button**:
  - Located at the bottom of the list with "More works to be done" label
  - Easy access to add new categories
- **Achievements Progress Bar**:
  - Visual progress bar showing percentage of **active** categories fulfilled
  - Skipped categories are excluded from progress calculation
  - Color-coded: Red (0-40%), Yellow (40-80%), Green (100%)
  - Shows "X/Y fulfilled" count
- **All Categories Celebration**:
  - Full-screen congratulations animation when all active categories are fulfilled
  - Trophy icon with particle confetti effects
  - Motivational message: "Most people waste their days... But not you."
  - Only triggers once per day when completing all active categories (persisted across app restarts)
- **Streak Integration**:
  - Daily streak is tracked based on at least one category being fulfilled
  - Fulfilled means at least one achievement logged in any active category

### Nightly Reminder (Live Activity Style)
- **11 PM Trigger**: Automatic overlay appears at 11 PM every day
- **Conditional Display**: Only shows if user hasn't logged any work achievements today (no daily streak)
- **Countdown Timer**: Shows minutes and seconds remaining until midnight
- **Urgency Animation**: Pulsing card with glowing effects to grab attention
- **Progress Bar**: Visual indicator of how much of the final hour has passed
- **Quick Action**: One-tap navigation to log achievements before the day ends
- **Dismissable**: Can be swiped away if needed, resets for the next day
- **Platform-Specific Persistent Indicators**:
  - **iOS**: Live Activities with Lock Screen and Dynamic Island support (iOS 16.1+)
  - **Android**: Foreground Service with ongoing notification
  - Auto-terminates when time expires or achievement is logged
  - User-controlled opt-in/opt-out toggles in Profile settings

### Daily Streak System
- **Streak Icon**: Fire icon in top-right of home screen shows current streak status
  - Colorful animated flame when today's streak is complete (has achievement in any category)
  - Blurred/grayed out with exclamation mark when incomplete
  - Badge displays current streak count
- **Works-Based Tracking**: A day is marked complete when at least one work has an achievement logged
  - Streak counts consecutive days where any work was fulfilled (had achievement)
  - All streak calculations use work achievements, not legacy achievement system
- **Weekly Quests**: 7-day streak challenges that reset each week
  - Visual progress tracking for each day of the week
  - Perfect week badges for completing all 7 days
  - Future week preview showing upcoming quest
- **Celebration Animation**: Inspiring full-screen celebration when completing daily streak
  - Particle effects with fire-colored confetti
  - Animated flame icon with pulsing glow
  - Milestone messages (1 day, 7 days, 14 days, etc.)
  - Triggers on first achievement logged in any category for the day
- **Real-Time Day Change Detection**: Automatic updates when the day changes
  - DayChangeProvider wraps the entire app for global day change detection
  - Detects day changes even while app is open (no restart needed)
  - Checks for updates when app returns from background
  - Waits for user to be active before showing popups
  - **Automatic Data Refresh**: When a new day starts, all achievement and progress data is automatically refetched from the database
  - **Instant UI Updates**: Progress bars, achievement counts, and streak calculations update immediately without requiring app restart
  - **Context-Based Date Tracking**: All components subscribe to the current date from DayChangeProvider for synchronized updates
- **Registration Date Tracking**: Streak system respects user's registration date
  - Days before registration are marked as blank (not wasted)
  - Prevents false "wasted day" popups for new users
- **Smart Daily Popups**: Three mutually-exclusive popups based on yesterday's status
  - **Welcome First Day** (when yesterday is blank/before registration):
    - Appears on any day when yesterday was before user's registration date
    - Welcoming message: "What's gone is gone. Today is the first day of your new chapter."
    - Warm, motivating tone to start the journey positively
    - Only shows once per user
  - **Day Wasted Warning** (when yesterday is wasted):
    - Appears when yesterday had no work achievements after registration
    - Dramatic messaging to create urgency and accountability
    - Motivates users to take action today instead of wasting another day
    - Only appears once per day, even across app restarts
  - **Yesterday Completed Celebration** (when yesterday is completed):
    - Appears when yesterday had work achievements
    - Motivational messaging to reinforce positive behavior and keep momentum
    - Celebrates consistency and action-taking mindset
    - Only appears once per day, even across app restarts
  - Priority: Welcome > Wasted > Completed (only one shows per day)
- **Streak Page**: Dedicated screen accessible by tapping streak icon
  - Current streak display with animated fire
  - Stats: longest streak, total productive days (days with work achievements), perfect weeks
  - Weekly quest history with day-by-day breakdown
  - Color-coded days:
    - Green with checkmark: Completed (has achievements)
    - Red with X mark: Wasted (no achievements after registration)
    - Gray with date number: Blank (before user registered)
    - Amber with bold date: Today
    - Dashed gray border: Future days

### Life Calendar
- **4-Level Hierarchy**: Navigate through your life just like a real calendar
  - **Year View**: 3-column grid of all 60 years of your life expectancy with visual indicators
  - **Month View**: Tap a year to see all 12 months with productivity statistics
  - **Week View (Calendar Grid)**: Tap a month to see a traditional calendar grid with all days
  - **Day View**: Tap any past day to see work achievements grouped by category in a detailed modal
- **Interactive Day Selection**: Click any day to view its achievements and status
- **Year Visual Indicators**:
  - Years before birth: Crossed out (strikethrough) to show time already lived
  - Current year: Highlighted in amber with "Now" label
  - Future years: Green dot in top-right corner
- **Day Visual Indicators**:
  - Green dot on days with work achievements
  - Current day/month highlighted in amber
- **Color Coding**:
  - Amber: Current day/month/year
  - Green: Productive days (had work achievements)
  - Red: Wasted days (after registration, no achievements logged)
  - Gray: Lived days (before registration) and past years
  - Dark: Future days
- **Wasted Days Tracking**: Days after profile creation with no achievements are marked in red as "wasted" to create accountability
- **Month Statistics**: Each month shows productive day count and percentage based on work achievements
- **Day Detail Modal**: Shows all achievements grouped by work category with color-coded indicators
- **Works-Based Calendar**: All calendar data now uses work achievements instead of legacy achievement system
- **Smooth Transitions**: Optimized navigation between all zoom levels with instant response
- **Accurate Day Alignment**: Calendar grid properly aligned to Sunday-Saturday weeks
- **3-Column Grid Layout**: Years displayed in a compact 3-per-row format for better overview
- **Zoom to Day Button**: Quick navigation button in header to jump directly to current month's week view with engaging animation
- **Floating Scroll-to-Current Button**: Floating amber button to instantly scroll to current year (in year view) or current month (in month view)
- **Auto-Scroll on Load**: Calendar automatically scrolls to current year when opened and to current month when entering month view for the current year
- **Pull-to-Refresh**: Swipe down to refresh data from the server in all calendar views

## Tech Stack

- Expo SDK 53 + React Native 0.76.7
- Zustand for local state management (persisted with AsyncStorage)
- React Query for server state management
- React Native Reanimated v3 for animations
- NativeWind (TailwindCSS) for styling
- Lucide React Native for icons

### Native Features
- **iOS Live Activities**: Platform-specific persistent session indicators using ActivityKit (iOS 16.1+)
- **Android Foreground Service**: Background notifications with real-time updates (Android 8.0+)
- See `SESSION_INDICATORS.md` for implementation details

### Backend (Supabase)
- **Supabase PostgreSQL**: Cloud-hosted database with Row Level Security (RLS)
- **Supabase Auth**: Authentication with email/password, session persistence via AsyncStorage
- **Direct Supabase Client**: Frontend connects directly to Supabase (no intermediate backend needed for data operations)
- **Supabase Realtime**: Real-time database subscriptions for instant UI updates
  - Listens to INSERT, UPDATE, DELETE events on profile, work, and work_achievement tables
  - Automatically syncs changes across all screens without manual refresh
  - Works seamlessly on home page and calendar page
- **Type-Safe Queries**: Strongly typed database operations with TypeScript
- Shared TypeScript contracts between frontend and Supabase schema

### Backend (Vibecode Cloud)
- **Hono Server**: Fast, lightweight backend API server
- **Prisma ORM**: Type-safe database operations with SQLite
- **Better Auth**: Email/password authentication with session management
- **Subscription Management**: Complete subscription and trial tracking system
- **Event Logging**: Audit trail for subscription events
- **API Endpoints**:
  - Profile management
  - Works and achievements CRUD
  - Streak calculation and updates
  - Subscription status and management
  - RevenueCat synchronization
  - Debug tools for testing

### Setup Instructions
⚠️ **Important**: Before using the app, you need to set up Supabase authentication settings:

1. The database tables are already created in your Supabase project
2. **Disable email confirmation** for development:
   - Go to your [Supabase Dashboard](https://supabase.com/dashboard)
   - Navigate to **Authentication** → **Providers**
   - Click on **Email** provider
   - **Uncheck** "Confirm email"
   - Click **Save**

See [SUPABASE_SETUP.md](./SUPABASE_SETUP.md) for detailed setup instructions and troubleshooting.

## Performance Optimizations

- **React.memo**: All components (WorkCard, WorksList, WorksProgressBar, AllWorksCelebration) are memoized
- **useCallback**: All event handlers use useCallback to prevent unnecessary re-renders
- **useMemo**: Expensive computations (week data, year groups, fulfillment stats) are memoized
- **DataSyncProvider**: Background sync to backend without blocking UI
- **RealtimeSyncProvider**: Real-time Supabase subscriptions for instant data updates
  - Automatic sync on any database changes (INSERT, UPDATE, DELETE)
  - Zero manual refresh needed - UI updates instantly
  - Efficient change detection with Supabase realtime channels
  - Debounced sync operations (300ms) to prevent excessive API calls
  - Automatic reconnection when app comes to foreground
  - Client-side filtering of achievement events by user's work IDs
- **DayChangeProvider**: Centralized date management for consistent date handling
  - Provides `currentDate` that updates automatically at midnight
  - Provides `getCurrentDate()` function for actions to ensure fresh date
  - Periodic day change detection every 60 seconds
  - **10-Minute Background Refresh**: When app is inactive for 10+ minutes, all data is automatically refreshed on return
  - Automatic data refresh on day change
- **Local-First Architecture**: Zustand stores for instant UI response, React Query for API sync
- **Optimized State Transitions**: State updates prioritized for immediate UI response, cleanup deferred with setTimeout
- **Lazy Loading**: Tab screens load on-demand for faster initial load
- **removeClippedSubviews**: Enabled on all ScrollViews for better memory usage
- **Smooth Zoom Transitions**: Back navigation clears previous view data after transition starts to prevent lag
- **Zustand Selectors**: Uses specific slice selectors to prevent unnecessary re-renders
- **Animated Layout**: Uses react-native-reanimated Layout animations for smooth collapsible transitions
- **Network Error Handling**: Graceful handling of network failures with automatic retry logic
  - Subscription status checks silently handle network errors without showing error overlays
  - Periodic checks continue in background with exponential backoff retry
  - React Query configured with smart retry logic (no retry on auth errors, retry on network errors)

## Color Palette

- Background: Deep charcoal (#0D0D0D, #1A1A1A)
- Primary: Amber/Gold (#F59E0B) - represents precious time
- Success: Emerald (#10B981) - productive days
- Warning: Red (#EF4444) - wasted time alerts
- Text: White and grays
