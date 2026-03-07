import { Octokit } from "octokit";

export interface GithubRepo {
    id: number;
    name: string;
    full_name: string;
    private: boolean;
    html_url: string;
    description: string | null;
    updated_at: string;
    language: string | null;
}

export interface GithubFileNode {
    path: string;
    mode: string;
    type: "blob" | "tree";
    sha: string;
    size?: number;
    url: string;
    content?: string; // If fetched
}

export class GithubService {
    private octokit: Octokit;

    constructor(accessToken: string) {
        this.octokit = new Octokit({
            auth: accessToken
        });
    }

    /**
     * List repositories for the authenticated user
     */
    async getUserRepos(page = 1, perPage = 30): Promise<GithubRepo[]> {
        try {
            const response = await this.octokit.request('GET /user/repos', {
                sort: 'updated',
                direction: 'desc',
                page,
                per_page: perPage,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            return response.data.map((repo: any) => ({
                id: repo.id,
                name: repo.name,
                full_name: repo.full_name,
                private: repo.private,
                html_url: repo.html_url,
                description: repo.description,
                updated_at: repo.updated_at,
                language: repo.language
            }));
        } catch (error) {
            console.error('[GithubService] Failed to fetch repos:', error);
            throw error;
        }
    }

    /**
     * Get the complete file tree for a repository (recursive)
     */
    async getRepoTree(owner: string, repo: string, branch?: string): Promise<GithubFileNode[]> {
        try {
            let targetBranch = branch;

            // If no branch provided, fetch the default branch from the repo info
            if (!targetBranch) {
                const repoResponse = await this.octokit.request('GET /repos/{owner}/{repo}', {
                    owner,
                    repo,
                    headers: {
                        'X-GitHub-Api-Version': '2022-11-28'
                    }
                });
                targetBranch = repoResponse.data.default_branch;
            }

            // Get the SHA of the branch head
            const refResponse = await this.octokit.request('GET /repos/{owner}/{repo}/git/ref/heads/{ref}', {
                owner,
                repo,
                ref: targetBranch,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });
            const treeSha = refResponse.data.object.sha;

            // Get the recursive tree
            const treeResponse = await this.octokit.request('GET /repos/{owner}/{repo}/git/trees/{tree_sha}', {
                owner,
                repo,
                tree_sha: treeSha,
                recursive: 'true',
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            return treeResponse.data.tree.map((node: any) => ({
                path: node.path,
                mode: node.mode,
                type: node.type, // 'blob' or 'tree'
                sha: node.sha,
                size: node.size,
                url: node.url
            }));

        } catch (error) {
            console.error(`[GithubService] Failed to fetch tree for ${owner}/${repo}:`, error);
            throw error;
        }
    }

    /**
     * Fetch content of a specific file
     */
    async getFileContent(owner: string, repo: string, path: string): Promise<string> {
        try {
            const response = await this.octokit.request('GET /repos/{owner}/{repo}/contents/{path}', {
                owner,
                repo,
                path,
                headers: {
                    'X-GitHub-Api-Version': '2022-11-28'
                }
            });

            // Content is base64 encoded
            if (Array.isArray(response.data) || !response.data.content) {
                throw new Error("Path is a directory, not a file");
            }

            const buffer = Buffer.from(response.data.content, 'base64');
            return buffer.toString('utf-8');

        } catch (error) {
            console.error(`[GithubService] Failed to fetch content for ${path}:`, error);
            throw error;
        }
    }
}
