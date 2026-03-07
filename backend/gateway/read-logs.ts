import fs from 'fs';

const logFile = 'gateway_retry.txt';

if (!fs.existsSync(logFile)) {
    console.error("Log file not found");
    process.exit(1);
}

const content = fs.readFileSync(logFile, 'utf8');
const lines = content.split('\n');

console.log("--- RECENT AUTH/IDE LOGS ---");
lines.slice(-200).forEach(line => {
    if (line.includes('[AUTH] SUCCESS') || line.includes('[PushToIDE]')) {
        console.log(line.trim());
    }
});
