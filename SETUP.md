# Setup Guide

## Supabase Configuration

This app uses Supabase for authentication and database. Follow these steps to configure it:

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details
5. Wait for the project to be created

### 2. Get Your API Keys

1. Go to Project Settings → API
2. Copy your project URL and anon/public key
3. These are already in your `.env` file

### 3. Disable Email Confirmation (Development Only)

For easier development, disable email confirmation:

1. Go to Authentication → Providers
2. Click on "Email"
3. Uncheck "Confirm email"
4. Click "Save"

### 4. Create Database Tables (Optional)

If you want to store additional user data, run this SQL in your Supabase SQL Editor:

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

### 5. Test Your Setup

1. Run `bun install`
2. Run `bun start` and press `w` for web
3. Try creating an account and signing in

## Troubleshooting

### "Invalid API key" error

- Check that your `.env` file has the correct Supabase URL and anon key
- Make sure you're using the correct project

### "Email not confirmed" error

- Go to Authentication → Providers → Email
- Disable "Confirm email"

### Can't sign in after creating account

- Check your Supabase Authentication → Users to see if the user was created
- Try resetting your password from the auth page

## Next Steps

Once your auth is working:

1. Add more database tables for your app features
2. Create API endpoints using Supabase Edge Functions (optional)
3. Add real-time subscriptions for live data updates
4. Deploy your app to production

## Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase Auth Guide](https://supabase.com/docs/guides/auth)
- [Supabase Database Guide](https://supabase.com/docs/guides/database)
