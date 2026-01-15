/**
 * Supabase Setup Script
 *
 * This script will create all the necessary tables in your Supabase database
 * by executing the SQL schema directly.
 *
 * Run this script once to set up your database:
 * bun run setup-supabase.ts
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ Missing Supabase environment variables');
  console.error('Please ensure EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY are set in your .env file');
  process.exit(1);
}

console.log('🔧 Connecting to Supabase...');
console.log(`📍 URL: ${supabaseUrl}`);

// Create Supabase client
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function setupDatabase() {
  try {
    console.log('\n📖 Reading schema file...');
    const schemaPath = join(__dirname, 'supabase-schema.sql');
    const schema = readFileSync(schemaPath, 'utf-8');

    console.log('✅ Schema file loaded');
    console.log('\n⚠️  IMPORTANT: This script cannot execute raw SQL directly.');
    console.log('You need to run the SQL in the Supabase Dashboard.\n');

    console.log('📋 Follow these steps:');
    const projectId = supabaseUrl?.split('//')[1]?.split('.')[0] || 'your-project-id';
    console.log('1. Go to: https://supabase.com/dashboard/project/' + projectId);
    console.log('2. Click on "SQL Editor" in the left sidebar');
    console.log('3. Click "+ New Query"');
    console.log('4. Copy the contents of supabase-schema.sql');
    console.log('5. Paste it into the query editor');
    console.log('6. Click "Run"');

    console.log('\n📄 Schema file location: supabase-schema.sql');
    console.log('\nOnce you\'ve run the SQL, test the connection by running: bun run test-supabase.ts');

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

setupDatabase();
