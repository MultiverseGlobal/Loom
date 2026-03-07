
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function diagnose() {
    console.log('--- DIAGNOSTIC START ---');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        // 1. Check the specific pending command (or any recent ones)
        const commands = await sql`
        SELECT id, command_type, status, error_message, created_at, started_at
        FROM commands
        ORDER BY created_at DESC
        LIMIT 5
    `;
        console.log('\n1. Recent Commands:');
        if (commands.length === 0) console.log('   (No commands found)');
        commands.forEach(c => {
            console.log(`   [${c.status}] ${c.command_type} (ID: ${c.id})`);
            if (c.status === 'failed') console.log(`      Error: ${c.error_message}`);
            if (c.status === 'pending') console.log(`      Waiting since: ${c.created_at}`);
        });

        // 2. Check active heartbeats
        const extensions = await sql`
        SELECT id, last_seen, 
        EXTRACT(EPOCH FROM (NOW() - last_seen)) as age_seconds
        FROM extensions
        ORDER BY last_seen DESC
    `;
        console.log('\n2. Extension Heartbeats:');
        if (extensions.length === 0) console.log('   (No extensions found)');
        extensions.forEach(e => {
            const status = e.age_seconds < 30 ? '🟢 ONLINE' : '🔴 OFFLINE';
            console.log(`   ${status} Device: ${e.id}`);
            console.log(`      Last Seen: ${e.age_seconds?.toFixed(1)}s ago`);
        });

    } catch (err) {
        console.error('❌ Diagnostic failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

diagnose();
