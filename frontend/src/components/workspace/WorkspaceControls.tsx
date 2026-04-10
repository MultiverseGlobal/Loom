import { Box, Code2, Download, Github, Loader2, Play, Terminal, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { projectService } from "@/services/project.service";

interface WorkspaceControlsProps {
  projectId: string;
  projectName: string;
  isLaunching: boolean;
  onLaunchExtension: () => void;
  onDownload: () => void;
  isDownloading?: boolean;
}

export function WorkspaceControls({
  projectId,
  projectName,
  isLaunching,
  onLaunchExtension,
  onDownload,
  isDownloading
}: WorkspaceControlsProps) {
  const [isPushingGithub, setIsPushingGithub] = useState(false);

  const handlePushToGithub = async () => {
    setIsPushingGithub(true);
    const toastId = toast.loading("Preparing GitHub migration...");
    try {
      const repoNameInput = prompt("Enter GitHub repository name:", projectName.toLowerCase().replace(/\s+/g, '-'));
      if (!repoNameInput) {
        setIsPushingGithub(false);
        toast.dismiss(toastId);
        return;
      }

      const result = await projectService.pushToGithub(projectId, {
        repoName: repoNameInput,
        createRepo: true,
        isPrivate: true
      });

      if (result.success) {
        toast.success(`Successfully pushed to ${result.repoUrl}`, { id: toastId });
        window.open(`https://github.com/${result.repoUrl}`, '_blank');
      }
    } catch (err: any) {
      toast.error(err.message || "Error pushing to GitHub", { id: toastId });
    } finally {
      setIsPushingGithub(false);
    }
  };

  return (
    <div className="flex items-center justify-between gap-4 p-4 bg-[var(--bg-panel)] border-b border-[var(--border-default)]">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 shadow-[0_0_15px_var(--accent-glow)]">
          <Box size={18} />
        </div>
        <div>
          <h1 className="text-sm font-semibold text-[var(--text-primary)]">{projectName}</h1>
          <p className="text-[10px] text-[var(--text-tertiary)] uppercase tracking-[0.2em] font-bold">Migration Workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onLaunchExtension}
          disabled={isLaunching}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20 rounded-md hover:bg-[var(--accent-primary)]/20 hover:border-[var(--accent-primary)]/40 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50"
        >
          {isLaunching ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} fill="currentColor" />}
          Open IDE
        </button>

        <button
          onClick={handlePushToGithub}
          disabled={isPushingGithub}
          className="flex items-center gap-2 px-3 py-1.5 bg-[var(--text-primary)] text-[var(--bg-root)] border border-transparent rounded-md hover:opacity-90 transition-all text-xs font-bold uppercase tracking-wider disabled:opacity-50 shadow-[0_0_20px_rgba(255,255,255,0.05)]"
        >
          {isPushingGithub ? <Loader2 size={14} className="animate-spin" /> : <Github size={14} />}
          Push to GitHub
        </button>

        <div className="w-px h-6 bg-[var(--border-default)] mx-1" />

        <button
          onClick={onDownload}
          disabled={isDownloading}
          className="p-1.5 text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)] rounded-md transition-all disabled:opacity-50"
          title="Download ZIP"
        >
          {isDownloading ? <Loader2 size={16} className="animate-spin text-[var(--accent-primary)]" /> : <Download size={16} />}
        </button>
      </div>
    </div>
  );
}
