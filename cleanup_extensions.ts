
process.env.DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';
process.env.SUPABASE_URL = 'https://letfzsvorhlarfuzxijk.supabase.co';
process.env.SUPABASE_ANON_KEY = 'ignore-for-cleanup';

import { db } from './backend/gateway/src/db/client.js';

async function cleanupExtensions() {
    console.log('Starting manual cleanup of extension data...');
    try {
        // 1. Delete all pairing sessions (prevents old sessions from reviving)
        const sessions = await db`DELETE FROM pairing_sessions RETURNING id`;
        console.log(`Deleted ${sessions.length} pairing sessions.`);

        // 2. Delete all extensions (removes the stale "connected" state)
        const extensions = await db`DELETE FROM extensions RETURNING id`;
        console.log(`Deleted ${extensions.length} extensions.`);

        console.log('✅ Cleanup complete. All devices must re-pair.');
    } catch (err) {
        console.error('❌ Cleanup failed:', err);
    } finally {
        process.exit(0);
    }
}

cleanupExtensions();
