"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
    Home,
    UploadCloud,
    Activity,
    GitBranch,
    Settings,
    Command,
    Zap,
    LifeBuoy,
    ChevronLeft,
    ChevronRight,
    Search,
    User
} from "lucide-react";
import { ShiftLogo } from "@/components/brand/ShiftLogo";
import clsx from "clsx";
import { socketService } from "@/services/socket";

export function Sidebar() {
    const pathname = usePathname();
    const [isCollapsed, setIsCollapsed] = useState(true);
    const [isHovered, setIsHovered] = useState(false);
    const [isOnline, setIsOnline] = useState(false);
    const [isLocalMode, setIsLocalMode] = useState(false);

    useEffect(() => {
        // Simple check for local mode (in real app, this might come from a config API)
        const checkLocalMode = () => {
            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            setIsLocalMode(isLocal);
            if (isLocal) setIsOnline(true);
        };
        checkLocalMode();

        // Subscribe to socket status
        const unsubscribe = socketService.onStatusChange((status) => {
            if (isLocalMode) return; // Don't override if local
            setIsOnline(status);
        });
        return () => {
            unsubscribe();
        };
    }, [isLocalMode]);

    // Close sidebar (un-hover) on page navigation
    useEffect(() => {
        setIsHovered(false);
        // Optionally force collapse if it was just a hover-state interaction? 
        // Since isHovered handles the 'pop out', resetting it is enough.
        // If the user has explicitly toggled it open (isCollapsed=false), we honor that (arrow button).
    }, [pathname]);

    // Auto-collapse on mobile / smaller screens
    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1280) {
                setIsCollapsed(true);
            }
            // Removed auto-expand else block to respect user preference/default
        };
        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const navigation = [
        { name: "Import Project", href: "/import", icon: Zap },
        { name: "Projects", href: "/dashboard", icon: Home },
        { name: "Analysis", href: "/analysis", icon: Activity },
    ];

    const tools = [
        { name: "Integrations", href: "/integrations", icon: Command },
        { name: "Versions", href: "/versions", icon: GitBranch },
        { name: "Settings", href: "/settings", icon: Settings },
    ];

    const isExpanded = !isCollapsed || isHovered;

    const [leaveTimeout, setLeaveTimeout] = useState<NodeJS.Timeout | null>(null);

    const handleMouseEnter = () => {
        if (leaveTimeout) {
            clearTimeout(leaveTimeout);
            setLeaveTimeout(null);
        }
        setIsHovered(true);
    };

    const handleMouseLeave = () => {
        const timeout = setTimeout(() => {
            setIsHovered(false);
        }, 300); // 300ms delay to prevent "hooking"
        setLeaveTimeout(timeout);
    };

    return (
        <aside
            className={clsx(
                "fixed left-0 top-0 h-screen border-r border-[var(--border-subtle)] bg-[var(--bg-panel)] flex flex-col transition-all duration-300 ease-[cubic-bezier(0.25,1,0.5,1)] z-50 overflow-hidden text-[var(--text-primary)]",
                isExpanded ? "w-[260px]" : "w-[68px]"
            )}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            {/* Logo Area */}
            <div className="flex h-[60px] items-center px-4 mb-2 relative group/logo">
                <Link href="/" className={clsx(
                    "flex items-center gap-3 font-semibold tracking-tight transition-all duration-300",
                    !isExpanded && "justify-center w-full"
                )}>
                    <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-subtle)] shadow-sm">
                        <ShiftLogo size={20} />
                    </div>
                    {isExpanded && (
                        <div className="flex flex-col animate-fadeIn">
                            <span className="text-[var(--text-primary)] text-[15px] leading-none">Shift AI</span>
                            <span className="text-[var(--text-tertiary)] text-[11px] font-medium mt-0.5">Workspace</span>
                        </div>
                    )}
                </Link>

                {/* Collapse Toggle */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={clsx(
                        "absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all",
                        !isExpanded && "hidden" // Hide in collapsed mode to avoid clutter
                    )}
                >
                    {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
                </button>
            </div>

            {/* User Profile / Workspace */}
            <div className="px-3 mb-6">
                <div className={clsx(
                    "flex items-center gap-3 p-2 rounded-lg bg-[var(--bg-subtle)] border border-[var(--border-default)] hover:border-[var(--border-highlight)] transition-colors cursor-pointer group",
                    !isExpanded && "p-0 bg-transparent border-0 justify-center h-10 w-10 mx-auto"
                )}>
                    <div className="w-6 h-6 rounded-full bg-gradient-to-tr from-[var(--accent-primary)] to-[var(--accent-secondary)] flex items-center justify-center text-[10px] text-white font-bold shrink-0">
                        S
                    </div>
                    {isExpanded && (
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                                <span className="text-[13px] font-medium text-[var(--text-primary)] truncate">Shift Environment</span>
                            </div>
                            <div className="text-[11px] text-[var(--text-secondary)] truncate">Pro Plan</div>
                        </div>
                    )}
                    {isExpanded && <ChevronRight size={12} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />}
                </div>
            </div>

            {/* Navigation Groups */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden px-3 space-y-6 scrollbar-none">

                {/* Main Nav */}
                <div className="space-y-1">
                    {isExpanded && (
                        <h3 className="px-2 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Platform</h3>
                    )}
                    {navigation.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-[var(--bg-active)] text-[var(--text-primary)] shadow-sm"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                                    !isExpanded && "justify-center px-0 py-2.5"
                                )}
                            >
                                <item.icon
                                    size={18}
                                    strokeWidth={2}
                                    className={clsx(
                                        "transition-colors",
                                        isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]"
                                    )}
                                />
                                {isExpanded && <span>{item.name}</span>}

                                {/* Active Indicator (Collapsed) */}
                                {!isExpanded && isActive && (
                                    <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-3 rounded-r-full bg-[var(--accent-primary)]" />
                                )}

                                {/* Tooltip */}
                                {!isExpanded && (
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--bg-active)] border border-[var(--border-subtle)] rounded text-[11px] text-[var(--text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>

                {/* Tools Nav */}
                <div className="space-y-1">
                    {isExpanded && (
                        <h3 className="px-2 text-[10px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-2">Tools</h3>
                    )}
                    {tools.map((item) => {
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                href={item.href}
                                className={clsx(
                                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium transition-all duration-200 group relative",
                                    isActive
                                        ? "bg-[var(--bg-active)] text-[var(--text-primary)] border border-[var(--border-subtle)]"
                                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]",
                                    !isExpanded && "justify-center px-0 py-2.5"
                                )}
                            >
                                <item.icon
                                    size={18}
                                    strokeWidth={2}
                                    className={clsx(
                                        "transition-colors",
                                        isActive ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)]"
                                    )}
                                />
                                {isExpanded && <span>{item.name}</span>}

                                {/* Tooltip */}
                                {!isExpanded && (
                                    <div className="absolute left-full ml-3 px-2 py-1 bg-[var(--bg-active)] border border-[var(--border-subtle)] rounded text-[11px] text-[var(--text-primary)] whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity z-50 pointer-events-none">
                                        {item.name}
                                    </div>
                                )}
                            </Link>
                        );
                    })}
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="p-3 mt-auto space-y-2">
                {/* Upgrade / Promo */}
                {isExpanded ? (
                    <div className={clsx(
                        "p-3 rounded-lg border relative overflow-hidden group transition-all",
                        isOnline ? "bg-gradient-to-br from-[var(--bg-subtle)] to-[var(--bg-active)] border-[var(--border-default)] hover:border-[var(--border-highlight)]" : "bg-[var(--bg-subtle)] border-[var(--border-default)] opacity-70"
                    )}>
                        <div className="relative z-10">
                            <div className="flex items-center gap-2 mb-2">
                                <Zap size={14} className={clsx(
                                    isOnline ? "text-[var(--accent-primary)] fill-[var(--accent-primary)]/20" : "text-[var(--text-tertiary)]"
                                )} />
                                <span className={clsx(
                                    "text-[12px] font-medium",
                                    isOnline ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
                                )}>
                                    {isLocalMode ? "Local Mode" : (isOnline ? "System Online" : "Disconnected")}
                                </span>
                            </div>
                            <div className="h-1 w-full bg-[var(--bg-root)] rounded-full overflow-hidden">
                                <div className={clsx(
                                    "h-full rounded-full transition-all duration-500",
                                    isOnline ? "w-2/3 bg-[var(--accent-primary)] animate-pulse" : "w-full bg-[var(--text-tertiary)]"
                                )} />
                            </div>
                            <div className="mt-2 flex justify-between text-[10px] text-[var(--text-tertiary)]">
                                <span>Sync Status</span>
                                <span className={isOnline ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]"}>
                                    {isOnline ? "Active" : "Retry..."}
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex justify-center">
                        <div className={clsx(
                            "w-8 h-8 rounded-full border flex items-center justify-center transition-colors",
                            isOnline ? "bg-[var(--bg-subtle)] border-[var(--border-default)]" : "bg-[var(--bg-subtle)] border-[var(--border-default)] opacity-50"
                        )}>
                            <Zap size={14} className={clsx(
                                isOnline ? "text-[var(--accent-primary)] fill-[var(--accent-primary)]/20" : "text-[var(--text-tertiary)]"
                            )} />
                        </div>
                    </div>
                )}

                {/* Help */}
                <button className={clsx(
                    "flex items-center gap-3 rounded-md px-2.5 py-2 text-[13px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] transition-all w-full",
                    !isExpanded && "justify-center px-0"
                )}>
                    <LifeBuoy size={18} />
                    {isExpanded && <span>Help & Docs</span>}
                </button>
            </div>
        </aside>
    );
}
