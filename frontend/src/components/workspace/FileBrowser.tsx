"use client";

import { File, Code2, Layout as LayoutIcon, Settings, Layers, FolderJson } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectFile {
    id: string;
    file_path: string;
    type: string;
    updated_at: string;
}

interface FileBrowserProps {
    files: ProjectFile[];
    selectedFileId?: string;
    onSelectFile: (file: ProjectFile) => void;
}

export function FileBrowser({ files, selectedFileId, onSelectFile }: FileBrowserProps) {
    const getFileIcon = (filePath: string, type: string) => {
        if (filePath.endsWith('.json')) return <FolderJson size={14} />;
        if (type === 'page') return <LayoutIcon size={14} />;
        if (type === 'component') return <Code2 size={14} />;
        if (type === 'config') return <Settings size={14} />;
        return <File size={14} />;
    };

    return (
        <div className="flex flex-col h-full bg-[var(--bg-panel)] border border-[var(--border-default)] rounded-2xl overflow-hidden shadow-sm">
            <div className="p-4 border-b border-[var(--border-subtle)] bg-[var(--bg-root)]/50">
                <div className="flex items-center gap-2">
                    <Layers size={16} className="text-[var(--accent-primary)]" />
                    <h3 className="text-[11px] uppercase tracking-widest font-bold text-[var(--text-tertiary)]">Explorer</h3>
                </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-0.5">
                {files.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-center p-4">
                        <File size={24} className="text-[var(--text-tertiary)] mb-2 opacity-20" />
                        <p className="text-[11px] text-[var(--text-tertiary)] italic">No generated files found.</p>
                    </div>
                ) : (
                    files.map((file) => (
                        <button
                            key={file.id}
                            onClick={() => onSelectFile(file)}
                            className={cn(
                                "w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-left group",
                                selectedFileId === file.id 
                                    ? "bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] border border-[var(--accent-primary)]/20" 
                                    : "text-[var(--text-secondary)] hover:bg-[var(--bg-root)] hover:text-[var(--text-primary)] border border-transparent"
                            )}
                        >
                            <span className={cn(
                                "transition-colors",
                                selectedFileId === file.id ? "text-[var(--accent-primary)]" : "text-[var(--text-tertiary)] group-hover:text-[var(--text-secondary)]"
                            )}>
                                {getFileIcon(file.file_path, file.type)}
                            </span>
                            <span className="text-[13px] font-medium truncate flex-1 leading-none pt-0.5">
                                {file.file_path}
                            </span>
                            
                            {selectedFileId === file.id && (
                                <div className="w-1 h-1 rounded-full bg-[var(--accent-primary)] shadow-[0_0_8px_var(--accent-glow)]" />
                            )}
                        </button>
                    ))
                )}
            </div>
            
            <div className="p-3 border-t border-[var(--border-subtle)] bg-[var(--bg-root)]/30">
                <div className="flex items-center justify-between text-[10px] text-[var(--text-tertiary)] px-1">
                    <span>{files.length} Modules</span>
                    <span>AI Generated</span>
                </div>
            </div>
        </div>
    );
}
