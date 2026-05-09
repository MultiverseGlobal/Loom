
import { ScraperService } from '../src/services/scraper.service.js';

async function test() {
    const url = process.argv[2] || 'https://example.com';
    console.log(`Testing scraper with URL: ${url}`);
    
    try {
        const result = await ScraperService.getVisualTree(url);
        if (result) {
            console.log('SUCCESS: Extracted visual tree');
            console.log(`Scrape Method: ${result.scrape_method}`);
            console.log(`Fidelity Score: ${result.fidelity_score}`);
            console.log(JSON.stringify(result, null, 2).substring(0, 500) + '...');
        } else {
            console.log('FAILED: No result returned');
        }
    } catch (error) {
        console.error('ERROR during test:', error);
    } finally {
        process.exit(0);
    }
}

test();
