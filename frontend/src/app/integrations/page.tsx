"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Github, Figma, Link as LinkIcon, Loader2, Settings, CheckCircle2, XCircle } from "lucide-react";
import { integrationsService, Integration } from "@/services/integrations.service";
import { githubService } from "@/services/github.service";
import { IntegrationModal } from "@/components/integrations/IntegrationModal";
import { toast } from "sonner";
import { useSearchParams } from "next/navigation";

const INTEGRATIONS_CONFIG = [
    {
        provider: 'github' as const,
        name: 'GitHub',
        icon: Github,
        description: 'Import repositories and sync code',
        color: '#6CC644'
    },
    {
        provider: 'figma' as const,
        name: 'Figma',
        icon: Figma,
        description: 'Import designs and prototypes',
        color: '#F24E1E',
        comingSoon: true
    },
    {
        provider: 'linear' as const,
        name: 'Linear',
        icon: LinkIcon,
        description: 'Track issues and project progress',
        color: '#5E6AD2',
        comingSoon: true
    },
    {
        provider: 'notion' as const,
        name: 'Notion',
        icon: LinkIcon,
        description: 'Connect documentation and specs',
        color: '#000000',
        comingSoon: true
    }
];

export default function IntegrationsPage() {
    const [integrations, setIntegrations] = useState<Integration[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedIntegration, setSelectedIntegration] = useState<{ provider: string; integrationId?: string } | null>(null);
    const searchParams = useSearchParams();

    useEffect(() => {
        loadIntegrations();

        if (searchParams?.get('success') === 'true') {
            toast.success("Successfully connected to GitHub!");
        }
    }, [searchParams]);

    const loadIntegrations = async () => {
        try {
            setLoading(true);
            const data = await integrationsService.getIntegrations();
            setIntegrations(data);
        } catch (err) {
            console.error('Failed to load integrations:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleConnect = async (provider: string) => {
        if (provider === 'github') {
            try {
                const url = await githubService.getAuthorizeUrl();
                window.location.href = url;
            } catch (err: any) {
                console.error('Failed to connect GitHub:', err);
                alert(err.message || 'Failed to connect to GitHub');
            }
        } else {
            alert(`${provider} integration coming soon!`);
        }
    };

    const handleConfigure = (provider: string, integrationId: string) => {
        setSelectedIntegration({ provider, integrationId });
    };

    const handleDisconnect = async (integrationId: string, provider: string) => {
        if (!confirm(`Are you sure you want to disconnect ${provider}?`)) return;

        try {
            await integrationsService.disconnectIntegration(integrationId);
            await loadIntegrations();
        } catch (err: any) {
            console.error('Failed to disconnect:', err);
            alert(err.message || 'Failed to disconnect integration');
        }
    };

    const getIntegrationForProvider = (provider: string) => {
        return integrations.find(i => i.provider === provider);
    };

    return (
        <AppLayout>
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-medium text-[var(--text-primary)]">Integrations</h1>
                    <p className="text-[13px] text-[var(--text-secondary)] mt-1">
                        Connect external tools to import projects and sync your work.
                    </p>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-12">
                        <Loader2 size={24} className="animate-spin text-[var(--text-tertiary)]" />
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Development Tools */}
                        <div className="space-y-4">
                            <h2 className="text-[14px] font-medium text-[var(--text-primary)] uppercase tracking-wider">
                                Development Tools
                            </h2>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                {INTEGRATIONS_CONFIG.map((config) => {
                                    const integration = getIntegrationForProvider(config.provider);
                                    const Icon = config.icon;
                                    const isConnected = !!integration;

                                    return (
                                        <div
                                            key={config.provider}
                                            className="glass-panel rounded-xl p-6 hover:border-[var(--border-highlight)] transition-all"
                                        >
                                            <div className="flex items-start justify-between mb-3">
                                                <div
                                                    className="w-10 h-10 rounded-lg flex items-center justify-center"
                                                    style={{ backgroundColor: `${config.color}20` }}
                                                >
                                                    <Icon size={20} style={{ color: config.color }} />
                                                </div>
                                                {isConnected && (
                                                    <CheckCircle2 size={16} className="text-emerald-400" />
                                                )}
                                            </div>

                                            <h3 className="text-[14px] font-medium text-[var(--text-primary)] mb-1">
                                                {config.name}
                                            </h3>
                                            <p className="text-[12px] text-[var(--text-tertiary)] mb-4 min-h-[36px]">
                                                {config.description}
                                            </p>

                                            {config.comingSoon ? (
                                                <div className="text-[11px] px-3 py-1.5 rounded-lg bg-[var(--bg-active)] text-[var(--text-tertiary)] text-center">
                                                    Coming Soon
                                                </div>
                                            ) : isConnected ? (
                                                <div className="flex gap-2">
                                                    <button
                                                        onClick={() => handleConfigure(config.provider, integration.id)}
                                                        className="flex-1 rounded-lg bg-[var(--bg-active)] px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all flex items-center justify-center gap-1.5"
                                                    >
                                                        <Settings size={14} />
                                                        Configure
                                                    </button>
                                                    <button
                                                        onClick={() => handleDisconnect(integration.id, config.name)}
                                                        className="rounded-lg bg-[var(--bg-active)] px-3 py-1.5 text-[12px] font-medium text-red-400 hover:bg-red-500/10 transition-all"
                                                        title="Disconnect"
                                                    >
                                                        <XCircle size={14} />
                                                    </button>
                                                </div>
                                            ) : (
                                                <button
                                                    onClick={() => handleConnect(config.provider)}
                                                    className="w-full rounded-lg bg-[var(--bg-active)] px-4 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-all"
                                                >
                                                    Connect
                                                </button>
                                            )}

                                            {isConnected && integration.last_synced_at && (
                                                <p className="text-[10px] text-[var(--text-tertiary)] mt-2">
                                                    Last synced: {new Date(integration.last_synced_at).toLocaleDateString()}
                                                </p>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {selectedIntegration && (
                <IntegrationModal
                    isOpen={true}
                    provider={selectedIntegration.provider}
                    integrationId={selectedIntegration.integrationId!}
                    onClose={() => setSelectedIntegration(null)}
                    onLinked={() => {
                        setSelectedIntegration(null);
                        loadIntegrations();
                    }}
                />
            )}
        </AppLayout>
    );
}
