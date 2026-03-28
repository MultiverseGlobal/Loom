"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService, Project } from "@/services/project.service";
import { analysisService } from "@/services/analysis.service";
import { toast } from "sonner";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { CodePreview } from "@/components/workspace/CodePreview";
import { HealingPanel } from "@/components/workspace/HealingPanel";
import { ArrowLeft, Box, Loader2 } from "lucide-react";

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [currentCode, setCurrentCode] = useState<string>("");
    const [isLaunching, setIsLaunching] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);

    useEffect(() => {
        const loadData = async () => {
            if (!params.id) return;
            try {
                const [projectData, analysesData] = await Promise.all([
                    projectService.getProject(params.id as string),
                    analysisService.getAnalyses(params.id as string)
                ]);

                if (!projectData) {
                    toast.error("Project not found");
                    router.push("/dashboard");
                    return;
                }

                setProject(projectData);
                setAnalyses(analysesData);

                // Set initial code from latest analysis/file if available
                if (analysesData.length > 0) {
                    const latest = analysesData[0].result_json;
                    // Try to find code, fall back to blueprint JSON if needed
                    const code = latest.analysis?.code || latest.code || (latest.blueprint ? JSON.stringify(latest.blueprint, null, 2) : "");
                    setCurrentCode(code);
                }
            } catch (err) {
                console.error("Load project data error:", err);
                toast.error("Failed to load project details");
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [params.id, router]);

    // Auto-Rescan if no analyses exist
    useEffect(() => {
        if (!loading && project && analyses.length === 0 && !isRescanning) {
            console.log("No analyses found. Triggering initial scan...");
            handleRescan();
        }
    }, [loading, project, analyses.length]);

    const handleRescan = async () => {
        if (!project || isRescanning) return;
        setIsRescanning(true);
        const toastId = toast.loading("Analyzing project architecture...");
        try {
            const result = await analysisService.analyze({
                projectId: project.id,
                source: project.platform || 'komposo',
                repo: project.source_url?.includes('github.com') ? project.source_url.split('github.com/')[1] : undefined
            });

            // Refresh analyses list
            const updatedAnalyses = await analysisService.getAnalyses(project.id);
            setAnalyses(updatedAnalyses);

            // Update current code
            const code = result.analysis?.code || result.code || (result.blueprint ? JSON.stringify(result.blueprint, null, 2) : "");
            setCurrentCode(code);

            toast.success("Analysis complete!", { id: toastId });
        } catch (err: any) {
            console.error("Rescan error:", err);
            toast.error("Analysis failed: " + (err.message || "Unknown error"), { id: toastId });
        } finally {
            setIsRescanning(false);
        }
    };

    const handleLaunchExtension = async () => {
        if (!project) return;
        setIsLaunching(true);
        try {
            const result = await projectService.pushToIDE(project.id);
            if (result.success) {
                toast.success("Pushing to VS Code...");
            } else {
                toast.error("Failed to connect to IDE");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to launch extension");
        } finally {
            setIsLaunching(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-[var(--bg-root)]">
                <Loader2 className="w-8 h-8 animate-spin text-[var(--accent-primary)] mb-4" />
                <p className="text-[13px] text-[var(--text-tertiary)] uppercase tracking-widest font-bold">Initializing Workspace...</p>
            </div>
        );
    }

    if (!project) return null;

    return (
        <div className="flex flex-col h-screen bg-[var(--bg-root)] overflow-hidden">
            {/* Top Navigation / Controls */}
            <WorkspaceControls 
                projectId={project.id}
                projectName={project.name}
                isLaunching={isLaunching}
                onLaunchExtension={handleLaunchExtension}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex flex-1 p-6 gap-6 overflow-hidden">
                    
                    {/* Left Pane: Project Overview / Blueprint */}
                    <div className="flex flex-col w-[350px] gap-6 overflow-y-auto">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-xs group"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </button>

                        <div className="p-6 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] space-y-6 shadow-sm">
                            <div className="space-y-2">
                                <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">Origin</h3>
                                <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-root)] border border-[var(--border-subtle)]">
                                    <Box size={14} className="text-[var(--accent-primary)]" />
                                    <span className="text-[13px] text-[var(--text-primary)] font-medium truncate">
                                        {project.source_url || 'Manual Migration'}
                                    </span>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">Framework</h3>
                                <p className="text-[15px] font-medium text-[var(--text-primary)]">{project.framework || 'Next.js 14'}</p>
                            </div>

                            <div className="pt-6 border-t border-[var(--border-subtle)] space-y-4">
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--text-secondary)]">Status</span>
                                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-bold uppercase tracking-wider">Ready</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--text-secondary)]">Version</span>
                                    <span className="text-[11px] font-mono text-[var(--text-tertiary)]">v1.2.4-stable</span>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Snapshot */}
                        <div className="p-6 rounded-2xl bg-[#8b5cf6]/5 border border-[#8b5cf6]/10 space-y-4">
                            <h3 className="text-xs font-bold text-[#8b5cf6] uppercase tracking-widest">Health Score</h3>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold text-[#8b5cf6]">
                                    {analyses.length > 0 ? (analyses[0].result_json.analysis?.score || 100) : 100}
                                </span>
                                <span className="text-xs text-[#8b5cf6]/60 mb-1">/ 100</span>
                            </div>
                            <p className="text-[11px] text-[#8b5cf6]/80 leading-relaxed">
                                {analyses.length > 0 
                                    ? (analyses[0].result_json.analysis?.summary || "Architecture is optimal. AI-ready for production.")
                                    : "Architecture is optimal. AI-ready for production."}
                            </p>
                        </div>
                    </div>

                    {/* Right Pane: Code Preview */}
                    <div className="flex-1 overflow-hidden">
                        <CodePreview 
                            code={currentCode || "// No code generated yet. Run a scan to begin."}
                            filename={`${project.name.replace(/\s+/g, '')}.tsx`}
                        />
                    </div>
                </div>

                {/* Healing Panel (Sidebar) */}
                <HealingPanel 
                    onRescan={handleRescan}
                    isRescanning={isRescanning}
                    events={analyses.flatMap(analysis => (analysis.result_json.analysis?.issues || []).map((issue: any, index: number) => ({
                        id: `${analysis.id}-${index}`,
                        type: issue.type === 'error' || issue.type === 'warning' ? 'fix' : (issue.type === 'info' ? 'info' : 'optimization'),
                        message: issue.message,
                        detail: issue.detail,
                        timestamp: new Date(analysis.created_at)
                    })))}
                />
            </div>
        </div>
    );
}
