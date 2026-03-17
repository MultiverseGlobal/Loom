"use client";

import { Box, Code2, Download, Github, Loader2, Play, Terminal } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { fetchAPI } from "@/utils/api";

interface WorkspaceControlsProps {
  projectId: string;
  projectName: string;
  isLaunching: boolean;
  onLaunchExtension: () => void;
}

export function WorkspaceControls({
  projectId,
  projectName,
  isLaunching,
  onLaunchExtension
}: WorkspaceControlsProps) {
  const [isPushingGithub, setIsPushingGithub] = useState(false);

  const handlePushToGithub = async () => {
    setIsPushingGithub(true);
    try {
      // Show prompt for repo name or use project name
      const repoNameInput = prompt("Enter GitHub repository name:", projectName.toLowerCase().replace(/\s+/g, '-'));
      if (!repoNameInput) {
        setIsPushingGithub(false);
        return;
      }

      const result = await fetchAPI<any>(`/projects/${projectId}/push-to-github`, {
        method: 'POST',
        body: JSON.stringify({
          repoName: repoNameInput,
          createRepo: true,
          isPrivate: true
        })
      });

      if (result.success) {
        toast.success(`Successfully pushed to ${result.data.repoUrl}`);
      } else {
        toast.error(result.error || "Failed to push to GitHub");
      }
    } catch (err: any) {
      toast.error(err.message || "Error pushing to GitHub");
    } finally {
      setIsPushingGithub(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-[var(--bg-panel)] border-b border-[var(--border-default)]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20">
          <Box size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">{projectName}</h1>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-wider font-bold">Migration Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLaunchExtension}
          disabled={isLaunching}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#8b5cf6]/10 text-[#8b5cf6] border border-[#8b5cf6]/20 rounded-md hover:bg-[#8b5cf6]/20 transition-all text-xs font-medium disabled:opacity-50"
        >
          {isLaunching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          Open IDE
        </button>

        <button
          onClick={handlePushToGithub}
          disabled={isPushingGithub}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-root)] rounded-md hover:bg-[var(--text-primary)]/90 transition-all text-xs font-medium disabled:opacity-50"
        >
          {isPushingGithub ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
          Push to GitHub
        </button>

        <button
          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-all"
          title="Download ZIP"
        >
          <Download size={16} />
        </button>
      </div>
    </div>
  );
}
