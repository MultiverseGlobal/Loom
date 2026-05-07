
import axios from 'axios';

async function testConnection() {
    console.log('Testing connection to http://localhost:4000...');
    try {
        const res = await axios.get('http://localhost:4000/api/health', { timeout: 2000 });
        console.log('✅ Success! Status:', res.status);
        console.log('Data:', res.data);
    } catch (err: any) {
        if (err.code === 'ECONNREFUSED') {
            console.error('❌ Connection REFUSED. Server is not running or port is wrong.');
        } else {
            console.error('❌ Connection failed:', err.message);
        }

        // Try 127.0.0.1
        console.log('\nRetrying with 127.0.0.1...');
        try {
            const res2 = await axios.get('http://127.0.0.1:4000/api/health', { timeout: 2000 });
            console.log('✅ Success on 127.0.0.1! Status:', res2.status);
        } catch (err2: any) {
            console.error('❌ Connection failed on 127.0.0.1:', err2.message);
        }
    }
}

testConnection();
