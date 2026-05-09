
import { BridgeAdapter, ShiftBlueprint, BlueprintNode } from './types.js';
import { ScraperService } from '../scraper.service.js';

export class LovableAdapter implements BridgeAdapter {
    id = 'lovable';

    canHandle(url: string): boolean {
        return url.includes('lovable.dev/') || url.includes('localhost:5173'); // Lovable often runs on 5173
    }

    async getBlueprint(url: string, _options: Record<string, any>): Promise<ShiftBlueprint | null> {
        try {
            console.log(`[Lovable] Starting Neural Bridge for: ${url}`);
            
            const rootNode = await ScraperService.getVisualTree(url);
            
            if (!rootNode) {
                console.error(`[Lovable] Failed to extract visual tree from ${url}`);
                return null;
            }

            return {
                version: "1.0",
                source: {
                    type: "lovable",
                    id: "lovable-bridge",
                    url: url,
                },
                root: rootNode,
                theme: {
                    colors: { 
                        background: rootNode.style?.backgroundColor || "#ffffff", 
                        primary: "#7c3aed" // Default Lovable primary or extracted
                    },
                    spacing: { default: "20px" }
                }
            };
        } catch (error) {
            console.error('[Lovable] Error during bridging:', error);
            return null;
        }
    }
}
