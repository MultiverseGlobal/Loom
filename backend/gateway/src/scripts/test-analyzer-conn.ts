import axios from 'axios';
import { config } from '../config.js';

async function testAnalyzer() {
    console.log('--- Analyzer Connectivity Test ---');
    console.log(`Target URL: ${config.analyzerUrl}`);

    try {
        console.log('1. Testing /health...');
        const healthRes = await axios.get(`${config.analyzerUrl}/health`);
        console.log('   Health Result:', healthRes.data);
    } catch (err: any) {
        console.error('   FAILED: Health check failed:', err.message);
    }

    try {
        console.log('2. Testing /analyzer/generate (Mock/Waterfall)...');
        const genRes = await axios.post(`${config.analyzerUrl}/analyzer/generate`, {
            prompt: 'Create a simple hello world button',
            framework: 'react'
        });
        console.log('   Generate Result (Preview):', genRes.data.explanation);
        console.log('   Code Length:', genRes.data.code.length);
    } catch (err: any) {
        console.error('   FAILED: Generate check failed:', err.message);
    }

    try {
        console.log('3. Testing /analyzer/blueprint/generate...');
        const blueRes = await axios.post(`${config.analyzerUrl}/analyzer/blueprint/generate`, {
            type: 'komposo',
            payload: {},
            project_name: 'Test Project'
        });
        console.log('   Blueprint Result:', blueRes.data.rootComponentId ? 'SUCCESS (UPG valid)' : 'FAILED (Invalid UPG)');
    } catch (err: any) {
        console.error('   FAILED: Blueprint check failed:', err.message);
    }

    console.log('--- Test Finished ---');
    process.exit(0);
}

testAnalyzer();
