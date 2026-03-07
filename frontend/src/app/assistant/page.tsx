"use client";

import { AppLayout } from "@/components/layout/AppLayout";
import { Bot, Sparkles, Lightbulb, Zap, TrendingUp } from "lucide-react";

export default function AssistantPage() {
    return (
        <AppLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-medium text-[var(--text-primary)]">AI Assistant</h1>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                        Your intelligent project manager for smart suggestions and automation.
                    </p>
                </div>

                {/* AI Chat Interface */}
                <div className="glass-panel rounded-xl overflow-hidden" style={{ height: "500px" }}>
                    <div className="h-full flex flex-col">
                        <div className="border-b border-[var(--border-subtle)] p-4 bg-[var(--bg-root)]">
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center">
                                    <Bot size={16} className="text-white" />
                                </div>
                                <div>
                                    <div className="text-[13px] font-medium text-[var(--text-primary)]">Loom AI Assistant</div>
                                    <div className="text-[11px] text-[var(--text-tertiary)]">Always ready to help</div>
                                </div>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4">
                            {/* AI Messages */}
                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                                    <Bot size={12} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="glass-panel rounded-lg p-3 text-[13px] text-[var(--text-secondary)]">
                                        Hi! I'm your AI assistant. I can help you with:
                                        <ul className="mt-2 space-y-1 list-disc list-inside">
                                            <li>Suggesting code improvements</li>
                                            <li>Detecting missing components</li>
                                            <li>Optimizing project structure</li>
                                            <li>Automating repetitive tasks</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-3">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-violet-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0">
                                    <Bot size={12} className="text-white" />
                                </div>
                                <div className="flex-1">
                                    <div className="glass-panel rounded-lg p-3 text-[13px] text-[var(--text-secondary)]">
                                        I noticed your project has 3 unused components. Would you like me to help clean them up?
                                    </div>
                                    <div className="flex gap-2 mt-2">
                                        <button className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--accent-primary)] text-white hover:opacity-90 transition-opacity">
                                            Yes, clean up
                                        </button>
                                        <button className="text-[12px] px-3 py-1.5 rounded-lg bg-[var(--bg-active)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] transition-colors">
                                            Show details
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border-t border-[var(--border-subtle)] p-4 bg-[var(--bg-root)]">
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    placeholder="Ask me anything about your project..."
                                    className="flex-1 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] px-3 py-2 text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:border-[var(--accent-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--accent-primary)]"
                                />
                                <button className="rounded-lg bg-[var(--accent-primary)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 transition-opacity">
                                    Send
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Automation Rules */}
                <div className="glass-panel rounded-xl p-6">
                    <h2 className="text-[14px] font-medium text-[var(--text-primary)] mb-4 uppercase tracking-wider">Automation Rules</h2>
                    <div className="space-y-3">
                        {[
                            { name: "Auto-format on export", enabled: true, description: "Automatically run Prettier on all exports" },
                            { name: "Dependency updates", enabled: true, description: "Notify when dependencies need updating" },
                            { name: "Code quality checks", enabled: false, description: "Run ESLint before each export" },
                        ].map((rule, idx) => (
                            <div key={idx} className="flex items-center justify-between p-4 rounded-lg bg-[var(--bg-root)] border border-[var(--border-subtle)]">
                                <div>
                                    <div className="text-[13px] font-medium text-[var(--text-primary)] mb-1">{rule.name}</div>
                                    <div className="text-[12px] text-[var(--text-tertiary)]">{rule.description}</div>
                                </div>
                                <label className="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" className="sr-only peer" checked={rule.enabled} readOnly />
                                    <div className={`w-11 h-6 rounded-full peer ${rule.enabled ? 'bg-[var(--accent-primary)]' : 'bg-[var(--bg-active)]'} peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[var(--accent-glow)] transition-colors`}>
                                        <div className={`absolute top-[2px] left-[2px] bg-white rounded-full h-5 w-5 transition-transform ${rule.enabled ? 'translate-x-5' : ''}`}></div>
                                    </div>
                                </label>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
