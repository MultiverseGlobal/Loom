
import { ScraperService } from '../services/scraper.service.js';

async function test() {
    const url = process.argv[2] || 'https://example.com';
    console.log(`Testing scraper with: ${url}`);
    
    try {
        const result = await ScraperService.getVisualTree(url);
        console.log('--- SCRAPE RESULT ---');
        console.log(JSON.stringify(result, null, 2));
    } catch (error) {
        console.error('Test failed:', error);
    }
}

test();
