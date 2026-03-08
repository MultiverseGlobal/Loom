"use client";

import { Bell, Search, HelpCircle, ChevronDown } from "lucide-react";
import { useState, useEffect } from "react";
import Link from "next/link";
import { authService } from "@/services/auth.service";
import { useRouter } from "next/navigation";

export function Header() {
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [user, setUser] = useState<any>(null);
    const router = useRouter();

    useEffect(() => {
        const loadUser = async () => {
            const currentUser = await authService.getUser();
            setUser(currentUser);
        };
        loadUser();
    }, []);

    const handleSignOut = async () => {
        await authService.signOut();
        router.push('/login');
        router.refresh();
    };

    // Get initials from user metadata or email
    const getInitials = () => {
        if (!user) return "??";
        const name = user.user_metadata?.full_name || user.email || "";
        return name.slice(0, 2).toUpperCase();
    };

    const getName = () => {
        return user?.user_metadata?.full_name || "User";
    };

    const getEmail = () => {
        return user?.email || "";
    };

    return (
        <header className="glass-header sticky top-0 z-10 flex h-12 items-center justify-between px-4">
            {/* Left: Breadcrumbs (Mock) */}
            <div className="flex items-center gap-2 text-[13px]">
                <span className="text-[var(--text-secondary)]">Shift</span>
                <span className="text-[var(--text-tertiary)]">/</span>
                <span className="text-[var(--text-primary)] font-medium">Dashboard</span>
            </div>

            {/* Center: AI Status Indicator */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-[var(--bg-subtle)] border border-[var(--border-subtle)]">
                <div className="h-1.5 w-1.5 rounded-full bg-[var(--accent-primary)] animate-pulse" />
                <span className="text-[12px] font-medium text-[var(--text-secondary)]">Shift Engine: <span className="text-[var(--text-primary)]">Idle</span></span>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-3">
                <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    <Search size={16} />
                </button>
                <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors relative">
                    <Bell size={16} />
                    <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-red-500" />
                </button>
                <button className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors">
                    <HelpCircle size={16} />
                </button>

                {/* User Dropdown */}
                <div className="relative">
                    <button
                        onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                        className="flex items-center gap-2 px-2 py-1 rounded-md hover:bg-[var(--bg-hover)] transition-colors"
                    >
                        <div className="h-7 w-7 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center text-[var(--accent-primary)] text-[12px] font-semibold">
                            {getInitials()}
                        </div>
                        <ChevronDown size={14} className="text-[var(--text-tertiary)]" />
                    </button>

                    {isDropdownOpen && (
                        <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-[var(--border-default)] bg-[var(--bg-panel)] shadow-lg py-1 z-50">
                            <div className="px-3 py-2 border-b border-[var(--border-subtle)]">
                                <p className="text-[13px] font-medium text-[var(--text-primary)] truncate">{getName()}</p>
                                <p className="text-[12px] text-[var(--text-tertiary)] truncate">{getEmail()}</p>
                            </div>
                            <Link
                                href="/settings"
                                className="block px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Settings
                            </Link>
                            <Link
                                href="/docs"
                                className="block px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Documentation
                            </Link>
                            <Link
                                href="/pricing"
                                className="block px-3 py-2 text-[13px] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
                            >
                                Upgrade
                            </Link>
                            <div className="border-t border-[var(--border-subtle)] mt-1 pt-1">
                                <button
                                    onClick={handleSignOut}
                                    className="block w-full text-left px-3 py-2 text-[13px] text-red-500 hover:bg-red-500/10 transition-colors"
                                >
                                    Log out
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </header>
    );
}
