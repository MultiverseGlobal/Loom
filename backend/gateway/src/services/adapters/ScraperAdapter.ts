
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
            
            const rootNode = await ScraperService.getVisualTree(url);
            
            if (!rootNode) {
                console.error(`[Scraper] Failed to extract visual tree from ${url}`);
                return null;
            }

            return {
                version: "1.0",
                source: {
                    type: "scraper",
                    id: "web-bridge",
                    url: url,
                    fileName: url.split('/').pop() || 'Imported Site'
                },
                root: rootNode,
                theme: {
                    colors: { 
                        background: rootNode.style?.backgroundColor || "#ffffff", 
                        primary: "#000000" 
                    },
                    spacing: { default: "16px" }
                }
            };
        } catch (error) {
            console.error('[Scraper] Error during web bridging:', error);
            return null;
        }
    }
}
