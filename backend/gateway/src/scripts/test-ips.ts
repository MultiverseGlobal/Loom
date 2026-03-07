import postgres from 'postgres';

const projectRef = 'letfzsvorhlarfuzxijk';
const pass = 'EuiVAv6YRoOPwLu9';
const IPs = ['44.205.18.179', '34.199.184.254', '18.210.198.80'];

async function testIPs() {
    for (const ip of IPs) {
        console.log(`--- Testing IP: ${ip} ---`);
        const sql = postgres({
            host: ip,
            port: 6543,
            user: `postgres.${projectRef}`,
            pass,
            database: 'postgres',
            ssl: 'require',
            prepare: false,
            connect_timeout: 5
        });

        try {
            const res = await sql`SELECT 1 as ok`;
            console.log(`✅ SUCCESS on IP ${ip}!`);
            process.exit(0);
        } catch (err: any) {
            console.log(`❌ FAILED: ${err.message}`);
        } finally {
            await sql.end();
        }
    }
}

testIPs();
