# Supabase Setup Instructions

## Current Issue
You're getting an "Unauthorized" error because Supabase email confirmation is enabled by default. When users sign up, they need to confirm their email before they can use the app.

## Solution: Disable Email Confirmation (Recommended for Development)

### Step 1: Go to Supabase Dashboard
1. Visit https://supabase.com/dashboard
2. Open your project: `nthkinajkivbeddqepmd`

### Step 2: Disable Email Confirmation
1. Click on **Authentication** in the left sidebar
2. Click on **Providers**
3. Scroll down to **Email**
4. Click on **Email** to expand settings
5. **Uncheck** "Confirm email"
6. Click **Save**

### Step 3: Test the App
Now try signing up again with a new email. You should be able to create an account without email confirmation!

---

## Alternative: Enable Auto-Confirm for Development

If you want to keep email confirmation enabled but auto-confirm emails for development:

1. Go to **Authentication** → **URL Configuration**
2. Under **Redirect URLs**, add your app URL
3. Go to **Settings** → **API**
4. Under **JWT Settings**, you can configure auto-confirm

---

## Already Have Email Confirmation Enabled?

If you already signed up with an email and need to confirm it:

### Option 1: Check Your Email
Look for a confirmation email from Supabase and click the confirmation link.

### Option 2: Manual Confirmation (via SQL)
Run this in the SQL Editor to manually confirm all users:

```sql
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
```

---

## Test Your Setup

After disabling email confirmation, run:
```bash
bun run test-supabase.ts
```

Then try signing up in the app again!
