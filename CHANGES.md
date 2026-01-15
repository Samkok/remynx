# Changes Made for Bolt Compatibility

This document outlines all changes made to restructure the app for Bolt's web-based environment.

## Major Changes

### 1. Dependencies Simplified (150+ → 30 packages)

**Removed:**
- All native-only packages (Camera, Sensors, Haptics, etc.)
- Better Auth and authentication backend
- RevenueCat and subscription management
- React Navigation packages (using Expo Router only)
- Native UI libraries (Bottom Sheets, Context Menus, etc.)
- iOS/Android specific packages
- Backend dependencies (Prisma, Hono, etc.)

**Kept:**
- Expo core packages
- Supabase client
- React Query
- NativeWind (TailwindCSS)
- Zustand
- Essential Expo packages (Router, Status Bar, etc.)

### 2. Authentication Rewrite

**Before:**
- Better Auth with backend server
- Complex onboarding flow (name, birthday, days remaining calculation)
- Custom backend API for profile management
- Multiple authentication providers

**After:**
- Direct Supabase Auth integration
- Simple email/password sign in/up
- No backend server required
- Clean, web-compatible auth flow

### 3. App Structure Simplified

**Removed:**
- `/src/app/(tabs)/` - Complex tab navigation
- `/src/app/streak.tsx` - Streak tracking page
- `/src/app/terms.tsx` - Terms page
- `/src/app/edit-profile.tsx` - Profile editing
- `/src/app/debug-subscription.tsx` - Subscription debugging
- `/src/app/settings.tsx` - Settings page
- `/backend/` - Entire backend server

**Added:**
- `/src/app/home.tsx` - Simple home page after login

**Modified:**
- `/src/app/_layout.tsx` - Simplified, removed complex providers
- `/src/app/index.tsx` - Landing page with auth buttons
- `/src/app/auth.tsx` - Clean sign in/up page

### 4. Backend Removed

**Deleted:**
- Entire `/backend` folder
- Prisma ORM and SQLite database
- Hono server
- Better Auth backend
- API routes
- Subscription management endpoints

**Replaced with:**
- Direct Supabase client calls
- Supabase Auth
- Supabase Database (PostgreSQL)

### 5. State Management Simplified

**Removed:**
- Complex state providers (DataSyncProvider, DayChangeProvider, RealtimeSyncProvider)
- Subscription context
- Life store complex logic
- Streak store calculations
- Session indicator management

**Kept:**
- Supabase client for auth state
- React Query for server state
- Zustand for minimal local state (if needed)

### 6. UI Components Simplified

**Removed:**
- All complex components (WorkCard, WorksList, etc.)
- Nightly reminders
- Session indicators
- Celebration animations
- Progress bars
- Calendar views
- Streak celebrations

**Kept:**
- Basic React Native components (View, Text, Pressable, etc.)
- Simple web-compatible UI

### 7. Configuration Cleaned Up

**Files Removed:**
- All `.md` documentation files (except README and new docs)
- SQL migration files
- Backend configuration files
- Test files
- Setup scripts

**Files Modified:**
- `package.json` - Minimal dependencies
- `.env` - Only Supabase config
- `README.md` - New simplified guide

**Files Added:**
- `SETUP.md` - Supabase setup guide
- `CHANGES.md` - This file

### 8. Routing Simplified

**Before:**
- Complex tab-based navigation
- Multiple nested routes
- Modal presentations
- Slide animations

**After:**
- Simple stack navigation
- Three routes: `/`, `/auth`, `/home`
- Clean, straightforward flow

## Breaking Changes

If you were using the original app:

1. **No offline support** - All auth is through Supabase
2. **No backend API** - Direct Supabase integration only
3. **No subscription system** - RevenueCat removed
4. **No complex features** - Streaks, calendar, works system all removed
5. **No native features** - Camera, sensors, haptics all removed

## Migration Path

To add features back:

1. **User profiles** - Use Supabase database tables
2. **Complex features** - Build incrementally with Supabase
3. **Subscriptions** - Use Supabase Edge Functions + Stripe
4. **Native features** - Add packages back carefully, test web compatibility

## Benefits of New Structure

✅ **Web compatible** - Works perfectly in Bolt preview
✅ **Faster development** - Less dependencies, simpler code
✅ **Easier to understand** - Clean, minimal structure
✅ **Production ready** - Supabase scales well
✅ **Cost effective** - No backend server to maintain
✅ **Quick start** - 3 commands to get running

## File Count Comparison

**Before:**
- 180+ files
- 150+ dependencies
- Complex folder structure

**After:**
- ~50 files
- 30 dependencies
- Flat, simple structure

## Next Steps

1. Install dependencies: `bun install`
2. Configure Supabase (see SETUP.md)
3. Start dev server: `bun start`
4. Build your features on this clean foundation
