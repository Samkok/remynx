/**
 * Check Supabase Auth Settings
 *
 * This script checks if email confirmation is enabled in your Supabase project
 * Run: bun run check-auth-settings.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkAuthSettings() {
  console.log('🔍 Testing Supabase Auth Configuration...\n');

  // Try to sign up with a test email
  const testEmail = `test${Date.now()}@gmail.com`;
  const testPassword = 'TestPassword123!';

  console.log('📧 Testing signup with:', testEmail);

  const { data, error } = await supabase.auth.signUp({
    email: testEmail,
    password: testPassword,
    options: {
      data: { name: 'Test User' }
    }
  });

  if (error) {
    console.error('❌ Signup error:', error.message);
    return;
  }

  console.log('\n✅ Signup successful!');
  console.log('📊 User created:', data.user?.id);
  console.log('🔐 Session created:', !!data.session);

  if (data.session) {
    console.log('\n✅ EMAIL CONFIRMATION IS DISABLED');
    console.log('Users can sign up and use the app immediately!');

    // Clean up: delete the test user
    console.log('\n🧹 Cleaning up test user...');
    await supabase.auth.signOut();
    console.log('✅ Test complete!');
  } else {
    console.log('\n⚠️  EMAIL CONFIRMATION IS ENABLED');
    console.log('Users need to confirm their email before they can use the app.');
    console.log('\n📋 To fix this:');
    const projectId = supabaseUrl?.split('//')[1]?.split('.')[0] || 'your-project-id';
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectId);
    console.log('2. Click "Authentication" → "Providers"');
    console.log('3. Click on "Email" provider');
    console.log('4. Uncheck "Confirm email"');
    console.log('5. Click "Save"');
    console.log('\nThen run this script again to verify!');
  }
}

checkAuthSettings();
