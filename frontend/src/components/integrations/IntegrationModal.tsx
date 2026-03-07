"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/Dialog";
import { Loader2, FolderGit2, Search, Link2, AlertCircle } from "lucide-react";
import { integrationsService, IntegrationResource } from "@/services/integrations.service";

interface Project {
    id: string;
    name: string;
}

interface IntegrationModalProps {
    isOpen: boolean;
    provider: string;
    integrationId: string;
    onClose: () => void;
    onLinked: () => void;
}

export function IntegrationModal({ isOpen, provider, integrationId, onClose, onLinked }: IntegrationModalProps) {
    const [step, setStep] = useState<"select-resource" | "select-project">("select-resource");
    const [resources, setResources] = useState<IntegrationResource[]>([]);
    const [projects, setProjects] = useState<Project[]>([]);
    const [selectedResource, setSelectedResource] = useState<IntegrationResource | null>(null);
    const [loading, setLoading] = useState(false);
    const [linking, setLinking] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");

    useEffect(() => {
        if (isOpen) {
            loadResources();
            loadProjects();
        }
    }, [isOpen, integrationId]);

    const loadResources = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await integrationsService.getIntegrationResources(integrationId);
            setResources(data);
        } catch (err: any) {
            console.error('Failed to load resources:', err);
            setError(err.message || 'Failed to load resources');
        } finally {
            setLoading(false);
        }
    };

    const loadProjects = async () => {
        try {
            const { fetchAPI } = await import("@/utils/api");
            const data = await fetchAPI<Project[]>('/projects');
            setProjects(data);
        } catch (err) {
            console.error('Failed to load projects:', err);
        }
    };

    const handleSelectResource = (resource: IntegrationResource) => {
        setSelectedResource(resource);
        setStep("select-project");
    };

    const handleLinkToProject = async (projectId: string) => {
        if (!selectedResource) return;

        setLinking(true);
        setError(null);

        try {
            await integrationsService.linkToProject(projectId, {
                integration_id: integrationId,
                resource_type: selectedResource.type,
                resource_id: selectedResource.id,
                resource_name: selectedResource.name,
                sync_enabled: true,
                sync_config: {}
            });

            onLinked();
        } catch (err: any) {
            console.error('Failed to link:', err);
            setError(err.message || 'Failed to link to project');
        } finally {
            setLinking(false);
        }
    };

    const filteredResources = resources.filter(r =>
        r.name.toLowerCase().includes(search.toLowerCase()) ||
        r.full_name?.toLowerCase().includes(search.toLowerCase())
    );

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-[#141414] border border-[#2C2C2C] text-white max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Link2 size={20} />
                        Link {provider} to Project
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-start gap-2">
                        <AlertCircle size={14} className="text-red-400 mt-0.5 flex-shrink-0" />
                        <p className="text-xs text-red-300">{error}</p>
                    </div>
                )}

                {step === "select-resource" && (
                    <div className="space-y-4 py-4">
                        <p className="text-sm text-[#888]">
                            Select a {provider === 'github' ? 'repository' : 'resource'} to link
                        </p>

                        <div className="relative">
                            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#666]" />
                            <input
                                type="text"
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-[#1C1C1C] border border-[#333] rounded-lg pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>

                        <div className="h-[400px] overflow-y-auto border border-[#222] rounded-lg">
                            {loading ? (
                                <div className="flex items-center justify-center h-full text-[#666] gap-2">
                                    <Loader2 size={16} className="animate-spin" />
                                    Loading...
                                </div>
                            ) : filteredResources.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-[#444]">
                                    No resources found.
                                </div>
                            ) : (
                                <div className="divide-y divide-[#222]">
                                    {filteredResources.map(resource => (
                                        <button
                                            key={resource.id}
                                            onClick={() => handleSelectResource(resource)}
                                            className="w-full text-left p-4 hover:bg-[#1f1f1f] transition-colors flex items-start gap-3 group"
                                        >
                                            <div className="mt-1 text-[#666] group-hover:text-emerald-500 transition-colors">
                                                <FolderGit2 size={16} />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-sm font-medium text-white group-hover:text-emerald-400">
                                                    {resource.full_name || resource.name}
                                                </div>
                                                {resource.description && (
                                                    <p className="text-xs text-[#666] line-clamp-1 mt-0.5">
                                                        {resource.description}
                                                    </p>
                                                )}
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {step === "select-project" && (
                    <div className="space-y-4 py-4">
                        <div>
                            <p className="text-sm text-[#888] mb-2">Selected: <span className="text-white font-medium">{selectedResource?.name}</span></p>
                            <p className="text-sm text-[#888]">Link to which project?</p>
                        </div>

                        <div className="h-[400px] overflow-y-auto border border-[#222] rounded-lg">
                            {projects.length === 0 ? (
                                <div className="flex items-center justify-center h-full text-[#444]">
                                    No projects found. Create a project first.
                                </div>
                            ) : (
                                <div className="divide-y divide-[#222]">
                                    {projects.map(project => (
                                        <button
                                            key={project.id}
                                            onClick={() => handleLinkToProject(project.id)}
                                            disabled={linking}
                                            className="w-full text-left p-4 hover:bg-[#1f1f1f] transition-colors flex items-center justify-between group disabled:opacity-50"
                                        >
                                            <span className="text-sm font-medium text-white group-hover:text-emerald-400">
                                                {project.name}
                                            </span>
                                            {linking && (
                                                <Loader2 size={14} className="animate-spin text-emerald-500" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div className="flex justify-start">
                            <button
                                onClick={() => setStep("select-resource")}
                                className="px-4 py-2 text-sm text-[#888] hover:text-white transition-colors"
                            >
                                ← Back
                            </button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
