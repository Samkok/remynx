/**
 * Supabase Connection Test Script
 *
 * This script tests if your Supabase tables are set up correctly
 * Run: bun run test-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  process.exit(1);
}

console.log('🔧 Testing Supabase connection...');
console.log(`📍 URL: ${supabaseUrl}\n`);

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('1️⃣ Testing profile table...');
  const { data: profileData, error: profileError } = await supabase
    .from('profile')
    .select('count')
    .limit(1);

  if (profileError) {
    console.error('❌ Profile table error:', profileError.message);
    if (profileError.message.includes('relation "public.profile" does not exist')) {
      console.error('\n⚠️  Tables have not been created yet!');
      console.error('Please run the SQL schema in Supabase Dashboard first.');
      console.error('See: bun run setup-supabase.ts for instructions\n');
    }
    return false;
  }
  console.log('✅ Profile table exists');

  console.log('2️⃣ Testing work table...');
  const { data: workData, error: workError } = await supabase
    .from('work')
    .select('count')
    .limit(1);

  if (workError) {
    console.error('❌ Work table error:', workError.message);
    return false;
  }
  console.log('✅ Work table exists');

  console.log('3️⃣ Testing work_achievement table...');
  const { data: achievementData, error: achievementError } = await supabase
    .from('work_achievement')
    .select('count')
    .limit(1);

  if (achievementError) {
    console.error('❌ Work achievement table error:', achievementError.message);
    return false;
  }
  console.log('✅ Work achievement table exists');

  console.log('\n🎉 All tables are set up correctly!');
  console.log('You can now use the app.');
  return true;
}

testConnection().then(success => {
  process.exit(success ? 0 : 1);
});
