import dotenv from "dotenv";

// Load environment variables BEFORE any other imports
// This file should be imported first in server.ts
const result = dotenv.config();

console.error('[ENV] dotenv.config() called');
console.error('[ENV] dotenv result:', result.error ? `ERROR: ${result.error}` : 'SUCCESS');
console.error('[ENV] SUPABASE_URL set:', !!process.env.SUPABASE_URL);
console.error('[ENV] SUPABASE_URL value:', process.env.SUPABASE_URL?.substring(0, 30) + '...');
console.error('[ENV] SUPABASE_ANON_KEY set:', !!process.env.SUPABASE_ANON_KEY);
