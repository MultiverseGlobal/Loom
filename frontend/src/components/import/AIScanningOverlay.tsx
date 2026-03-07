"use client";

import { useEffect, useState } from "react";
import { Sparkles, CheckCircle2 } from "lucide-react";
import clsx from "clsx";

interface AIScanningOverlayProps {
    isVisible: boolean;
    onComplete?: () => void;
}

const STEPS = [
    "Interpreting project...",
    "Detecting framework...",
    "Extracting components...",
    "Resolving imports...",
    "Preparing project..."
];

export function AIScanningOverlay({ isVisible, onComplete }: AIScanningOverlayProps) {
    const [currentStep, setCurrentStep] = useState(0);

    useEffect(() => {
        if (!isVisible) {
            setCurrentStep(0);
            return;
        }

        const interval = setInterval(() => {
            setCurrentStep((prev) => {
                if (prev >= STEPS.length - 1) {
                    clearInterval(interval);
                    if (onComplete) setTimeout(onComplete, 800);
                    return prev;
                }
                return prev + 1;
            });
        }, 1200); // 1.2s per step

        return () => clearInterval(interval);
    }, [isVisible, onComplete]);

    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[var(--bg-root)]/95 backdrop-blur-md transition-all duration-500">
            {/* Central AI Node */}
            <div className="relative mb-12">
                <div className="absolute inset-0 rounded-full bg-[var(--accent-primary)]/20 blur-xl animate-pulse" />
                <div className="relative flex h-24 w-24 items-center justify-center rounded-full bg-[var(--bg-panel)] border border-[var(--accent-primary)]/30 shadow-[0_0_30px_var(--accent-glow)]">
                    <Sparkles size={40} className="text-[var(--accent-primary)] animate-pulse" />
                </div>

                {/* Orbiting particles */}
                <div className="absolute inset-0 animate-spin-slow">
                    <div className="absolute -top-2 left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-[var(--accent-primary)] shadow-[0_0_10px_var(--accent-glow)]" />
                </div>
            </div>

            {/* Progress Text */}
            <div className="h-8 mb-8 text-center">
                <h2 className="text-xl font-medium text-[var(--text-primary)] animate-fadeIn key={currentStep}">
                    {STEPS[currentStep]}
                </h2>
            </div>

            {/* Steps List */}
            <div className="space-y-3 w-64">
                {STEPS.map((step, idx) => (
                    <div
                        key={idx}
                        className={clsx(
                            "flex items-center gap-3 transition-all duration-500",
                            idx > currentStep ? "opacity-30 translate-y-2" : "opacity-100 translate-y-0"
                        )}
                    >
                        <div className={clsx(
                            "h-4 w-4 rounded-full flex items-center justify-center border transition-colors duration-300",
                            idx < currentStep
                                ? "bg-emerald-500/20 border-emerald-500/50 text-emerald-500"
                                : idx === currentStep
                                    ? "bg-[var(--accent-primary)]/20 border-[var(--accent-primary)]/50"
                                    : "border-[var(--border-subtle)]"
                        )}>
                            {idx < currentStep && <CheckCircle2 size={10} />}
                            {idx === currentStep && <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />}
                        </div>
                        <span className={clsx(
                            "text-[13px] transition-colors duration-300",
                            idx <= currentStep ? "text-[var(--text-secondary)]" : "text-[var(--text-tertiary)]"
                        )}>
                            {step}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
