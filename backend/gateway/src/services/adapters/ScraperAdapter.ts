
import { ShiftBlueprint, BridgeAdapter } from './types.js';
import { ScraperService } from '../scraper.service.js';

export class ScraperAdapter implements BridgeAdapter {
    id = 'scraper';

    canHandle(url: string): boolean {
        // Catch-all for http/https URLs that aren't specific to other adapters
        return url.startsWith('http') && !url.includes('figma.com');
    }

    async getBlueprint(url: string, _options: Record<string, any>): Promise<ShiftBlueprint | null> {
        try {
            console.log(`[Scraper] Starting Neural Bridge for generic site: ${url}`);
            
            const result = await ScraperService.getVisualTree(url);
            
            if (!result) {
                console.error(`[Scraper] Failed to extract visual tree from ${url}`);
                return null;
            }

            const { tree, method, fidelity } = result;

            return {
                version: "1.0",
                source: {
                    type: "scraper",
                    id: "web-bridge",
                    url: url,
                    fileName: url.split('/').pop() || 'Imported Site'
                },
                root: tree,
                theme: {
                    colors: { 
                        background: tree.style?.backgroundColor || "#ffffff", 
                        primary: "#000000" 
                    },
                    spacing: { default: "16px" }
                },
                scrapeMethod: method,
                fidelityScore: fidelity
            };
        } catch (error) {
            console.error('[Scraper] Error during web bridging:', error);
            return null;
        }
    }
}
