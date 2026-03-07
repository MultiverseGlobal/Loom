
import postgres from 'postgres';

const DATABASE_URL = 'postgresql://postgres.letfzsvorhlarfuzxijk:theoonimabah@aws-1-eu-west-1.pooler.supabase.com:5432/postgres';

async function checkCommands() {
    console.log('Checking ALL recent commands in "commands" table...');
    const sql = postgres(DATABASE_URL, { ssl: 'require', prepare: false });

    try {
        const commands = await sql`
      SELECT * FROM commands 
      WHERE created_at > NOW() - INTERVAL '1 hour'
      ORDER BY created_at DESC
      LIMIT 10
    `;

        console.log(`Found ${commands.length} recent commands:`);
        commands.forEach(cmd => {
            console.log(`- ID: ${cmd.id} | Type: ${cmd.command_type} | Device: ${cmd.device_id} | Status: ${cmd.status} | Created: ${cmd.created_at}`);
            if (cmd.status === 'failed') console.log(`  Error: ${cmd.error_message}`);
            if (cmd.status === 'completed') console.log(`  Result: ${JSON.stringify(cmd.result)}`);
        });

    } catch (err) {
        console.error('❌ Query failed:', err);
    } finally {
        await sql.end();
        process.exit(0);
    }
}

checkCommands();
