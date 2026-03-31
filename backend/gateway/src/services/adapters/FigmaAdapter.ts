import { ShiftBlueprint, BridgeAdapter, BlueprintNode } from './types.js';
import { figmaService } from '../../services/figmaService.js';
import axios from 'axios';

export class FigmaAdapter implements BridgeAdapter {
    id = 'figma';

    canHandle(url: string): boolean {
        return url.includes('figma.com/file/') || url.includes('figma.com/design/');
    }

    async getBlueprint(url: string, options: Record<string, any>): Promise<ShiftBlueprint | null> {
        const { token, nodeId } = options;
        if (!token) throw new Error("Figma token required");

        const match = url.match(/figma\.com\/(?:file|design)\/([a-zA-Z0-9]+)/);
        if (!match || !match[1]) throw new Error("Invalid Figma URL");
        const fileKey = match[1];

        try {
            const response = await axios.get(`https://api.figma.com/v1/files/${fileKey}?ids=${nodeId || '0:1'}`, {
                headers: { 'X-Figma-Token': token }
            });

            const effectiveNodeId = nodeId || Object.keys(response.data.nodes)[0];
            const nodeData = response.data.nodes[effectiveNodeId];
            if (!nodeData) return null;

            const document = nodeData.document;
            return {
                version: "1.0",
                source: {
                    type: "figma",
                    id: effectiveNodeId,
                    url: url,
                    fileName: response.data.name,
                    lastModified: response.data.lastModified
                },
                root: this.convertToBlueprint(document),
                theme: {
                    colors: {},
                    spacing: {}
                }
            };
        } catch (error) {
            console.error('[FigmaAdapter] Error:', error);
            return null;
        }
    }

    private convertToBlueprint(node: any): BlueprintNode {
        const typeMap: Record<string, any> = {
            'FRAME': 'view',
            'GROUP': 'view',
            'RECTANGLE': 'view',
            'TEXT': 'text',
            'INSTANCE': 'view',
            'COMPONENT': 'view',
            'VECTOR': 'image'
        };

        const blueprintNode: BlueprintNode = {
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
    }

    private mapLayout(node: any): any {
        const layout: any = {};
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
        return layout;
    }

    private mapStyle(node: any): any {
        const style: any = {};
        if (node.fills && node.fills.length > 0 && node.fills[0].type === 'SOLID') {
            const fill = node.fills[0].color;
            if (fill) {
                style.backgroundColor = `rgba(${Math.round(fill.r * 255)}, ${Math.round(fill.g * 255)}, ${Math.round(fill.b * 255)}, ${node.fills[0].opacity || 1})`;
            }
        }
        if (node.cornerRadius) style.borderRadius = node.cornerRadius;
        if (node.type === 'TEXT' && node.style) {
            style.fontSize = node.style.fontSize;
            style.fontWeight = node.style.fontWeight;
            style.fontFamily = node.style.fontFamily;
        }
        return style;
    }
}
