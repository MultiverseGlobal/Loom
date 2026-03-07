"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { projectService, Project } from "@/services/project.service";
import { analysisService } from "@/services/analysis.service";
import { Folder, ArrowLeft, ExternalLink, Play, Settings, Clock, Globe, Code2, Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { fetchAPI } from "@/utils/api";
import { LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase";

export default function ProjectDetailPage() {
    const params = useParams();
    const router = useRouter();
    const [project, setProject] = useState<Project | null>(null);
    const [loading, setLoading] = useState(true);
    const [analyses, setAnalyses] = useState<any[]>([]);
    const [devices, setDevices] = useState<any[]>([]);
    const [isScanning, setIsScanning] = useState(false);
    const [isLaunching, setIsLaunching] = useState(false);
    const [selectedAnalysis, setSelectedAnalysis] = useState<any>(null);

    const fetchDevices = async () => {
        try {
            const { data: { session } } = await createClient().auth.getSession();
            if (!session) return;
            const devicesData = await fetchAPI<any[]>(`/extensions/devices`, {
                headers: { 'Authorization': `Bearer ${session.access_token}` }
            });
            setDevices(Array.isArray(devicesData) ? devicesData : []);
        } catch (err) {
            console.error("Fetch devices error:", err);
        }
    };

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
                // Initial fetch
                await fetchDevices();
            } catch (err) {
                console.error("Load project data error:", err);
                toast.error("Failed to load project details");
            } finally {
                setLoading(false);
            }
        };

        loadData();

        // Polling for devices
        const interval = setInterval(fetchDevices, 5000);
        return () => clearInterval(interval);
    }, [params.id, router]);

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

    const handleDisconnectDevice = async (deviceId: string) => {
        if (!confirm("Are you sure you want to disconnect this extension? It will be logged out immediately.")) return;

        try {
            await fetchAPI(`/extensions/${deviceId}`, { method: 'DELETE' });
            toast.success("Extension disconnected successfully");
            setDevices(prev => prev.filter(d => d.id !== deviceId));
        } catch (error: any) {
            toast.error(`Failed to disconnect: ${error.message}`);
        }
    };

    const handleDeleteProject = async () => {
        if (!project) return;
        if (!confirm(`Are you sure you want to delete ${project.name}? This action cannot be undone.`)) return;

        try {
            await projectService.deleteProject(project.id);
            toast.success("Project deleted successfully");
            router.push("/dashboard");
        } catch (err: any) {
            toast.error(err.message || "Failed to delete project");
        }
    };

    const handleRunScan = async () => {
        if (!project) return;
        setIsScanning(true);
        try {
            const result = await analysisService.analyze({
                source: project.source_url ? 'github' : 'prompt',
                projectId: project.id,
                repo: project.source_url?.replace('https://github.com/', ''),
                prompt: `Analyze the ${project.framework} project named ${project.name}`
            });

            toast.success("Analysis complete!");
            // Refresh analyses list
            const updatedAnalyses = await analysisService.getAnalyses(project.id);
            setAnalyses(updatedAnalyses);
        } catch (err: any) {
            toast.error(err.message || "Analysis failed");
        } finally {
            setIsScanning(false);
        }
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="max-w-6xl mx-auto p-4 sm:p-8 pt-20 animate-pulse">
                    <div className="h-4 w-32 bg-[var(--bg-panel)] rounded mb-8" />
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            <div className="bg-[var(--bg-panel)] h-64 rounded-2xl p-8" />
                            <div className="bg-[var(--bg-panel)] h-48 rounded-2xl" />
                        </div>
                        <div className="bg-[var(--bg-panel)] h-96 rounded-2xl" />
                    </div>
                </div>
            </AppLayout>
        );
    }

    if (!project) return null;

    return (
        <AppLayout>
            <div className="max-w-6xl mx-auto p-4 sm:p-8 pt-20">
                {/* Header Navigation */}
                <button
                    onClick={() => router.push('/dashboard')}
                    className="flex items-center gap-2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors mb-8 text-sm group"
                >
                    <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
                    Back to Dashboard
                </button>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Project Overview */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl p-8">
                            <div className="flex items-start justify-between mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 rounded-xl bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
                                        <Folder size={28} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-3">
                                            <h1 className="text-2xl font-bold tracking-tight text-[var(--text-primary)]">{project.name}</h1>
                                            <button
                                                onClick={handleDeleteProject}
                                                className="p-2 text-[var(--text-tertiary)] hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-all"
                                                title="Delete Project"
                                            >
                                                <Settings size={18} />
                                            </button>
                                        </div>
                                        <p className="text-[var(--text-secondary)] mt-1 flex items-center gap-2">
                                            {project.framework || 'Standard Web App'}
                                            <span className="w-1 h-1 rounded-full bg-[var(--text-tertiary)]" />
                                            {project.platform ? (project.platform.charAt(0).toUpperCase() + project.platform.slice(1)) : 'Unknown Platform'}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => router.push('/settings')}
                                        className="p-2 rounded-lg border border-[var(--border-default)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-all"
                                    >
                                        <Settings size={20} />
                                    </button>
                                    <button
                                        onClick={handleLaunchExtension}
                                        disabled={isLaunching}
                                        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent-primary)] text-white rounded-lg hover:opacity-90 transition-all font-medium text-sm disabled:opacity-50"
                                    >
                                        {isLaunching ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <Play size={16} fill="white" />
                                        )}
                                        Launch Extension
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-4 pt-6 border-t border-[var(--border-subtle)]">
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Status</p>
                                    <div className="flex items-center gap-2">
                                        <div className={clsx(
                                            "w-2 h-2 rounded-full animate-pulse",
                                            project.status === 'ready' ? "bg-emerald-500" :
                                                project.status === 'processing' ? "bg-amber-500" : "bg-rose-500"
                                        )} />
                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                            {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
                                        </span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Created</p>
                                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                        <Clock size={14} className="text-[var(--text-tertiary)]" />
                                        <span className="text-sm font-medium">{new Date(project.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <p className="text-[11px] uppercase tracking-wider text-[var(--text-tertiary)] font-bold">Visibility</p>
                                    <div className="flex items-center gap-2 text-[var(--text-primary)]">
                                        <Globe size={14} className="text-[var(--text-tertiary)]" />
                                        <span className="text-sm font-medium">Private</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Analysis / Intelligence Section */}
                        <div className="bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl overflow-hidden">
                            <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
                                        <Code2 size={20} />
                                    </div>
                                    <h2 className="font-semibold text-[var(--text-primary)]">Project Intelligence</h2>
                                </div>
                                <button
                                    onClick={handleRunScan}
                                    disabled={isScanning}
                                    className="flex items-center gap-2 text-xs text-[var(--accent-primary)] hover:underline font-medium disabled:opacity-50"
                                >
                                    {isScanning && <Loader2 size={12} className="animate-spin" />}
                                    Run New Scan
                                </button>
                            </div>

                            {analyses.length > 0 ? (
                                <div className="p-6 space-y-4">
                                    {analyses.map((analysis) => (
                                        <div key={analysis.id} className="p-4 rounded-xl bg-[var(--bg-root)] border border-[var(--border-subtle)] hover:border-[var(--accent-primary)]/30 transition-all group">
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-medium text-[var(--text-primary)]">
                                                            Score: {analysis.result_json.analysis.score}
                                                        </span>
                                                        <span className={clsx(
                                                            "px-1.5 py-0.5 rounded text-[10px] font-bold uppercase",
                                                            analysis.result_json.analysis.score > 80 ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                        )}>
                                                            {analysis.result_json.analysis.score > 80 ? 'Optimal' : 'Needs Review'}
                                                        </span>
                                                    </div>
                                                    <p className="text-xs text-[var(--text-secondary)] line-clamp-1">
                                                        {analysis.result_json.analysis.summary}
                                                    </p>
                                                </div>
                                                <span className="text-[10px] text-[var(--text-tertiary)]">
                                                    {new Date(analysis.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="mt-4 grid grid-cols-3 gap-2">
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Issues</span>
                                                    <span className="text-xs text-[var(--text-primary)] font-medium flex items-center gap-1">
                                                        {analysis.result_json.analysis.issues.length}
                                                        {analysis.result_json.analysis.issues.length > 0 && <AlertTriangle size={10} className="text-amber-500" />}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-0.5">
                                                    <span className="text-[9px] uppercase text-[var(--text-tertiary)] font-bold">Credits</span>
                                                    <span className="text-xs text-[var(--text-primary)] font-medium">-{analysis.credits_used}</span>
                                                </div>
                                                <button
                                                    onClick={() => setSelectedAnalysis(analysis)}
                                                    className="mt-auto text-[10px] text-[var(--accent-primary)] font-medium hover:underline text-right"
                                                >
                                                    View Details →
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-12 text-center space-y-4">
                                    <div className="mx-auto w-16 h-16 rounded-full bg-[var(--bg-subtle)] border border-dashed border-[var(--border-default)] flex items-center justify-center text-[var(--text-tertiary)]">
                                        <Clock size={24} />
                                    </div>
                                    <div className="max-w-xs mx-auto">
                                        <h3 className="text-sm font-medium text-[var(--text-primary)] mb-1">No analysis history yet</h3>
                                        <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-wide">
                                            Connect your IDE or Run a Scan to start tracking architectural drift.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Right Column: Source & Connections */}
                    <div className="space-y-6">
                        <div className="bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4">Source Connection</h3>
                            {project.source_url ? (
                                <div className="p-4 rounded-xl bg-[var(--bg-root)] border border-[var(--border-subtle)] space-y-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs text-[var(--text-secondary)]">GitHub Repository</span>
                                        {/* Mock GitHub Favicon placeholder */}
                                        <div className="w-4 h-4 rounded-full bg-white/10" />
                                    </div>
                                    <p className="text-xs font-mono text-[var(--text-primary)] truncate">
                                        {project.source_url}
                                    </p>
                                    <a
                                        href={project.source_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-2 w-full py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-medium transition-all"
                                    >
                                        View on GitHub
                                        <ExternalLink size={12} />
                                    </a>
                                </div>
                            ) : (
                                <div className="p-4 rounded-xl bg-[var(--bg-root)] border border-[var(--border-subtle)] border-dashed text-center space-y-3">
                                    <p className="text-xs text-[var(--text-tertiary)]">No source linked to this project</p>
                                    <button className="text-xs font-semibold text-[var(--accent-primary)] hover:opacity-80">
                                        Link GitHub Repo
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="bg-[var(--accent-primary)]/5 border border-[var(--accent-primary)]/10 rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-[var(--accent-primary)] mb-2 uppercase tracking-wider">Quick Note</h3>
                            <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                This project is synced with your local environment. Changes made in the Loom Editor or VS Code will appear here.
                            </p>
                        </div>

                        {/* Connection Health Check */}
                        <div className="bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl p-6">
                            <h3 className="text-sm font-bold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                                <Code2 size={16} className="text-[var(--accent-primary)]" />
                                Extension Diagnostic
                            </h3>
                            <div className="space-y-4">
                                {devices.length > 0 ? (
                                    <div className="space-y-3">
                                        {devices.map((device) => (
                                            <div key={device.id} className="p-3 rounded-xl bg-[var(--bg-root)] border border-[var(--border-subtle)] space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] font-mono text-[var(--text-tertiary)] truncate w-32">
                                                        {device.id}
                                                    </span>
                                                    <div className="flex items-center gap-1.5">
                                                        <div className={clsx(
                                                            "w-1.5 h-1.5 rounded-full",
                                                            device.status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                                                        )} />
                                                        <span className="text-[10px] font-bold uppercase text-[var(--text-secondary)]">
                                                            {device.status}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDisconnectDevice(device.id)}
                                                            className="p-1 hover:bg-rose-500/10 rounded-md text-rose-500 transition-colors"
                                                            title="Disconnect"
                                                        >
                                                            <LogOut size={12} />
                                                        </button>
                                                    </div>
                                                </div>
                                                <div className="text-[10px] text-[var(--text-primary)]">
                                                    {device.machine_info?.ide || 'VS Code'} {device.machine_info?.version}
                                                </div>
                                            </div>
                                        ))}
                                        <p className="text-[9px] text-[var(--text-tertiary)] leading-tight italic">
                                            If your device shows "offline", ensure the Loom extension is active in VS Code.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 text-center space-y-2">
                                        <AlertTriangle size={20} className="mx-auto text-amber-500" />
                                        <p className="text-[10px] text-amber-500 font-medium">No extensions connected</p>
                                        <p className="text-[9px] text-[var(--text-tertiary)] max-w-[200px] mx-auto">
                                            We couldn't find any VS Code extensions associated with your account. Ensure you are signed into the extension with this same account.
                                        </p>
                                        <button
                                            onClick={() => router.push('/onboarding/connect')}
                                            className="text-[10px] font-bold text-[var(--accent-primary)] hover:underline mt-1"
                                        >
                                            Pair New Extension →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Analysis Detail Modal */}
            {selectedAnalysis && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
                        <div className="p-6 border-b border-[var(--border-default)] flex items-center justify-between">
                            <h2 className="text-xl font-bold text-[var(--text-primary)]">Analysis Results</h2>
                            <button
                                onClick={() => setSelectedAnalysis(null)}
                                className="p-2 hover:bg-[var(--bg-hover)] rounded-lg text-[var(--text-tertiary)]"
                            >
                                <span className="text-xl">×</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-6">
                            <div>
                                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">Summary</h3>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    {selectedAnalysis.result_json.analysis.summary}
                                </p>
                            </div>

                            <div className="space-y-4">
                                <h3 className="text-sm font-bold text-[var(--text-primary)] uppercase tracking-wider mb-2">Detailed Issues</h3>
                                {selectedAnalysis.result_json.analysis.issues.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedAnalysis.result_json.analysis.issues.map((issue: any, idx: number) => (
                                            <div key={idx} className="p-4 rounded-xl bg-[var(--bg-root)] border border-[var(--border-subtle)] space-y-2">
                                                <div className="flex items-center gap-2">
                                                    <span className={clsx(
                                                        "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase",
                                                        issue.type === 'error' ? "bg-rose-500/10 text-rose-500" :
                                                            issue.type === 'warning' ? "bg-amber-500/10 text-amber-500" : "bg-blue-500/10 text-blue-500"
                                                    )}>
                                                        {issue.type || 'Issue'}
                                                    </span>
                                                    <span className="text-xs font-medium text-[var(--text-primary)]">{issue.message}</span>
                                                </div>
                                                <p className="text-xs text-[var(--text-secondary)] leading-relaxed">{issue.detail}</p>
                                                {issue.file && (
                                                    <div className="text-[10px] text-[var(--text-tertiary)] flex items-center gap-1 italic">
                                                        <Code2 size={10} />
                                                        {issue.file}{issue.line ? `: L${issue.line}` : ''}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-[var(--bg-root)] rounded-xl border border-dashed border-[var(--border-default)]">
                                        <p className="text-sm text-[var(--text-tertiary)]">No syntax or architectural issues found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="p-6 border-t border-[var(--border-default)] bg-[var(--bg-root)]/50">
                            <button
                                onClick={() => setSelectedAnalysis(null)}
                                className="w-full py-2 bg-[var(--bg-hover)] text-[var(--text-primary)] rounded-lg font-medium hover:opacity-80 transition-all"
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
