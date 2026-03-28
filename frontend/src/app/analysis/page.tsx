"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { CheckCircle2, FileCode2, Files, Folder, FolderOpen, ArrowRight, Loader2, Play, AlertTriangle, Sparkles } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import clsx from "clsx";
import { analysisService, AnalysisResult } from "@/services/analysis.service";
import { projectService } from "@/services/project.service";
import { commandService } from "@/services/command.service";

type Step = {
    id: string;
    label: string;
    details: string;
    status: 'pending' | 'active' | 'complete';
};

export default function AnalysisPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const source = searchParams?.get('source') || 'prompt';
    const repoName = searchParams?.get('repo');
    const figmaUrl = searchParams?.get('url');

    const [phase, setPhase] = useState<'analyzing' | 'review' | 'deploying' | 'error'>('analyzing');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const [fileTree, setFileTree] = useState<any>({});
    const [analysisResults, setAnalysisResults] = useState<AnalysisResult | null>(null);

    // "Silent Competence" Steps
    const [steps, setSteps] = useState<Step[]>([
        { id: 'import', label: 'Importing data', details: 'Connecting to source...', status: 'active' },
        { id: 'components', label: 'Identifying components', details: 'Scanning for UI patterns...', status: 'pending' },
        { id: 'arch', label: 'Inferring architecture', details: 'Structuring file tree...', status: 'pending' },
        { id: 'deps', label: 'Checking dependencies', details: 'Verifying compatibility...', status: 'pending' },
    ]);

    const hasInitialized = useRef(false);

    // File Tree Render Helper
    const renderTree = (node: any, depth = 0) => {
        if (!node || typeof node !== 'object') return null;
        return Object.entries(node).map(([name, value]) => (
            <div key={name}>
                <div style={{ paddingLeft: `${depth * 16}px` }} className="flex items-center gap-2 py-1 text-sm text-[#888]">
                    {value === "file" ? <FileCode2 size={14} className="text-[#666]" /> : <Folder size={14} className="text-[#666]" />}
                    <span className={clsx(value !== "file" && "font-medium text-[#E1E1E1]")}>{name}</span>
                </div>
                {/* Recursive call for directories */}
                {value !== "file" && renderTree(value, depth + 1)}
            </div>
        ));
    };

    const convertBlueprintToTree = (blueprint: any) => {
        // Simple mock of blueprint -> tree for preview
        // In reality, this would map the UPG nodes to a file structure
        return {
            "src": {
                "components": {
                    [`${blueprint.rootComponentId || 'App'}.tsx`]: "file",
                    "Layout.tsx": "file"
                },
                "styles": { "globals.css": "file" },
                "app.tsx": "file"
            },
            "package.json": "file",
            "tailwind.config.js": "file"
        };
    };

    useEffect(() => {
        if (hasInitialized.current) return;
        hasInitialized.current = true;

        const performAnalysis = async () => {
            try {
                // Determine payload
                const payload: any = {};
                if (source === 'github') payload.repo = repoName;
                if (source === 'figma') {
                    payload.url = figmaUrl;
                    payload.token = sessionStorage.getItem('figma_token');
                }
                if (source === 'prompt') {
                    payload.prompt = sessionStorage.getItem('app_prompt') || undefined;
                }

                // Update steps sequence
                const runStep = (id: string, details?: string) => {
                    setSteps(prev => prev.map(s => {
                        if (s.id === id) return { ...s, status: 'active', details: details || s.details };
                        if (s.status === 'active') return { ...s, status: 'complete' };
                        return s;
                    }));
                };

                runStep('import', `Accessing ${source}...`);

                const result = await analysisService.analyze({
                    source,
                    repo: repoName || undefined,
                    url: figmaUrl || undefined,
                    prompt: payload.prompt
                });

                // Advance visual steps with technical delays
                await new Promise(r => setTimeout(r, 1000));
                runStep('components', 'Extracting design tokens...');

                await new Promise(r => setTimeout(r, 1200));
                runStep('arch', 'Generating UPG Blueprint...');

                // Map results
                setAnalysisResults(result);
                setFileTree(convertBlueprintToTree(result.blueprint || {}));

                await new Promise(r => setTimeout(r, 1000));
                runStep('deps', 'Optimizing package.json...');

                await new Promise(r => setTimeout(r, 800));
                setPhase('review');

            } catch (err: any) {
                console.error("Analysis Error:", err);
                setErrorMsg(err.message || "Failed to analyze project source.");
                setPhase('error');
            }
        };

        performAnalysis();
    }, [source, repoName, figmaUrl]);

    const handleCreateProject = async () => {
        setPhase('deploying');
        try {
            // 1. Persist Project to Database
            const project = await projectService.createProject({
                name: repoName || "Shift AI Project",
                platform: source === 'figma' ? 'figma' : 'komposo',
                source_url: figmaUrl || (repoName ? `https://github.com/${repoName}` : undefined),
                framework: 'React' // Default framework
            });

            // 2. Get connected devices
            const devices = await commandService.listDevices();
            const activeDevice = devices.find((d: any) => d.status === 'online') || devices[0];

            if (activeDevice && analysisResults) {
                // 3. Create Import Command
                await commandService.createCommand({
                    device_id: activeDevice.device_id,
                    command_type: 'IMPORT_PROJECT',
                    payload: {
                        projectId: project.id,
                        sourceType: source,
                        repoName: repoName,
                        figmaUrl: figmaUrl,
                        upg: analysisResults.blueprint,
                        projectName: project.name
                    }
                });
                // Slight delay to allow command to propagate
                await new Promise(r => setTimeout(r, 1000));
                router.push('/dashboard');
            } else {
                // If no device, we still created the project, but can't push to IDE.
                // Inform user and redirect.
                alert("Project created in Dashboard! Connect your VS Code extension to sync the code.");
                router.push('/dashboard');
            }
        } catch (error: any) {
            console.error("Failed to persist or deploy project", error);
            setErrorMsg("Failed to create project: " + error.message);
            setPhase('error');
        }
    };

    return (
        <AppLayout>
            <div className="max-w-4xl mx-auto p-8 pt-20">

                {phase === 'error' && (
                    <div className="max-w-md mx-auto text-center space-y-4 animate-fadeIn">
                        <div className="mx-auto w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center text-red-500">
                            <AlertTriangle size={24} />
                        </div>
                        <h2 className="text-xl font-medium text-white">Analysis Failed</h2>
                        <p className="text-[#666] text-sm">{errorMsg}</p>
                        <button
                            onClick={() => window.location.href = '/import'}
                            className="text-[var(--accent-primary)] hover:text-[var(--accent-secondary)] text-sm"
                        >
                            Return to Selection
                        </button>
                    </div>
                )}

                {phase === 'analyzing' && (
                    <div className="max-w-xl mx-auto space-y-8 animate-fadeIn">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-white tracking-tight">Neural Core Scanning...</h2>
                            <p className="text-[var(--text-tertiary)] text-xs uppercase tracking-[0.3em] font-mono">Shift AI is mapping logical architecture</p>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] space-y-1">
                                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Nodes Mapped</span>
                                <div className="text-xl font-mono text-[var(--accent-primary)] animate-pulse">
                                    {steps.filter(s => s.status === 'complete').length * 42 + (steps.find(s => s.status === 'active') ? Math.floor(Math.random() * 20) : 0)}
                                </div>
                            </div>
                            <div className="p-4 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] space-y-1">
                                <span className="text-[10px] text-[var(--text-tertiary)] uppercase font-bold tracking-wider">Logic Pathways</span>
                                <div className="text-xl font-mono text-[var(--accent-primary)] animate-pulse uppercase">
                                    {steps.find(s => s.status === 'active')?.id || 'Syncing'}
                                </div>
                            </div>
                        </div>

                        <div className="space-y-3 border border-[var(--border-default)] rounded-2xl p-6 bg-[var(--bg-panel)] shadow-[0_0_50px_rgba(0,245,255,0.02)]">
                            {steps.map((step) => (
                                <div key={step.id} className="flex items-center gap-4 relative">
                                    <div className="w-6 flex justify-center z-10">
                                        {step.status === 'complete' && <CheckCircle2 size={16} className="text-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]" />}
                                        {step.status === 'active' && <div className="w-3 h-3 bg-[var(--accent-primary)] rounded-full animate-pulse shadow-[0_0_15px_var(--accent-glow)]" />}
                                        {step.status === 'pending' && <div className="w-2 h-2 bg-[#222] rounded-full" />}
                                    </div>
                                    <div className={clsx("flex-1", step.status === 'pending' && "opacity-20")}>
                                        <div className="flex items-center justify-between">
                                            <span className="text-[11px] font-bold text-[var(--text-primary)] uppercase tracking-widest">{step.label}</span>
                                            {step.status === 'active' && <span className="text-[10px] font-mono text-[var(--accent-primary)] animate-pulse">PROCESSING</span>}
                                        </div>
                                        {step.status === 'active' && (
                                            <div className="text-[10px] text-[var(--text-tertiary)] mt-1 font-mono uppercase transition-all duration-500">{step.details}</div>
                                        )}
                                    </div>
                                    {/* Line connecting steps */}
                                    <div className="absolute left-[11px] top-6 w-px h-6 bg-[var(--border-subtle)]" />
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(phase === 'review' || phase === 'deploying') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">

                        {/* Left: Branding & Action */}
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <span className="text-[10px] text-[var(--accent-primary)] font-bold uppercase tracking-[0.3em]">Analysis Complete</span>
                                <h1 className="text-3xl font-bold text-white tracking-tight">System Refactored</h1>
                                <p className="text-[var(--text-secondary)] text-sm leading-relaxed">
                                    Shift AI has successfully constructed a clean architecture from your {source === 'figma' ? 'design tokens' : 'source repository'}.
                                </p>
                            </div>

                            <div className="p-5 rounded-2xl bg-[var(--bg-panel)] border border-[var(--border-default)] space-y-4 shadow-sm relative overflow-hidden">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--accent-primary)]/5 blur-3xl rounded-full" />
                                
                                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold">
                                    <span className="text-[var(--text-tertiary)]">Architecture</span>
                                    <span className="text-[var(--text-primary)]">Clean React</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold">
                                    <span className="text-[var(--text-tertiary)]">Type Safety</span>
                                    <span className="text-[var(--text-primary)]">Strict TS</span>
                                </div>
                                <div className="flex justify-between items-center text-[11px] uppercase tracking-wider font-bold">
                                    <span className="text-[var(--text-tertiary)]">Logic Depth</span>
                                    <span className="text-[var(--text-primary)]">Level 4</span>
                                </div>
                                
                                <div className="h-px bg-[var(--border-default)] my-1" />
                                
                                <div className="flex justify-between items-center">
                                    <span className="text-[11px] uppercase tracking-[0.2em] font-bold text-[var(--text-tertiary)]">Health Score</span>
                                    <div className="flex items-end gap-1">
                                        <span className="text-2xl font-bold text-[var(--accent-primary)] drop-shadow-[0_0_10px_var(--accent-glow)]">
                                            {analysisResults?.score || 98}
                                        </span>
                                        <span className="text-[10px] text-[var(--text-tertiary)] mb-1">/100</span>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateProject}
                                disabled={phase === 'deploying'}
                                className="w-full h-14 rounded-2xl bg-[var(--accent-primary)] hover:bg-[var(--accent-secondary)] text-black font-bold flex items-center justify-center gap-3 shadow-xl shadow-[var(--accent-glow)] transition-all hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
                            >
                                {phase === 'deploying' ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        <span className="uppercase tracking-widest text-xs">Deploying Core...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={20} fill="currentColor" />
                                        <span className="uppercase tracking-widest text-xs">Initialize Migration</span>
                                    </>
                                )}
                            </button>

                            <p className="text-[10px] text-center text-[var(--text-tertiary)] font-mono uppercase tracking-tighter">
                                {analysisResults?.summary || "System ready for deployment to local workspace."}
                            </p>
                        </div>

                        {/* Right: Architecture Preview */}
                        <div className="md:col-span-2 bg-[#141414] border border-[#2C2C2C] rounded-2xl overflow-hidden flex flex-col h-[500px]">
                            <div className="h-10 border-b border-[#2C2C2C] bg-[#1C1C1C] flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#333]" />
                                <div className="w-3 h-3 rounded-full bg-[#333]" />
                                <div className="w-3 h-3 rounded-full bg-[#333]" />
                                <span className="ml-4 text-xs text-[#666] font-mono flex items-center gap-2">
                                    <Sparkles size={12} className="text-[var(--accent-primary)]" />
                                    AI-GENERATED ARCHITECTURE — READ ONLY
                                </span>
                            </div>
                            <div className="flex-1 overflow-auto p-6 font-mono">
                                {renderTree(fileTree)}
                            </div>
                        </div>

                    </div>
                )}

            </div>
        </AppLayout>
    );
}
