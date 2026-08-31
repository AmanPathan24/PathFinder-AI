/**
 * Supabase Connection Verification Script
 * Run with: node scripts/verify-supabase.mjs
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Load .env.local manually (Node doesn't auto-load it)
const envPath = resolve(process.cwd(), '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    env[key.trim()] = rest.join('=').trim();
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!url || !key) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local');
  process.exit(1);
}

console.log('🔗 Supabase URL:', url);
console.log('🔑 Key prefix:', key.substring(0, 20) + '...');
console.log('');

const supabase = createClient(url, key);

const tables = [
  'users',
  'roadmaps',
  'node_statuses',
  'skill_masteries',
  'outcome_events',
  'subtopics',
  'resources',
  'resource_upvotes',
];

let allPassed = true;

for (const table of tables) {
  const { data, error, count } = await supabase
    .from(table)
    .select('*', { count: 'exact', head: true });

  if (error) {
    console.error(`❌ ${table}: ${error.message}`);
    allPassed = false;
  } else {
    console.log(`✅ ${table} — accessible (${count ?? 0} rows)`);
  }
}

console.log('');

// Check for demo user
const { data: demoUser, error: demoErr } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('email', 'demo@pathfinder.ai')
  .maybeSingle();

if (demoErr) {
  console.error('❌ Demo user check failed:', demoErr.message);
  allPassed = false;
} else if (demoUser) {
  console.log('✅ Demo user found:', demoUser.name, `(${demoUser.email})`);
} else {
  console.log('⚠️  No demo user found. Run the SQL schema (scripts/supabase_schema.sql) to seed it.');
}

console.log('');
if (allPassed) {
  console.log('🎉 All checks passed! Supabase is ready.');
} else {
  console.log('⚠️  Some checks failed. Please run scripts/supabase_schema.sql in your Supabase SQL Editor.');
}
