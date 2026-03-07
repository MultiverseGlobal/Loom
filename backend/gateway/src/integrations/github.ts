import axios from "axios";
import { BaseIntegration, type IntegrationEvent, type IntegrationResponse } from "./base";

export class GitHubIntegration extends BaseIntegration {
  constructor(config: { enabled: boolean; apiKey?: string; webhookUrl?: string }) {
    super("github", config);
  }

  async processEvent(event: IntegrationEvent): Promise<IntegrationResponse> {
    if (!this.config.enabled || !this.config.apiKey) {
      return { success: false, error: "GitHub integration not configured" };
    }

    if (event.type === "export") {
      const { repoUrl, branch, files } = event.payload as {
        repoUrl?: string;
        branch?: string;
        files?: Array<{ path: string; content: string }>;
      };

      if (!repoUrl || !files) {
        return { success: false, error: "Missing repoUrl or files" };
      }

      try {
        const response = await axios.post(
          `https://api.github.com/repos/${repoUrl}/contents`,
          {
            message: `Loom AI export: ${new Date().toISOString()}`,
            branch: branch ?? "main",
            files,
          },
          {
            headers: {
              Authorization: `Bearer ${this.config.apiKey}`,
              Accept: "application/vnd.github.v3+json",
            },
          },
        );

        return { success: true, data: { commitSha: response.data.commit?.sha } };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "GitHub API error",
        };
      }
    }

    return { success: false, error: `Unsupported event type: ${event.type}` };
  }

  async healthCheck(): Promise<boolean> {
    if (!this.config.enabled || !this.config.apiKey) {
      return false;
    }

    try {
      const response = await axios.get("https://api.github.com/user", {
        headers: { Authorization: `Bearer ${this.config.apiKey}` },
      });
      return response.status === 200;
    } catch {
      return false;
    }
  }
}

