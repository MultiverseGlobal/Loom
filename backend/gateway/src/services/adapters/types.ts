
export interface BlueprintNode {
    id: string;
    type: "view" | "text" | "image" | "button" | "input" | "list";
    name: string;
    layout: Record<string, any>;
    style: Record<string, any>;
    children?: BlueprintNode[];
    content?: string;
}

export interface ShiftBlueprint {
    version: string;
    source: {
        type: string;
        id: string;
        url: string;
        fileName?: string;
        lastModified?: string;
    };
    root: BlueprintNode;
    theme: {
        colors: Record<string, string>;
        spacing: Record<string, string>;
    };
    scrapeMethod?: 'deep' | 'static';
    fidelityScore?: number;
}

export interface BridgeAdapter {
    /**
     * Unique identifier for the adapter (e.g., 'figma', 'lovable', 'scraper')
     */
    id: string;

    /**
     * Check if this adapter supports the given URL
     */
    canHandle(url: string): boolean;

    /**
     * Extract data from the source and convert it to a Shift Blueprint
     */
    getBlueprint(url: string, options: Record<string, any>): Promise<ShiftBlueprint | null>;
}
