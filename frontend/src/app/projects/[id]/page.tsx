"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService, Project } from "@/services/project.service";
import { analysisService } from "@/services/analysis.service";
import { toast } from "sonner";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { CodePreview } from "@/components/workspace/CodePreview";
import { HealingPanel } from "@/components/workspace/HealingPanel";
import { LiveTerminal } from "@/components/workspace/LiveTerminal";
import { ArrowLeft, Box, Loader2, Terminal, X, Copy } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [currentCode, setCurrentCode] = useState<string>("");
    const [isLaunching, setIsLaunching] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);
    const [showCliModal, setShowCliModal] = useState(false);
    const [cliToken, setCliToken] = useState("");

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
            const supabase = createClient();
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.access_token) {
                setCliToken(session.access_token);
                setShowCliModal(true);
            } else {
                toast.error("Authentication required to generate export token");
            }
        } catch (err: any) {
            toast.error(err.message || "Failed to generate command");
        } finally {
            setIsLaunching(false);
        }
    };

    const handleFix = async (event: any) => {
        if (!project) return;
        const toastId = toast.loading("AI is calculating the fix...");
        try {
            const result = await analysisService.fix(
                project.id,
                event.message,
                currentCode,
                `${project.name.replace(/\s+/g, '')}.tsx`
            );

            setCurrentCode(result.fixedCode);
            toast.success("Code fixed successfully!", { id: toastId });
            
            // Log the explanation to the Terminal
            socketService.send({
                type: 'LOG',
                payload: {
                    message: `AI Fix Applied: ${result.explanation}`,
                    type: 'success'
                }
            });
        } catch (err: any) {
            console.error("Fix error:", err);
            toast.error("Failed to apply fix: " + (err.message || "Unknown error"), { id: toastId });
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
                                    <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[9px] font-bold uppercase tracking-wider shadow-[0_0_10px_var(--accent-glow)]">Ready</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--text-secondary)]">Ship Status</span>
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_var(--accent-glow)]" />
                                        <span className="text-[9px] font-bold text-[var(--text-primary)] uppercase tracking-tight">Vercel: Live</span>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-[11px] text-[var(--text-secondary)]">Version</span>
                                    <span className="text-[11px] font-mono text-[var(--text-tertiary)]">v1.2.4-stable</span>
                                </div>
                            </div>
                        </div>

                        {/* Analysis Snapshot */}
                        <div className="p-6 rounded-2xl bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 space-y-4 shadow-[0_0_30px_rgba(0,245,255,0.03)]">
                            <h3 className="text-xs font-bold text-[var(--accent-primary)] uppercase tracking-[0.2em]">Health Score</h3>
                            <div className="flex items-end gap-2">
                                <span className="text-4xl font-bold text-[var(--accent-primary)] drop-shadow-[0_0_15px_var(--accent-glow)]">
                                    {analyses.length > 0 ? (analyses[0].result_json.analysis?.score || 100) : 100}
                                </span>
                                <span className="text-xs text-[var(--accent-primary)]/60 mb-1">/ 100</span>
                            </div>
                            <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed">
                                {analyses.length > 0 
                                    ? (analyses[0].result_json.analysis?.summary || "Architecture is optimal. AI-ready for production.")
                                    : "Architecture is optimal. AI-ready for production."}
                            </p>
                        </div>

                        {/* Live AI Terminal */}
                        <LiveTerminal />
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
                    onFix={handleFix}
                    events={analyses.flatMap(analysis => (analysis.result_json.analysis?.issues || []).map((issue: any, index: number) => ({
                        id: `${analysis.id}-${index}`,
                        type: issue.type === 'error' || issue.type === 'warning' ? 'fix' : (issue.type === 'info' ? 'info' : 'optimization'),
                        message: issue.message,
                        detail: issue.detail,
                        timestamp: new Date(analysis.created_at)
                    })))}
                />
            </div>

            {/* CLI Modal */}
            {showCliModal && project && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                    <div className="w-[500px] bg-[var(--bg-panel)] border border-[var(--border-subtle)] rounded-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="flex items-center justify-between p-4 border-b border-[var(--border-subtle)]">
                            <div className="flex items-center gap-2">
                                <Terminal className="w-5 h-5 text-[var(--accent-primary)]" />
                                <h3 className="font-bold text-[var(--text-primary)]">Sync via CLI</h3>
                            </div>
                            <button onClick={() => setShowCliModal(false)} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <p className="text-sm text-[var(--text-secondary)]">Run this command in your terminal to instantly sync all AI-generated components into your local project workspace.</p>
                            <div className="relative group">
                                <pre className="p-4 bg-[var(--bg-root)] rounded-lg border border-[var(--border-subtle)] overflow-x-auto text-[13px] font-mono text-[var(--text-primary)]">
                                    {`npx shift-ai-cli pull ${project.id} -t ${cliToken}`}
                                </pre>
                                <button 
                                    onClick={() => {
                                        navigator.clipboard.writeText(`npx shift-ai-cli pull ${project.id} -t ${cliToken}`);
                                        toast.success("Command copied to clipboard!");
                                    }}
                                    className="absolute right-2 top-2 p-2 bg-[var(--bg-panel)] rounded border border-[var(--border-subtle)] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[var(--accent-primary)] hover:border-[var(--accent-primary)] hover:text-white text-[var(--text-secondary)]"
                                >
                                    <Copy className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-[11px] text-[var(--text-tertiary)] font-mono">
                                Token expires in 60 minutes. Keep it secret.
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
