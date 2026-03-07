"use client";

import { Construction, Beaker, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

interface ComingSoonProps {
    title: string;
    description: string;
    icon?: "construction" | "lab";
}

export function ComingSoon({ title, description, icon = "construction" }: ComingSoonProps) {
    return (
        <AppLayout>
            <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center p-6 text-center animate-fadeIn relative overflow-hidden">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--accent-primary)]/5 blur-[120px] rounded-full" />
                </div>

                <div className="relative z-10 max-w-md w-full p-8 rounded-2xl border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-xl">
                    <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--bg-subtle)] border border-[var(--border-subtle)] flex items-center justify-center">
                        {icon === "lab" ? (
                            <Beaker size={32} className="text-[var(--accent-primary)]" />
                        ) : (
                            <Construction size={32} className="text-[var(--accent-primary)]" />
                        )}
                    </div>

                    <h1 className="text-2xl font-bold text-[var(--text-primary)] mb-3">
                        {title}
                    </h1>

                    <p className="text-[var(--text-secondary)] mb-8 leading-relaxed">
                        {description}
                    </p>

                    <div className="flex justify-center">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-highlight)] transition-all font-medium text-sm"
                        >
                            <ArrowLeft size={16} />
                            Back to Dashboard
                        </Link>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
