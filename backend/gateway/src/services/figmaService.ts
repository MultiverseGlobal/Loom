import axios from 'axios';

export interface FigmaFile {
    document: any;
    name: string;
    lastModified: string;
    thumbnailUrl: string;
}

export const figmaService = {
    /**
     * Validate a Figma Personal Access Token
     */
    async validateToken(token: string): Promise<boolean> {
        try {
            const response = await axios.get('https://api.figma.com/v1/me', {
                headers: {
                    'X-Figma-Token': token
                }
            });
            return response.status === 200;
        } catch (error) {
            return false;
        }
    },

    /**
     * Fetch Figma node data and return it for AI analysis
     */
    async getBlueprint(fileKey: string, nodeId: string, token: string): Promise<any> {
        try {
            console.log(`[FigmaService] Fetching node ${nodeId} from ${fileKey}`);
            const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}/nodes?ids=${nodeId}`, {
                headers: { 'X-Figma-Token': token }
            });
            
            // Return raw node data for AI processing
            const nodeData = response.data.nodes[nodeId];
            return nodeData;
        } catch (error: any) {
            console.error('Error fetching Figma node:', error.response?.data || error.message);
            return null;
        }
    },


    /**
     * Recursive function to map Figma nodes to Blueprint nodes
     */
    convertToBlueprint(node: any): any {
        const typeMap: Record<string, string> = {
            'FRAME': 'view',
            'GROUP': 'view',
            'RECTANGLE': 'view',
            'TEXT': 'text',
            'INSTANCE': 'view',
            'COMPONENT': 'view',
            'VECTOR': 'image'
        };

        const blueprintNode: any = {
            id: node.id,
            type: typeMap[node.type] || 'view',
            name: node.name,
            layout: this.mapLayout(node),
            style: this.mapStyle(node)
        };

        if (node.type === 'TEXT') {
            blueprintNode.content = node.characters;
        }

        if (node.children && node.children.length > 0) {
            blueprintNode.children = node.children.map((child: any) => this.convertToBlueprint(child));
        }

        return blueprintNode;
    },

    mapLayout(node: any): any {
        const layout: any = {};

        // Handle Auto-Layout (Figma's Flexbox)
        if (node.layoutMode === 'HORIZONTAL') layout.flexDirection = 'row';
        if (node.layoutMode === 'VERTICAL') layout.flexDirection = 'column';

        if (node.itemSpacing) layout.gap = node.itemSpacing;

        if (node.paddingTop) {
            layout.padding = {
                top: node.paddingTop,
                right: node.paddingRight,
                bottom: node.paddingBottom,
                left: node.paddingLeft
            };
        }

        // Mapping alignment
        if (node.primaryAxisAlignItems === 'SPACE_BETWEEN') layout.justifyContent = 'space-between';
        else if (node.primaryAxisAlignItems === 'CENTER') layout.justifyContent = 'center';
        else if (node.primaryAxisAlignItems === 'MAX') layout.justifyContent = 'end';
        else layout.justifyContent = 'start';

        return layout;
    },

    mapStyle(node: any): any {
        const style: any = {};

        // Colors
        if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
            const fill = node.fills[0].color;
            if (fill) {
                style.backgroundColor = `rgba(${Math.round(fill.r * 255)}, ${Math.round(fill.g * 255)}, ${Math.round(fill.b * 255)}, ${node.fills[0].opacity || 1})`;
            }
        }

        if (node.cornerRadius) style.borderRadius = node.cornerRadius;

        // Typography
        if (node.type === 'TEXT' && node.style) {
            style.fontSize = node.style.fontSize;
            style.fontWeight = node.style.fontWeight;
            style.fontFamily = node.style.fontFamily;
        }

        return style;
    }
};
