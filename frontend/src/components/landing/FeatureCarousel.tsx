"use client";

import { useRef, useEffect, useState } from "react";
import { motion, useAnimation, useMotionValue } from "framer-motion";
import { Code, Terminal, Github, Zap, Layers, Cpu, Globe, Lock } from "lucide-react";

const features = [
    {
        title: "Universal Project Graph",
        description: "Standardized internal representation for any codebase",
        icon: Layers,
        color: "text-blue-400",
        bg: "bg-blue-400/10"
    },
    {
        title: "Bi-Directional Sync",
        description: "Changes in code reflect in design, and vice-versa",
        icon: Zap,
        color: "text-amber-400",
        bg: "bg-amber-400/10"
    },
    {
        title: "Framework Agnostic",
        description: "Support for React, Vue, Svelte, and more",
        icon: Globe,
        color: "text-emerald-400",
        bg: "bg-emerald-400/10"
    },
    {
        title: "Secure by Design",
        description: "Enterprise-grade security with SOC2 compliance",
        icon: Lock,
        color: "text-rose-400",
        bg: "bg-rose-400/10"
    },
    {
        title: "AI Code Analysis",
        description: "Deep understanding of component relationships",
        icon: Cpu,
        color: "text-purple-400",
        bg: "bg-purple-400/10"
    },
    {
        title: "GitHub Integration",
        description: "One-click PRs and repository management",
        icon: Github,
        color: "text-white",
        bg: "bg-white/10"
    },
    {
        title: "IDE Extensions",
        description: "Native VS Code and Cursor integration",
        icon: Terminal,
        color: "text-cyan-400",
        bg: "bg-cyan-400/10"
    },
    {
        title: "Clean Code Export",
        description: "Production-ready code, not spaghetti",
        icon: Code,
        color: "text-indigo-400",
        bg: "bg-indigo-400/10"
    }
];

export function FeatureCarousel() {
    const [width, setWidth] = useState(0);
    const carousel = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (carousel.current) {
            setWidth(carousel.current.scrollWidth - carousel.current.offsetWidth);
        }
    }, []);

    return (
        <div className="w-full overflow-hidden py-12">
            <motion.div
                ref={carousel}
                className="cursor-grab active:cursor-grabbing overflow-hidden"
                whileTap={{ cursor: "grabbing" }}
            >
                <motion.div
                    drag="x"
                    dragConstraints={{ right: 0, left: -width }}
                    className="flex gap-6 px-6 w-max"
                    animate={{ x: [0, -width / 2] }}
                    transition={{
                        x: {
                            repeat: Infinity,
                            repeatType: "loop",
                            duration: 40,
                            ease: "linear",
                        },
                    }}
                    whileHover={{ animationPlayState: "paused" }}
                >
                    {[...features, ...features].map((feature, index) => {
                        const Icon = feature.icon;
                        return (
                            <motion.div
                                key={index}
                                className="min-w-[300px] h-[180px] p-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-panel)] backdrop-blur-sm flex flex-col justify-between group hover:border-[var(--accent-primary)] transition-colors"
                                whileHover={{ y: -5, boxShadow: "0 10px 30px -10px rgba(0,0,0,0.3)" }}
                            >
                                <div className={`w-10 h-10 rounded-lg ${feature.bg} flex items-center justify-center mb-4`}>
                                    <Icon size={20} className={feature.color} />
                                </div>
                                <div>
                                    <h3 className="text-[16px] font-semibold text-[var(--text-primary)] mb-1 group-hover:text-[var(--accent-primary)] transition-colors">
                                        {feature.title}
                                    </h3>
                                    <p className="text-[13px] text-[var(--text-secondary)]">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        );
                    })}
                </motion.div>
            </motion.div>
        </div>
    );
}
