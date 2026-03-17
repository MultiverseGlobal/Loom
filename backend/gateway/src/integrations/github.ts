import { GithubService } from "../services/githubService.js";
import { BaseIntegration, IntegrationEvent, IntegrationResponse } from "./base.js";
import axios from "axios";

export class GitHubIntegration extends BaseIntegration {
  constructor(config: { enabled: boolean; apiKey?: string; webhookUrl?: string }) {
    super("github", config);
  }

  async processEvent(event: IntegrationEvent): Promise<IntegrationResponse> {
    if (!this.config.enabled || !this.config.apiKey) {
      return { success: false, error: "GitHub integration not configured" };
    }

    if (event.type === "export") {
      const { repoUrl, branch, files, createRepo, repoName, isPrivate } = event.payload as {
        repoUrl?: string; // e.g. "owner/repo"
        branch?: string;
        files?: Array<{ path: string; content: string }>;
        createRepo?: boolean;
        repoName?: string;
        isPrivate?: boolean;
      };

      if (!this.config.apiKey) {
        return { success: false, error: "GitHub integration not configured (Missing API Key)" };
      }

      const githubService = new GithubService(this.config.apiKey);

      try {
        let targetRepo = repoUrl;

        // Create repo if requested
        if (createRepo && repoName) {
          const newRepo = await githubService.createRepo(repoName, isPrivate ?? true);
          targetRepo = newRepo.full_name;
        }

        if (!targetRepo || !files) {
          return { success: false, error: "Missing target repository or files to push" };
        }

        const [owner, repo] = targetRepo.split("/");
        if (!owner || !repo) {
          return { success: false, error: "Invalid repository format. Expected 'owner/repo'" };
        }

        const commitSha = await githubService.pushFiles(
          owner,
          repo,
          files,
          `Shift AI Migration: ${new Date().toISOString()}`,
          branch ?? "main"
        );

        return { success: true, data: { commitSha, repoUrl: targetRepo } };
      } catch (err: any) {
        return {
          success: false,
          error: err.message || "GitHub integration error",
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

