
import { BridgeAdapter, ShiftBlueprint } from './types.js';
import { FigmaAdapter } from './FigmaAdapter.js';
import { LovableAdapter } from './LovableAdapter.js';
import { ScraperAdapter } from './ScraperAdapter.js';

class AdaptersRegistry {
    private adapters: BridgeAdapter[] = [];

    constructor() {
        // Register adapters in order of priority (specific first, then generic)
        this.adapters.push(new FigmaAdapter());
        this.adapters.push(new LovableAdapter());
        // Scraper is the fallback
        this.adapters.push(new ScraperAdapter());
    }

    /**
     * Find the adapter that can handle the given URL
     */
    getAdapterFor(url: string): BridgeAdapter | null {
        return this.adapters.find(a => a.canHandle(url)) || null;
    }

    /**
     * Universal bridge call
     */
    async getBlueprint(url: string, options: Record<string, any>): Promise<ShiftBlueprint | null> {
        const adapter = this.getAdapterFor(url);
        if (!adapter) {
            console.warn(`[Registry] No adapter found for URL: ${url}`);
            return null;
        }
        console.log(`[Registry] Using adapter: ${adapter.id} for URL: ${url}`);
        return adapter.getBlueprint(url, options);
    }
}

export const adaptersRegistry = new AdaptersRegistry();
