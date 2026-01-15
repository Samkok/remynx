# Bolt-Ready Expo App

A minimal, web-compatible Expo application using Supabase for authentication and backend.

## Features

- ✅ **Supabase Authentication** - Email/password sign in and sign up
- ✅ **Clean UI** - TailwindCSS (NativeWind) styling
- ✅ **React Query** - Efficient data management
- ✅ **Expo Router** - File-based routing
- ✅ **Web Compatible** - Works perfectly in Bolt's web preview

## Quick Start

### 1. Install Dependencies

```bash
bun install
```

### 2. Environment Setup

Your `.env` file is already configured with Supabase credentials:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Set Up Supabase Database (Optional)

If you want to store user profiles, run this SQL in your Supabase SQL editor:

```sql
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create profile table
create table if not exists public.profile (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users not null unique,
  email text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable RLS
alter table public.profile enable row level security;

-- Create policies
create policy "Users can view own profile"
  on public.profile for select
  using (auth.uid() = user_id);

create policy "Users can update own profile"
  on public.profile for update
  using (auth.uid() = user_id);

create policy "Users can insert own profile"
  on public.profile for insert
  with check (auth.uid() = user_id);
```

### 4. Run the App

```bash
bun start
```

Then press `w` to open in web browser.

## Project Structure

```
src/
├── app/                    # Expo Router pages
│   ├── _layout.tsx         # Root layout with providers
│   ├── index.tsx           # Landing page
│   ├── auth.tsx            # Sign in / Sign up
│   └── home.tsx            # Home page (authenticated)
├── lib/                    # Utilities
│   └── supabaseClient.ts   # Supabase client config
└── components/             # Reusable components
```

## Routes

- `/` - Landing page with sign in/sign up buttons
- `/auth` - Sign in page
- `/auth?mode=signup` - Sign up page
- `/home` - Home page (requires authentication)

## What Changed from Original?

This app has been restructured for Bolt compatibility:

- ✅ Removed native-only packages (Camera, Sensors, RevenueCat, etc.)
- ✅ Removed Better Auth → Using Supabase Auth
- ✅ Removed backend server → Direct Supabase integration
- ✅ Simplified from 150+ to 30 dependencies
- ✅ Removed complex onboarding flow
- ✅ Web-compatible components only
- ✅ Clean, minimal UI

## Tech Stack

- **Expo SDK 53** - React Native framework
- **React 19** - Latest React version
- **Supabase** - Authentication & Database
- **React Query** - Server state management
- **Zustand** - Local state management
- **NativeWind** - TailwindCSS for React Native
- **Expo Router** - File-based routing

## Development

### Type Checking

```bash
bun typecheck
```

### Linting

```bash
bun lint
```

## Deployment

This app is optimized for web deployment. Build for production:

```bash
expo export --platform web
```

The output will be in the `dist/` folder, ready to deploy to any static hosting service.

## Support

- [Expo Documentation](https://docs.expo.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [React Query Documentation](https://tanstack.com/query/latest)

## License

MIT
