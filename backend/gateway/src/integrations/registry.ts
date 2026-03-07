import type { IntegrationAdapter, IntegrationConfig, IntegrationEvent } from "./base";

const integrations = new Map<string, IntegrationAdapter>();

export function registerIntegration(name: string, adapter: IntegrationAdapter) {
  integrations.set(name, adapter);
}

export function getIntegration(name: string): IntegrationAdapter | undefined {
  return integrations.get(name);
}

export function getAllIntegrations(): IntegrationAdapter[] {
  return Array.from(integrations.values());
}

export async function processIntegrationEvent(
  integrationName: string,
  event: IntegrationEvent,
): Promise<{ success: boolean; error?: string }> {
  const adapter = getIntegration(integrationName);
  if (!adapter) {
    return { success: false, error: `Integration ${integrationName} not found` };
  }

  try {
    const result = await adapter.processEvent(event);
    return { success: result.success, error: result.error };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function initializeIntegration(name: string, config: IntegrationConfig): Promise<void> {
  const adapter = getIntegration(name);
  if (!adapter) {
    throw new Error(`Integration ${name} not found`);
  }
  await adapter.initialize(config);
}

