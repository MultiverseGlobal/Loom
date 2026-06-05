"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, XCircle, Zap, ArrowRight } from "lucide-react";
import clsx from "clsx";

type ComponentStatus = "pending" | "generating" | "done" | "fallback" | "error";

interface ComponentProgress {
    name: string;
    status: ComponentStatus;
    explanation?: string;
}

export default function GeneratingPage() {
    const params = useParams();
    const router = useRouter();
    const searchParams = useSearchParams();
    const projectId = params.id as string;
    const analysisId = searchParams.get("analysis_id") ?? undefined;

    const [projectName, setProjectName] = useState("your project");
    const [components, setComponents] = useState<ComponentProgress[]>([]);
    const [totalComponents, setTotalComponents] = useState(0);
    const [generatedFiles, setGeneratedFiles] = useState<string[]>([]);
    const [phase, setPhase] = useState<"connecting" | "running" | "complete" | "error">("connecting");
    const [errorMessage, setErrorMessage] = useState("");
    const eventSourceRef = useRef<EventSource | null>(null);
    const hasStarted = useRef(false);

    useEffect(() => {
        if (hasStarted.current) return;
        hasStarted.current = true;

        const analyzerUrl = process.env.NEXT_PUBLIC_ANALYZER_URL || "http://localhost:8000";

        // SSE requires GET, but our endpoint is POST — use fetch with ReadableStream instead
        const startGeneration = async () => {
            try {
                setPhase("connecting");

                const res = await fetch(`${analyzerUrl}/analyzer/ingest/generate-webflow`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        project_id: projectId,
                        analysis_id: analysisId || null,
                    }),
                });

                if (!res.ok) {
                    const err = await res.json().catch(() => ({ detail: "Generation failed" }));
                    throw new Error(err.detail || "Failed to start generation");
                }

                if (!res.body) throw new Error("No response stream");

                setPhase("running");
                const reader = res.body.getReader();
                const decoder = new TextDecoder();
                let buffer = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    buffer += decoder.decode(value, { stream: true });
                    const lines = buffer.split("\n");
                    buffer = lines.pop() ?? "";

                    for (const line of lines) {
                        const trimmed = line.trim();
                        if (!trimmed || !trimmed.startsWith("data: ")) continue;

                        try {
                            const payload = JSON.parse(trimmed.slice(6));
                            handleEvent(payload);
                        } catch {
                            // skip malformed lines
                        }
                    }
                }
            } catch (err: any) {
                console.error("[Generating] Stream error:", err);
                setErrorMessage(err.message || "An unexpected error occurred");
                setPhase("error");
            }
        };

        startGeneration();

        return () => {
            eventSourceRef.current?.close();
        };
    }, [projectId, analysisId]);

    const handleEvent = (payload: any) => {
        const { event } = payload;

        if (event === "start") {
            setTotalComponents(payload.total ?? 0);
            if (payload.projectName) setProjectName(payload.projectName);
        }

        if (event === "progress") {
            const { component, status } = payload;
            setComponents((prev) => {
                const idx = prev.findIndex((c) => c.name === component);
                if (idx >= 0) {
                    const updated = [...prev];
                    updated[idx] = { ...updated[idx], status, explanation: payload.explanation };
                    return updated;
                }
                return [...prev, { name: component, status, explanation: payload.explanation }];
            });
        }

        if (event === "complete") {
            setGeneratedFiles(payload.files ?? []);
            setPhase("complete");
            // Auto-navigate after 2.5 seconds
            setTimeout(() => {
                router.push(`/projects/${projectId}?generated=true`);
            }, 2500);
        }
    };

    const doneCount = components.filter((c) => c.status === "done" || c.status === "fallback").length;
    const progress = totalComponents > 0 ? Math.round((doneCount / totalComponents) * 100) : 0;

    const statusIcon = (status: ComponentStatus) => {
        switch (status) {
            case "done":
                return <CheckCircle2 size={15} className="text-emerald-400 shrink-0" />;
            case "fallback":
                return <CheckCircle2 size={15} className="text-amber-400 shrink-0" />;
            case "generating":
                return <Loader2 size={15} className="text-[var(--accent-primary)] animate-spin shrink-0" />;
            case "error":
                return <XCircle size={15} className="text-red-400 shrink-0" />;
            default:
                return <div className="w-[15px] h-[15px] rounded-full border border-[var(--border-default)] shrink-0" />;
        }
    };

    return (
        <div className="min-h-screen bg-[var(--bg-root)] flex flex-col items-center justify-center px-4 py-16">
            <div className="w-full max-w-xl space-y-8">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--accent-primary)]/30 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-[11px] font-semibold uppercase tracking-wider">
                        <Zap size={12} />
                        AI Generation
                    </div>
                    <h1 className="text-2xl font-semibold text-[var(--text-primary)]">
                        {phase === "complete"
                            ? "Generation Complete 🎉"
                            : phase === "error"
                            ? "Generation Failed"
                            : `Building ${projectName}`}
                    </h1>
                    <p className="text-[13px] text-[var(--text-secondary)]">
                        {phase === "complete"
                            ? `${generatedFiles.length} component${generatedFiles.length !== 1 ? "s" : ""} generated. Redirecting to workspace...`
                            : phase === "error"
                            ? errorMessage
                            : "Our AI is converting your Webflow design into React components."}
                    </p>
                </div>

                {/* Progress Bar */}
                {phase !== "error" && (
                    <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                            <span>
                                {phase === "connecting" ? "Connecting..." : phase === "complete" ? "Done" : `${doneCount} / ${totalComponents} components`}
                            </span>
                            <span>{phase === "connecting" ? "0%" : `${progress}%`}</span>
                        </div>
                        <div className="h-1.5 w-full rounded-full bg-[var(--bg-panel)] overflow-hidden">
                            <div
                                className={clsx(
                                    "h-full rounded-full transition-all duration-700",
                                    phase === "complete"
                                        ? "bg-emerald-500"
                                        : "bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]"
                                )}
                                style={{ width: phase === "connecting" ? "4%" : `${Math.max(progress, 4)}%` }}
                            />
                        </div>
                    </div>
                )}

                {/* Component Checklist */}
                {components.length > 0 && (
                    <div className="rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-subtle)]">
                            <span className="text-[12px] font-medium text-[var(--text-secondary)] uppercase tracking-wider">Components</span>
                        </div>
                        <div className="divide-y divide-[var(--border-subtle)] max-h-[360px] overflow-y-auto">
                            {components.map((c) => (
                                <div key={c.name} className="flex items-start gap-3 px-4 py-3">
                                    <div className="mt-0.5">{statusIcon(c.status)}</div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-[13px] font-medium text-[var(--text-primary)] font-mono">{c.name}.tsx</span>
                                            {c.status === "generating" && (
                                                <span className="text-[10px] text-[var(--accent-primary)] uppercase tracking-wider">Generating...</span>
                                            )}
                                            {c.status === "fallback" && (
                                                <span className="text-[10px] text-amber-400 uppercase tracking-wider">Placeholder</span>
                                            )}
                                        </div>
                                        {c.explanation && c.status === "done" && (
                                            <p className="text-[11px] text-[var(--text-tertiary)] mt-0.5 truncate">{c.explanation}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Connecting state */}
                {phase === "connecting" && components.length === 0 && (
                    <div className="flex items-center justify-center gap-2 text-[var(--text-secondary)] text-[13px] py-8">
                        <Loader2 size={16} className="animate-spin" />
                        Connecting to AI engine...
                    </div>
                )}

                {/* Error state */}
                {phase === "error" && (
                    <div className="flex gap-3">
                        <button
                            onClick={() => router.push(`/projects/${projectId}/blueprint`)}
                            className="flex-1 rounded-md border border-[var(--border-default)] px-4 py-2.5 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors"
                        >
                            ← Back to Blueprint
                        </button>
                        <button
                            onClick={() => { hasStarted.current = false; setPhase("connecting"); setComponents([]); }}
                            className="flex-1 rounded-md bg-[var(--accent-primary)] px-4 py-2.5 text-[13px] font-medium text-white hover:opacity-90 transition-opacity"
                        >
                            Retry
                        </button>
                    </div>
                )}

                {/* Complete — manual CTA in case auto-redirect is slow */}
                {phase === "complete" && (
                    <button
                        onClick={() => router.push(`/projects/${projectId}?generated=true`)}
                        className="w-full flex items-center justify-center gap-2 rounded-md bg-emerald-500 px-4 py-2.5 text-[13px] font-medium text-white hover:bg-emerald-400 transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]"
                    >
                        Open Workspace <ArrowRight size={15} />
                    </button>
                )}
            </div>
        </div>
    );
}
