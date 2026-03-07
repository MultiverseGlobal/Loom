"use client";

import { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { projectService } from "@/services/project.service";
import { Sparkles, Code, Play, Copy, Check } from "lucide-react";
import clsx from "clsx";

export default function GeneratePage() {
    const [prompt, setPrompt] = useState("");
    const [loading, setLoading] = useState(false);
    const [generatedCode, setGeneratedCode] = useState("");
    const [explanation, setExplanation] = useState("");
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code');

    const handleGenerate = async () => {
        if (!prompt.trim()) return;

        setLoading(true);
        setGeneratedCode("");
        setExplanation("");
        setActiveTab('code'); // Default back to code on new generation

        try {
            const response = await projectService.generateUI(prompt, "React + TailwindCSS"); // Assuming framework is still "React + TailwindCSS" as no new framework variable was provided.
            setGeneratedCode(response.code);
            setExplanation(response.explanation);
            setActiveTab('code'); // Reset to code view on new generation
        } catch (error) {
            console.error("Generation failed", error);
            setExplanation("Failed to generate UI. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    // Helper to extract a preview-able HTML from the generated JSX string
    // This is a simple fallback for the MVP
    const getPreviewContent = (code: string) => {
        if (!code) return "";
        try {
            // Find what's inside the return (...) block
            const returnMatch = code.match(/return\s*\(\s*([\s\S]*?)\s*\);/);
            if (returnMatch && returnMatch[1]) {
                let html = returnMatch[1]
                    .replace(/className=/g, 'class=') // Replace React className with class
                    .replace(/\{(\w+)\}/g, '$1'); // Basic state placeholder replacement
                return html.trim();
            }
            return "Unable to render preview. Check the code tab.";
        } catch (e) {
            return "Preview render error.";
        }
    };

    const handleCopy = () => {
        if (!generatedCode) return;
        navigator.clipboard.writeText(generatedCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <AppLayout>
            <div className="h-[calc(100vh-140px)] flex flex-col lg:flex-row gap-6">
                {/* Left Panel: Input */}
                <div className="w-full lg:w-1/3 flex flex-col gap-4">
                    <div>
                        <h1 className="text-2xl font-medium text-[var(--text-primary)]">Generate UI</h1>
                        <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                            Describe the component you want to build.
                        </p>
                    </div>

                    <div className="flex-1 flex flex-col gap-4">
                        <textarea
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="flex-1 w-full rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] p-4 text-[14px] leading-relaxed text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)] resize-none transition-all"
                            placeholder="e.g. A responsive pricing table with 3 tiers, highlighted middle tier, and toggle for monthly/yearly billing..."
                        />

                        <button
                            onClick={handleGenerate}
                            disabled={loading || !prompt.trim()}
                            className="flex items-center justify-center gap-2 rounded-lg bg-[var(--accent-primary)] py-3 text-[14px] font-medium text-white shadow-[0_0_20px_var(--accent-glow)] hover:opacity-90 disabled:opacity-50 disabled:shadow-none transition-all"
                        >
                            {loading ? (
                                <>
                                    <Sparkles size={16} className="animate-pulse" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Sparkles size={16} />
                                    Generate Component
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Right Panel: Preview/Code */}
                <div className="w-full lg:w-2/3 flex flex-col rounded-xl border border-[var(--border-default)] bg-[var(--bg-panel)] overflow-hidden">
                    <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3 bg-[var(--bg-root)]">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setActiveTab('code')}
                                className={clsx(
                                    "flex items-center gap-2 text-[13px] font-medium transition-all pb-3 -mb-3.5",
                                    activeTab === 'code' ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <Code size={14} />
                                Code
                            </button>
                            <button
                                onClick={() => setActiveTab('preview')}
                                className={clsx(
                                    "flex items-center gap-2 text-[13px] font-medium transition-all pb-3 -mb-3.5",
                                    activeTab === 'preview' ? "text-[var(--text-primary)] border-b-2 border-[var(--accent-primary)]" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                                )}
                            >
                                <Play size={14} />
                                Preview
                            </button>
                        </div>

                        {generatedCode && (
                            <button
                                onClick={handleCopy}
                                className="flex items-center gap-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                                {copied ? "Copied" : "Copy Code"}
                            </button>
                        )}
                    </div>

                    <div className="flex-1 overflow-auto p-0 relative group">
                        {generatedCode ? (
                            activeTab === 'code' ? (
                                <pre className="p-4 text-[13px] font-mono text-[var(--text-secondary)] leading-relaxed">
                                    <code>{generatedCode}</code>
                                </pre>
                            ) : (
                                <div className="p-8 bg-white h-full overflow-auto">
                                    <div
                                        className="preview-wrapper"
                                        dangerouslySetInnerHTML={{ __html: getPreviewContent(generatedCode) }}
                                    />
                                </div>
                            )
                        ) : (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-[var(--text-tertiary)]">
                                <Code size={48} className="opacity-20 mb-4" />
                                <p className="text-[14px]">Generated code will appear here</p>
                            </div>
                        )}
                    </div>
                </div>

                {explanation && (
                    <div className="border-t border-[var(--border-subtle)] bg-[var(--bg-root)] p-3 text-[13px] text-[var(--text-secondary)]">
                        <span className="font-medium text-[var(--accent-primary)]">AI: </span>
                        {explanation}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
