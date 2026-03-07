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
                name: repoName || "Loom Project",
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
                            className="text-emerald-500 hover:text-emerald-400 text-sm"
                        >
                            Return to Selection
                        </button>
                    </div>
                )}

                {phase === 'analyzing' && (
                    <div className="max-w-md mx-auto space-y-8 animate-fadeIn">
                        <div className="text-center">
                            <h2 className="text-xl font-medium text-white mb-2">Understanding your project...</h2>
                            <p className="text-[#666] text-sm">Loom is analyzing structure and dependencies.</p>
                        </div>

                        <div className="space-y-4 border border-[#2C2C2C] rounded-xl p-6 bg-[#141414]">
                            {steps.map((step) => (
                                <div key={step.id} className="flex items-center gap-4">
                                    <div className="w-6 flex justify-center">
                                        {step.status === 'complete' && <CheckCircle2 size={16} className="text-emerald-500" />}
                                        {step.status === 'active' && <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />}
                                        {step.status === 'pending' && <div className="w-2 h-2 bg-[#333] rounded-full" />}
                                    </div>
                                    <div className={clsx("flex-1", step.status === 'pending' && "opacity-30")}>
                                        <div className="text-sm font-medium text-[#E1E1E1]">{step.label}</div>
                                        {step.status === 'active' && (
                                            <div className="text-xs text-[#666] mt-0.5 animate-fadeIn">{step.details}</div>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {(phase === 'review' || phase === 'deploying') && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 animate-fadeIn">

                        {/* Left: Branding & Action */}
                        <div className="space-y-6">
                            <div>
                                <h1 className="text-2xl font-bold text-white mb-2">Ready to Build</h1>
                                <p className="text-[#666] leading-relaxed">
                                    Loom has constructed a clean architecture based on your {source}.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-[#1C1C1C] border border-[#2C2C2C] space-y-3">
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#888]">Framework</span>
                                    <span className="text-white">React + Vite</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#888]">Language</span>
                                    <span className="text-white">TypeScript</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-[#888]">Styling</span>
                                    <span className="text-white">Tailwind CSS</span>
                                </div>
                                <div className="h-px bg-[#333] my-2" />
                                <div className="flex justify-between text-sm font-medium">
                                    <span className="text-[#888]">Health Score</span>
                                    <span className={clsx(
                                        "font-bold",
                                        (analysisResults?.score || 0) > 80 ? "text-emerald-400" : "text-yellow-400"
                                    )}>
                                        {analysisResults?.score || 0}/100
                                    </span>
                                </div>
                            </div>

                            <button
                                onClick={handleCreateProject}
                                disabled={phase === 'deploying'}
                                className="w-full h-12 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-medium flex items-center justify-center gap-2 shadow-lg shadow-emerald-900/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                {phase === 'deploying' ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Deploying to IDE...</span>
                                    </>
                                ) : (
                                    <>
                                        <Play size={18} fill="currentColor" />
                                        <span>Create Project in IDE</span>
                                    </>
                                )}
                            </button>

                            <p className="text-xs text-center text-[#555]">
                                {analysisResults?.summary || "Ready for code generation."}
                            </p>
                        </div>

                        {/* Right: Architecture Preview */}
                        <div className="md:col-span-2 bg-[#141414] border border-[#2C2C2C] rounded-2xl overflow-hidden flex flex-col h-[500px]">
                            <div className="h-10 border-b border-[#2C2C2C] bg-[#1C1C1C] flex items-center px-4 gap-2">
                                <div className="w-3 h-3 rounded-full bg-[#333]" />
                                <div className="w-3 h-3 rounded-full bg-[#333]" />
                                <div className="w-3 h-3 rounded-full bg-[#333]" />
                                <span className="ml-4 text-xs text-[#666] font-mono flex items-center gap-2">
                                    <Sparkles size={12} className="text-emerald-500" />
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
