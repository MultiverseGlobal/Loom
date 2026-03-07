"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { authService } from "@/services/auth.service";
import { CreateProjectDialog } from "@/components/dashboard/CreateProjectDialog";
import { projectService, type Project } from "@/services/project.service";
import { AppLayout } from "@/components/layout/AppLayout";
import { toast } from "sonner";
import {
  Plus,
  Folder,
  ArrowRight,
  Sparkles,
  Terminal,
  Zap,
  MoreHorizontal,
  GitBranch,
  Box,
  Globe,
  ExternalLink,
  Clock
} from "lucide-react";
import clsx from "clsx";
import { fetchAPI } from "@/utils/api";
import { createClient } from "@/lib/supabase";

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const searchParams = useSearchParams();

  // Mock connected devices for UI demo
  const [connectedDevices, setConnectedDevices] = useState<any[]>([]);

  useEffect(() => {
    if (searchParams?.get('auth_success') === 'true') {
      toast.success("GitHub account connected successfully!");
    }
  }, [searchParams]);

  useEffect(() => {
    const init = async () => {
      const currentUser = await authService.getUser();
      if (!currentUser) {
        router.push('/login');
      } else {
        setUser(currentUser);
        await Promise.all([
          fetchProjects(),
          fetchActivities(),
          fetchExtensions()
        ]);
        setLoading(false);
      }
    };
    init();

    // Poll for extensions every 5 seconds
    const interval = setInterval(fetchExtensions, 5000);
    return () => clearInterval(interval);
  }, [router]);

  const fetchProjects = async () => {
    try {
      const data = await projectService.getProjects();
      setProjects(data);
    } catch (error) {
      console.error("Failed to fetch projects", error);
    }
  };

  const fetchExtensions = async () => {
    try {
      const { data: { session } } = await createClient().auth.getSession();
      if (!session) return;

      const data = await fetchAPI('/extensions/devices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      if (!data || data.length === 0) {
        setConnectedDevices([]);
        return;
      }

      setConnectedDevices(data.map((ext: any) => ({
        id: ext.id,
        name: ext.machine_info?.hostname || 'VS Code',
        type: ext.machine_info?.ide || 'vscode',
        status: ext.status, // Now dynamically returned by backend
        lastSeen: new Date(ext.last_seen || ext.created_at)
      })));
    } catch (error) {
      console.error("Failed to fetch extensions", error);
    }
  };

  const fetchActivities = async () => {
    try {
      const data = await fetchAPI<{ logs: any[] }>('/activity?limit=5');
      setActivities(data.logs || []);
    } catch (error) {
      console.error("Failed to fetch activities", error);
    }
  };

  const handlePushToIDE = async (projectId: string) => {
    try {
      const data = await fetchAPI<any>(`/projects/${projectId}/push-to-ide`, {
        method: 'POST'
      });

      alert("Pushing to VS Code...");
    } catch (error: any) {
      console.error("Push error:", error);
      alert(error.message || "Error pushing to IDE");
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center min-h-[calc(100vh-100px)]">
          <div className="text-center">
            <div className="relative w-16 h-16 mx-auto mb-6">
              <div className="absolute inset-0 border-t-2 border-white rounded-full animate-spin"></div>
              <div className="absolute inset-2 border-t-2 border-emerald-500 rounded-full animate-spin-slow"></div>
            </div>
            <p className="text-sm text-[#888] animate-pulse">Initializing Control Tower...</p>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-8 p-6">

        {/* Header Section with "Spin" */}
        <div className="relative">
          {/* Background Glow */}
          <div className="absolute -top-20 -left-20 w-96 h-96 bg-[var(--accent-primary)]/5 rounded-full blur-[100px] pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-semibold text-[var(--text-primary)] tracking-tight">Dashboard</h1>
                <span className="px-2 py-0.5 rounded-full bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 text-[var(--accent-primary)] text-[11px] font-medium">
                  System Online
                </span>
              </div>
              <p className="text-[var(--text-secondary)] text-[15px] max-w-xl">
                Manage your logic, monitor connected IDEs, and deploy intelligence.
              </p>
            </div>

            {/* Connected Device Widget */}
            <div className="flex items-center gap-4">
              {connectedDevices.length > 0 ? (
                <div className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-default)] shadow-sm group/device relative">
                  <div className="relative">
                    <Terminal size={16} className={clsx(
                      "transition-colors",
                      connectedDevices[0].status === 'online' ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)]"
                    )} />
                    <span className={clsx(
                      "absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-[var(--bg-panel)]",
                      connectedDevices[0].status === 'online' ? "bg-emerald-500 animate-pulse" : "bg-rose-500"
                    )} />
                  </div>
                  <div className="flex flex-col min-w-[100px]">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-medium text-[var(--text-primary)]">
                        {connectedDevices[0].name}
                      </span>
                      <span className={clsx(
                        "text-[9px] font-bold uppercase ml-2 px-1 rounded",
                        connectedDevices[0].status === 'online' ? "text-emerald-500 bg-emerald-500/10" : "text-rose-500 bg-rose-500/10"
                      )}>
                        {connectedDevices[0].status}
                      </span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] group-hover/device:hidden transition-all">
                      {connectedDevices[0].status === 'online' ? 'Connected' : `Last seen: ${(() => {
                        const date = connectedDevices[0].lastSeen;
                        const diff = (new Date().getTime() - date.getTime()) / 1000;
                        if (diff < 60) return 'Just now';
                        if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
                        if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
                        return date.toLocaleDateString();
                      })()}`}
                    </span>

                    {/* Actions on Hover */}
                    <div className="hidden group-hover/device:flex items-center gap-2 mt-0.5 animate-fadeIn">
                      {connectedDevices[0].status !== 'online' && (
                        <button
                          onClick={() => window.location.href = `vscode://LoomAI.loom-dev-bridge/connect?pairing_id=${connectedDevices[0].id}`}
                          className="text-[10px] text-[var(--accent-primary)] hover:underline"
                        >
                          Open IDE
                        </button>
                      )}
                      <button
                        onClick={async (e) => {
                          e.stopPropagation();
                          if (!confirm("Disconnect this device?")) return;
                          try {
                            await fetchAPI(`/extensions/${connectedDevices[0].id}`, { method: 'DELETE' });
                            fetchExtensions(); // Refresh
                          } catch (err) {
                            toast.error("Failed to disconnect");
                          }
                        }}
                        className="text-[10px] text-rose-500 hover:text-rose-400 hover:underline"
                      >
                        Disconnect
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => router.push('/onboarding/connect')}
                  className="flex items-center gap-3 px-4 py-2 rounded-lg bg-[var(--bg-panel)] border border-[var(--border-default)] shadow-sm cursor-pointer hover:border-[var(--accent-primary)] transition-all group/connect relative overflow-hidden"
                >
                  <div className="absolute inset-0 bg-[var(--accent-primary)]/5 opacity-0 group-hover/connect:opacity-100 transition-opacity" />
                  <Terminal size={16} className="text-[var(--text-tertiary)] group-hover/connect:text-[var(--accent-primary)] transition-colors" />
                  <span className="text-[12px] font-medium text-[var(--text-tertiary)] group-hover/connect:text-[var(--text-primary)] transition-colors">No IDE Connected</span>
                  <div className="w-1.5 h-1.5 rounded-full bg-rose-500/50 group-hover/connect:bg-rose-500 animate-pulse" />
                </div>
              )}

              <button
                onClick={() => setIsCreateDialogOpen(true)}
                className="group flex items-center gap-2 h-10 px-4 rounded-lg bg-[var(--text-primary)] hover:opacity-90 text-[var(--bg-root)] text-[13px] font-medium transition-all shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_25px_rgba(255,255,255,0.2)]"
              >
                <Plus size={16} className="transition-transform group-hover:rotate-90" />
                New Project
              </button>
            </div>
          </div>
        </div>

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Action 1: Import */}
          <div
            onClick={() => router.push('/import')}
            className="group relative p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] hover:border-[var(--border-highlight)] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={18} className="text-[var(--text-secondary)] -translate-x-2 group-hover:translate-x-0 transition-transform" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-[var(--accent-primary)]/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Terminal size={20} className="text-[var(--accent-primary)]" />
            </div>
            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">Import from IDE</h3>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Connect local projects via VSCode extension for analysis.
            </p>
          </div>

          {/* Action 2: Generate */}
          <div
            onClick={() => router.push('/generate')}
            className="group relative p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] hover:border-[var(--border-highlight)] transition-all cursor-pointer overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-50 group-hover:opacity-100 transition-opacity">
              <ArrowRight size={18} className="text-[var(--text-secondary)] -translate-x-2 group-hover:translate-x-0 transition-transform" />
            </div>
            <div className="w-10 h-10 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Sparkles size={20} className="text-violet-500" />
            </div>
            <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">Generate App</h3>
            <p className="text-[13px] text-[var(--text-secondary)]">
              Describe your idea and let Hatch build the architecture.
            </p>
          </div>

          {/* Action 3: Recent Status */}
          <div
            className="relative p-5 rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] overflow-hidden"
          >
            <h3 className="text-[13px] font-medium text-[var(--text-tertiary)] uppercase tracking-wider mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {activities.length === 0 ? (
                <p className="text-[12px] text-[var(--text-tertiary)] italic">No recent activity</p>
              ) : (
                activities.map((activity) => (
                  <div key={activity.id} className="flex items-center gap-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent-primary)]" />
                    <span className="text-[13px] text-[var(--text-primary)] truncate max-w-[180px]">
                      {activity.action.replace(/_/g, ' ')}
                    </span>
                    <span className="ml-auto text-[11px] text-[var(--text-tertiary)] whitespace-nowrap">
                      {new Date(activity.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Projects Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-[18px] font-medium text-white">Active Projects</h2>
            <button className="text-[13px] text-[#888] hover:text-white transition-colors">View All</button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.length === 0 ? (
              <div className="col-span-full py-20 rounded-xl border border-dashed border-[var(--border-default)] flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 rounded-full bg-[var(--bg-panel)] flex items-center justify-center mb-4">
                  <Box size={20} className="text-[var(--text-tertiary)]" />
                </div>
                <h3 className="text-[15px] font-medium text-[var(--text-primary)] mb-1">No pending projects</h3>
                <p className="text-[13px] text-[var(--text-secondary)] mb-4">Import a project or generate a new one to get started.</p>
                <button
                  onClick={() => setIsCreateDialogOpen(true)}
                  className="text-[13px] text-[var(--accent-primary)] hover:opacity-80 font-medium"
                >
                  Create New Project
                </button>
              </div>
            ) : (
              projects.map((project, i) => (
                <div
                  key={project.id}
                  onClick={() => router.push(`/projects/${project.id}`)}
                  className="group rounded-xl bg-[var(--bg-panel)] border border-[var(--border-default)] hover:border-[var(--border-highlight)] transition-all hover:translate-y-[-2px] hover:shadow-lg cursor-pointer flex flex-col overflow-hidden"
                >
                  {/* Project Preview (Placeholder) */}
                  <div className="h-32 bg-[var(--bg-subtle)] border-b border-[var(--border-default)] relative group-hover:bg-[var(--bg-active)] transition-colors">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Folder size={32} className="text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)] transition-colors" />
                    </div>
                    <div className="absolute top-3 right-3 flex gap-2">
                      {project.access_mode === 'analysis' && (
                        <span className="px-2 py-1 rounded bg-amber-500/10 border border-amber-500/20 text-[10px] font-medium text-amber-500 backdrop-blur-sm">
                          Analysis Only
                        </span>
                      )}
                      <span className="px-2 py-1 rounded bg-[var(--bg-root)]/80 backdrop-blur text-[10px] font-medium text-[var(--text-primary)] border border-[var(--border-subtle)]">
                        v1.0.2
                      </span>
                    </div>
                  </div>

                  {/* Project Info */}
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="text-[15px] font-medium text-[var(--text-primary)] group-hover:text-[var(--accent-primary)] transition-colors">{project.name}</h3>
                        <p className="text-[12px] text-[var(--text-secondary)] mt-0.5">{project.framework || 'Custom App'}</p>
                      </div>
                      <div className="flex items-center gap-1">
                        {project.source_url && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePushToIDE(project.id);
                            }}
                            title="Push to VS Code"
                            className="p-1.5 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] hover:bg-[var(--accent-primary)] hover:text-white transition-all"
                          >
                            <ExternalLink size={14} />
                          </button>
                        )}
                        <button className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors">
                          <MoreHorizontal size={16} />
                        </button>
                      </div>
                    </div>

                    <div className="mt-auto pt-4 flex items-center justify-between text-[11px] text-[var(--text-tertiary)]">
                      <div className="flex items-center gap-2">
                        <Globe size={12} />
                        <span>Production</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock size={12} />
                        <span>{new Date(project.created_at).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <CreateProjectDialog
        isOpen={isCreateDialogOpen}
        onClose={() => setIsCreateDialogOpen(false)}
        onSuccess={fetchProjects}
      />
    </AppLayout>
  );
}
