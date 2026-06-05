"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { CheckCircle2, FileCode, Layers, GitBranch, ArrowRight, Loader2 } from "lucide-react";
import clsx from "clsx";

interface UPGNode {
    id: string;
    type: string;
    name?: string;
    tag?: string;
    content?: string;
    children?: string[];
}

interface BlueprintData {
    rootComponentId: string;
    nodes: Record<string, UPGNode>;
}

export default function BlueprintReviewPage() {
    const params = useParams();
    const router = useRouter();
    const projectId = params.id as string;

    const [blueprint, setBlueprint] = useState<BlueprintData | null>(null);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        const data = localStorage.getItem(`blueprint_${projectId}`);
        if (data) {
            setBlueprint(JSON.parse(data));
        }
    }, [projectId]);

    const handleApprove = async () => {
        setGenerating(true);
        // Here we would normally call the backend to start actual code generation
        // using the approved blueprint. For now, we simulate the delay.
        setTimeout(() => {
            alert("Blueprint approved! In a full implementation, this would trigger the AI generation pipeline.");
            setGenerating(false);
            router.push(`/projects/${projectId}`);
        }, 2000);
    };

    const renderNodeTree = (nodeId: string, depth = 0) => {
        if (!blueprint) return null;
        const node = blueprint.nodes[nodeId];
        if (!node) return null;

        const isComponent = node.type === "component";
        const isElement = node.type === "element";

        return (
            <div key={node.id} className="font-mono text-[13px]">
                <div 
                    className={clsx(
                        "flex items-center gap-2 py-1.5 px-2 rounded-md hover:bg-[var(--bg-hover)] transition-colors cursor-default",
                        isComponent && "text-[var(--accent-primary)] font-semibold",
                        isElement && "text-[var(--text-secondary)]"
                    )}
                    style={{ paddingLeft: `${depth * 1.5 + 0.5}rem` }}
                >
                    {isComponent ? <Layers size={14} /> : <FileCode size={14} />}
                    <span>
                        {isComponent ? node.name : node.tag ? `<${node.tag}>` : "Text"}
                    </span>
                    {node.content && (
                        <span className="text-[var(--text-tertiary)] truncate max-w-[200px] ml-2">
                            "{node.content}"
                        </span>
                    )}
                </div>
                {node.children && node.children.map(childId => renderNodeTree(childId, depth + 1))}
            </div>
        );
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto space-y-8">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-medium text-[var(--text-primary)] flex items-center gap-2">
                            <GitBranch size={24} className="text-[var(--accent-primary)]" />
                            Blueprint Review
                        </h1>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                            Review the AI's proposed React component structure before generating code.
                        </p>
                    </div>
                    <button
                        onClick={handleApprove}
                        disabled={generating || !blueprint}
                        className="flex items-center gap-2 rounded-md bg-[var(--accent-primary)] px-5 py-2.5 text-[13px] font-medium text-white shadow-[0_0_15px_var(--accent-glow)] hover:opacity-90 disabled:opacity-50 transition-all"
                    >
                        {generating ? (
                            <>
                                <Loader2 size={16} className="animate-spin" />
                                Generating Code...
                            </>
                        ) : (
                            <>
                                Approve & Generate <ArrowRight size={16} />
                            </>
                        )}
                    </button>
                </div>

                {!blueprint ? (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-12 text-center text-[var(--text-secondary)]">
                        No blueprint found for this project. Please go back to the ingestion page and upload a Webflow export.
                    </div>
                ) : (
                    <div className="grid grid-cols-3 gap-6">
                        <div className="col-span-2 rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-sm overflow-hidden flex flex-col">
                            <div className="border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)] px-4 py-3 flex items-center gap-2">
                                <FileCode size={16} className="text-[var(--text-secondary)]" />
                                <span className="text-[13px] font-medium text-[var(--text-primary)]">Proposed Component Tree</span>
                            </div>
                            <div className="p-4 overflow-y-auto max-h-[600px] bg-[var(--bg-root)]">
                                {renderNodeTree(blueprint.rootComponentId)}
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-5">
                                <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-4">Summary</h3>
                                <div className="space-y-3 text-[13px]">
                                    <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                                        <span className="text-[var(--text-secondary)]">Total Nodes:</span>
                                        <span className="text-[var(--text-primary)] font-medium">{Object.keys(blueprint.nodes).length}</span>
                                    </div>
                                    <div className="flex justify-between border-b border-[var(--border-subtle)] pb-2">
                                        <span className="text-[var(--text-secondary)]">Framework:</span>
                                        <span className="text-[var(--text-primary)] font-medium">React (Next.js)</span>
                                    </div>
                                    <div className="flex justify-between pb-2">
                                        <span className="text-[var(--text-secondary)]">CSS:</span>
                                        <span className="text-[var(--text-primary)] font-medium">Tailwind CSS</span>
                                    </div>
                                </div>
                            </div>
                            
                            <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-5">
                                <h3 className="flex items-center gap-2 text-[14px] font-medium text-[var(--text-primary)] mb-3">
                                    <CheckCircle2 size={16} className="text-emerald-500" />
                                    Next Steps
                                </h3>
                                <ul className="space-y-2 text-[13px] text-[var(--text-secondary)]">
                                    <li>1. Review the proposed tree structure to ensure major sections are captured.</li>
                                    <li>2. Click "Approve & Generate" to trigger the LLM to write the React code.</li>
                                    <li>3. Wait for the generation to complete and sync to your GitHub repo.</li>
                                </ul>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
