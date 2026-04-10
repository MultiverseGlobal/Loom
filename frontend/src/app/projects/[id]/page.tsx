"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { projectService, Project } from "@/services/project.service";
import { analysisService } from "@/services/analysis.service";
import { toast } from "sonner";
import { WorkspaceControls } from "@/components/workspace/WorkspaceControls";
import { CodePreview } from "@/components/workspace/CodePreview";
import { HealingPanel } from "@/components/workspace/HealingPanel";
import { LiveTerminal } from "@/components/workspace/LiveTerminal";
import { FileBrowser } from "@/components/workspace/FileBrowser";
import { ArrowLeft, Box, Loader2, Terminal, X, Copy, ChevronRight, Layout } from "lucide-react";
import { createClient } from "@/lib/supabase";
import { socketService } from "@/services/socket";

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyses, setAnalyses] = useState<any[]>([]);
    
    // File State
    const [files, setFiles] = useState<any[]>([]);
    const [selectedFile, setSelectedFile] = useState<any | null>(null);
    const [currentCode, setCurrentCode] = useState<string>("");
    
    const [isLaunching, setIsLaunching] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);
    const [isRescanning, setIsRescanning] = useState(false);
    const [showCliModal, setShowCliModal] = useState(false);
    const [cliToken, setCliToken] = useState("");

    const loadFiles = useCallback(async (projectId: string) => {
        try {
            const projectFiles = await projectService.getProjectFiles(projectId);
            setFiles(projectFiles);
            
            // Auto-select first file if none selected
            if (projectFiles.length > 0 && !selectedFile) {
                // To avoid redundant loads, we just set the content if it's there
                // But usually we'd want to fetch the content if it's missing
                setSelectedFile(projectFiles[0]);
                setCurrentCode(projectFiles[0].content || "");
            }
        } catch (err) {
            console.error("Failed to load project files:", err);
        }
    }, [selectedFile]);

    useEffect(() => {
        const loadData = async () => {
            if (!params.id) return;
            try {
                const [projectData, analysesData] = await Promise.all([
                    projectService.getProject(params.id as string),
                    analysisService.getAnalyses(params.id as string),
                ]);

                if (!projectData) {
                    toast.error("Project not found");
                    router.push("/dashboard");
                    return;
                }

                setProject(projectData);
                setAnalyses(analysesData);

                // Load real generated files
                await loadFiles(projectData.id);

                // Fallback for initial code if no files yet
                if (analysesData.length > 0 && files.length === 0) {
                    const latest = analysesData[0].result_json;
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
    }, [params.id, router, loadFiles]); // Added loadFiles to deps since it is memoized

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
        
        const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Analysis timed out. The backend might be cold-starting or overloaded.")), 45000)
        );

        try {
            const analysisPromise = (async () => {
                const result = await analysisService.analyze({
                    projectId: project.id,
                    source: project.platform || 'komposo',
                    repo: project.source_url?.includes('github.com') ? project.source_url.split('github.com/')[1] : undefined
                });

                // Refresh everything
                const [updatedAnalyses] = await Promise.all([
                    analysisService.getAnalyses(project.id),
                    loadFiles(project.id)
                ]);
                
                setAnalyses(updatedAnalyses);

                const code = result.analysis?.code || result.code || (result.blueprint ? JSON.stringify(result.blueprint, null, 2) : "");
                if (files.length === 0) setCurrentCode(code);
                
                return result;
            })();

            await Promise.race([analysisPromise, timeoutPromise]);
            toast.success("Analysis complete!", { id: toastId });
        } catch (err: any) {
            console.error("Rescan error:", err);
            toast.error("Analysis failed: " + (err.message || "Unknown error"), { id: toastId });
        } finally {
            setIsRescanning(false);
        }
    };

    const handleDownload = async () => {
        if (!project) return;
        setIsDownloading(true);
        const toastId = toast.loading(`Bundling ${project.name}...`);
        try {
            await projectService.downloadProjectZip(project.id, project.name);
            toast.success("Download started!", { id: toastId });
        } catch (err: any) {
            toast.error(err.message || "Download failed", { id: toastId });
        } finally {
            setIsDownloading(false);
        }
    };

    const handleSelectFile = (file: any) => {
        setSelectedFile(file);
        setCurrentCode(file.content || "// Loading file content...");
        
        // If content is not pre-loaded (it should be in current implementation), 
        // fetch it here.
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
            const fileName = selectedFile?.file_path || `${project.name.replace(/\s+/g, '')}.tsx`;
            const result = await analysisService.fix(
                project.id,
                event.message,
                currentCode,
                fileName
            );

            setCurrentCode(result.fixedCode);
            toast.success("Code fixed successfully!", { id: toastId });
            
            socketService.send({
                type: 'LOG',
                payload: {
                    message: `AI Fix Applied to ${fileName}: ${result.explanation}`,
                    type: 'success'
                }
            });

            // Reload files to get updated content in DB
            await loadFiles(project.id);
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
                onDownload={handleDownload}
                isDownloading={isDownloading}
            />

            <div className="flex flex-1 overflow-hidden">
                {/* Main Content Area */}
                <div className="flex flex-1 p-6 gap-6 overflow-hidden">
                    
                    {/* Left Pane: Project Overview & File Browser */}
                    <div className="flex flex-col w-[380px] gap-6 overflow-hidden">
                        <button
                            onClick={() => router.push('/dashboard')}
                            className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors text-xs group"
                        >
                            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
                            Back to Dashboard
                        </button>

                        {/* File Browser - Major addition for Option B */}
                        <div className="flex-1 flex flex-col min-h-0">
                            <FileBrowser 
                                files={files}
                                selectedFileId={selectedFile?.id}
                                onSelectFile={handleSelectFile}
                            />
                        </div>

                        {/* Project Context Summary */}
                        <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] shadow-sm">
                             <div className="flex items-center justify-between mb-3">
                                <h3 className="text-[10px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">Insight</h3>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse shadow-[0_0_8px_var(--accent-glow)]" />
                                    <span className="text-[9px] font-bold text-[var(--accent-primary)] uppercase tracking-tight">Sync Active</span>
                                </div>
                             </div>
                             <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed italic">
                                "{analyses.length > 0 
                                    ? (analyses[0].result_json.analysis?.summary?.substring(0, 100) + '...') 
                                    : "Architecture is optimal. AI-ready for production."}"
                            </p>
                        </div>

                        {/* Live AI Terminal */}
                        <div className="h-[180px]">
                            <LiveTerminal />
                        </div>
                    </div>

                    {/* Right Pane: Code Preview */}
                    <div className="flex-1 overflow-hidden flex flex-col gap-4">
                        <div className="flex items-center gap-2 px-1">
                            <Box size={14} className="text-[var(--text-tertiary)]" />
                            <span className="text-xs text-[var(--text-tertiary)] flex items-center gap-1">
                                {project.name} <ChevronRight size={12} /> {selectedFile?.file_path || "main.tsx"}
                            </span>
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <CodePreview 
                                code={currentCode || "// No code generated yet. Run a scan to begin."}
                                filename={selectedFile?.file_path || `${project.name.replace(/\s+/g, '')}.tsx`}
                            />
                        </div>
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

            {/* CLI Modal (Moved to manual trigger only) */}
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
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

