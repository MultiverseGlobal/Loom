import { UniversalProjectGraph } from "../upg/schema";
import { VSCodeAdapter } from "../adapters/vscode";
import { LoveableAdapter } from "../adapters/loveable";

export type SourcePlatform = 'vscode' | 'loveable' | 'figma';
export type TargetPlatform = 'vscode' | 'loveable' | 'figma' | 'github';

export interface SyncRequest {
    sourcePlatform: SourcePlatform;
    targetPlatform: TargetPlatform;
    sourceData: any; // Platform-specific data
    options?: {
        preserveFormatting?: boolean;
        autoFix?: boolean;
    };
}

export interface SyncResult {
    success: boolean;
    upg?: UniversalProjectGraph;
    targetData?: any;
    errors?: string[];
    warnings?: string[];
}

/**
 * The Sync Engine orchestrates bidirectional conversions between different platforms
 * via the Universal Project Graph (UPG)
 */
export class SyncEngine {
    private vscodeAdapter: VSCodeAdapter;
    private loveableAdapter: LoveableAdapter;

    constructor() {
        this.vscodeAdapter = new VSCodeAdapter();
        this.loveableAdapter = new LoveableAdapter();
    }

    /**
     * Main sync method: converts from source platform to target platform
     * Source -> UPG -> Target
     */
    async sync(request: SyncRequest): Promise<SyncResult> {
        const errors: string[] = [];
        const warnings: string[] = [];

        try {
            // Step 1: Convert source to UPG
            let upg: UniversalProjectGraph;

            switch (request.sourcePlatform) {
                case 'vscode':
                    if (typeof request.sourceData !== 'string') {
                        throw new Error("VS Code adapter requires source code as string");
                    }
                    upg = this.vscodeAdapter.toUPG(request.sourceData);
                    break;

                case 'loveable':
                    upg = this.loveableAdapter.toUPG(request.sourceData);
                    break;

                case 'figma':
                    throw new Error("Figma adapter not yet implemented");

                default:
                    throw new Error(`Unsupported source platform: ${request.sourcePlatform}`);
            }

            // Step 2: Validate UPG (optional)
            const validationResult = this.validateUPG(upg);
            if (validationResult.warnings.length > 0) {
                warnings.push(...validationResult.warnings);
            }
            if (!validationResult.isValid) {
                throw new Error(`Invalid UPG: ${validationResult.errors.join(', ')}`);
            }

            // Step 3: Convert UPG to target
            let targetData: any;

            switch (request.targetPlatform) {
                case 'vscode':
                    targetData = this.vscodeAdapter.toCode(upg);
                    break;

                case 'loveable':
                    targetData = this.loveableAdapter.toLoveable(upg);
                    break;

                case 'figma':
                    throw new Error("Figma adapter not yet implemented");

                case 'github':
                    // For GitHub, we generate code files ready to be committed
                    targetData = {
                        files: [
                            {
                                path: `src/components/${(upg.nodes[upg.rootComponentId] as any).name}.tsx`,
                                content: this.vscodeAdapter.toCode(upg)
                            }
                        ]
                    };
                    break;

                default:
                    throw new Error(`Unsupported target platform: ${request.targetPlatform}`);
            }

            return {
                success: true,
                upg,
                targetData,
                warnings: warnings.length > 0 ? warnings : undefined
            };

        } catch (error: any) {
            errors.push(error.message || 'Unknown error');
            return {
                success: false,
                errors,
                warnings: warnings.length > 0 ? warnings : undefined
            };
        }
    }

    /**
     * Parse source data to UPG only (no target conversion)
     */
    async parse(sourcePlatform: SourcePlatform, sourceData: any): Promise<UniversalProjectGraph> {
        const result = await this.sync({
            sourcePlatform,
            targetPlatform: sourcePlatform as any, // Dummy target
            sourceData
        });

        if (!result.success || !result.upg) {
            throw new Error(result.errors?.join(', ') || 'Parse failed');
        }

        return result.upg;
    }

    /**
     * Generate target data from UPG
     */
    async generate(targetPlatform: TargetPlatform, upg: UniversalProjectGraph): Promise<any> {
        switch (targetPlatform) {
            case 'vscode':
                return this.vscodeAdapter.toCode(upg);

            case 'loveable':
                return this.loveableAdapter.toLoveable(upg);

            case 'github':
                return {
                    files: [
                        {
                            path: `src/components/${(upg.nodes[upg.rootComponentId] as any).name}.tsx`,
                            content: this.vscodeAdapter.toCode(upg)
                        }
                    ]
                };

            default:
                throw new Error(`Unsupported target platform: ${targetPlatform}`);
        }
    }

    /**
     * Validates the UPG structure
     */
    private validateUPG(upg: UniversalProjectGraph): {
        isValid: boolean;
        errors: string[];
        warnings: string[];
    } {
        const errors: string[] = [];
        const warnings: string[] = [];

        // Check if root component exists
        if (!upg.nodes[upg.rootComponentId]) {
            errors.push("Root component not found");
            return { isValid: false, errors, warnings };
        }

        // Check all nodes have valid parent references (except root)
        Object.entries(upg.nodes).forEach(([id, node]) => {
            if (id !== upg.rootComponentId && node.parent) {
                if (!upg.nodes[node.parent]) {
                    warnings.push(`Node ${id} references non-existent parent ${node.parent}`);
                }
            }

            // Check all children exist
            node.children.forEach(childId => {
                if (!upg.nodes[childId]) {
                    warnings.push(`Node ${id} references non-existent child ${childId}`);
                }
            });
        });

        return {
            isValid: errors.length === 0,
            errors,
            warnings
        };
    }

    /**
     * Get adapter statistics
     */
    getStats(): {
        supportedPlatforms: { source: SourcePlatform[]; target: TargetPlatform[] };
    } {
        return {
            supportedPlatforms: {
                source: ['vscode', 'loveable'],
                target: ['vscode', 'loveable', 'github']
            }
        };
    }
}
