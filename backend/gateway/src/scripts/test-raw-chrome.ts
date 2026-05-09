
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

async function test() {
    const url = 'https://example.com';
    const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    
    console.log('Testing raw chrome dump-dom...');
    try {
        const { stdout, stderr } = await execAsync(`"${chromePath}" --headless --dump-dom ${url}`, { timeout: 10000 });
        console.log('--- STDOUT ---');
        console.log(stdout.substring(0, 500));
        console.log('--- SUCCESS ---');
    } catch (err) {
        console.error('Raw chrome failed:', err);
    }
}

test();
