import axios from 'axios';
import { db } from '../db/client.js';
import { config } from '../config.js';
import { formatBlueprintPrompt } from './aiService.js';
import { adaptersRegistry } from './adapters/AdaptersRegistry.js';

export const bridgeService = {
    /**
     * Universal entry point to bridge a No-Code source to a Loom project
     */
    async bridgeFromSource(params: {
        sourceUrl: string;
        options: Record<string, any>;
        userId: string;
    }) {
        console.log(`[Bridge] Starting universal bridge for Source: ${params.sourceUrl}`);

        // 1. Get the blueprint using the registry
        const blueprint = await adaptersRegistry.getBlueprint(params.sourceUrl, params.options);
        if (!blueprint) {
            throw new Error(`Failed to extract blueprint from source: ${params.sourceUrl}`);
        }

        console.log(`[Bridge] Blueprint extracted successfully: ${blueprint.root.name} (Source: ${blueprint.source.type})`);

        // 2. Format the prompt for the AI
        const prompt = formatBlueprintPrompt(blueprint);

        // 3. Call the Analyzer (AI Generator)
        console.log(`[Bridge] Calling Analyzer at ${config.analyzerUrl}/analyzer/generate`);
        const response = await axios.post(`${config.analyzerUrl}/analyzer/generate`, {
            prompt,
            framework: 'nextjs'
        });

        const { code, explanation } = response.data;
        console.log(`[Bridge] AI Generation Successful! Code length: ${code.length}`);

        // 4. Package results
        return {
            blueprint,
            code,
            explanation
        };
    }
};
