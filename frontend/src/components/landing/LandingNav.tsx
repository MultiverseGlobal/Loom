"use client";

import Link from 'next/link';
import { ShiftLogo } from '@/components/brand/ShiftLogo';
import { motion } from 'framer-motion';

export function LandingNav() {
    return (
        <nav className="fixed top-0 left-0 right-0 z-50 glass-header">
            <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
                {/* Logo */}
                <Link href="/" className="flex items-center gap-2 group">
                    <motion.div
                        whileHover={{ rotate: 180 }}
                        transition={{ duration: 0.5, ease: "easeInOut" }}
                    >
                        <ShiftLogo size={32} />
                    </motion.div>
                    <span className="text-[16px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">
                        Shift AI
                    </span>
                </Link>

                {/* Nav Links */}
                <div className="hidden md:flex items-center gap-8">
                    <Link href="#features" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        Features
                    </Link>
                    <Link href="#how-it-works" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        How it works
                    </Link>
                    <Link href="/pricing" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        Pricing
                    </Link>
                    <Link href="/docs" className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                        Docs
                    </Link>
                </div>

                {/* Right Section */}
                <div className="flex items-center gap-3">
                    <Link href="/login">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-[14px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5"
                        >
                            Log in
                        </motion.button>
                    </Link>
                    <Link href="/signup">
                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            className="text-[14px] font-medium bg-[var(--accent-primary)] text-white px-4 py-1.5 rounded-lg hover:opacity-90 transition-opacity"
                        >
                            Start free
                        </motion.button>
                    </Link>
                </div>
            </div>
        </nav>
    );
}
