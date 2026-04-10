export interface IntegrationConfig {
  enabled: boolean;
  apiKey?: string;
  webhookUrl?: string;
  metadata?: Record<string, unknown>;
}

export interface IntegrationAdapter {
  name: string;
  initialize(config: IntegrationConfig): Promise<void>;
  processEvent(event: IntegrationEvent): Promise<IntegrationResponse>;
  healthCheck(): Promise<boolean>;
}

export interface IntegrationEvent {
  type: string;
  projectId: string;
  payload: Record<string, unknown>;
  userConfig?: Partial<IntegrationConfig>;
}

export interface IntegrationResponse {
  success: boolean;
  data?: Record<string, unknown>;
  error?: string;
}

export abstract class BaseIntegration implements IntegrationAdapter {
  constructor(public name: string, protected config: IntegrationConfig) {}

  async initialize(config: IntegrationConfig): Promise<void> {
    this.config = config;
    if (config.enabled && !(await this.healthCheck())) {
      throw new Error(`Integration ${this.name} health check failed`);
    }
  }

  abstract processEvent(event: IntegrationEvent): Promise<IntegrationResponse>;

  async healthCheck(): Promise<boolean> {
    return this.config.enabled;
  }
}

