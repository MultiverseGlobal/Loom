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
     * Push multiple files to a repository in a single commit
     */
    async pushFiles(owner: string, repo: string, files: Array<{ path: string; content: string }>, message: string, branch = 'main'): Promise<string> {
        try {
            // 1. Get the latest commit SHA of the branch
            let baseTreeSha: string | undefined;
            let parentCommitSha: string | undefined;

            try {
                const refResponse = await this.octokit.request('GET /repos/{owner}/{repo}/git/ref/heads/{ref}', {
                    owner,
                    repo,
                    ref: branch,
                    headers: { 'X-GitHub-Api-Version': '2022-11-28' }
                });
                parentCommitSha = refResponse.data.object.sha;

                const commitResponse = await this.octokit.request('GET /repos/{owner}/{repo}/git/commits/{commit_sha}', {
                    owner,
                    repo,
                    commit_sha: parentCommitSha!,
                    headers: { 'X-GitHub-Api-Version': '2022-11-28' }
                });
                baseTreeSha = commitResponse.data.tree.sha;
            } catch (err: any) {
                // If branch doesn't exist, we might be on an empty repo
                console.warn(`[GithubService] Branch ${branch} not found or repo empty, starting fresh.`);
            }

            // 2. Create the tree
            const treeData = files.map(f => ({
                path: f.path,
                mode: '100644' as const,
                type: 'blob' as const,
                content: f.content
            }));

            const treeResponse = await this.octokit.request('POST /repos/{owner}/{repo}/git/trees', {
                owner,
                repo,
                base_tree: baseTreeSha,
                tree: treeData,
                headers: { 'X-GitHub-Api-Version': '2022-11-28' }
            });

            // 3. Create the commit
            const commitResponse = await this.octokit.request('POST /repos/{owner}/{repo}/git/commits', {
                owner,
                repo,
                message,
                tree: treeResponse.data.sha,
                parents: parentCommitSha ? [parentCommitSha] : [],
                headers: { 'X-GitHub-Api-Version': '2022-11-28' }
            });

            const newCommitSha = commitResponse.data.sha;

            // 4. Update the reference
            if (parentCommitSha) {
                await this.octokit.request('PATCH /repos/{owner}/{repo}/git/refs/heads/{ref}', {
                    owner,
                    repo,
                    ref: branch,
                    sha: newCommitSha,
                    headers: { 'X-GitHub-Api-Version': '2022-11-28' }
                });
            } else {
                // Create the ref if it didn't exist
                await this.octokit.request('POST /repos/{owner}/{repo}/git/refs', {
                    owner,
                    repo,
                    ref: `refs/heads/${branch}`,
                    sha: newCommitSha,
                    headers: { 'X-GitHub-Api-Version': '2022-11-28' }
                });
            }

            return newCommitSha;
        } catch (error) {
            console.error(`[GithubService] Failed to push files to ${owner}/${repo}:`, error);
            throw error;
        }
    }

    /**
     * Create a new repository
     */
    async createRepo(name: string, isPrivate = true): Promise<GithubRepo> {
        try {
            const response = await this.octokit.request('POST /user/repos', {
                name,
                private: isPrivate,
                auto_init: true, // Initialize with a README to create the default branch
                headers: { 'X-GitHub-Api-Version': '2022-11-28' }
            });

            return {
                id: response.data.id,
                name: response.data.name,
                full_name: response.data.full_name,
                private: response.data.private,
                html_url: response.data.html_url,
                description: response.data.description,
                updated_at: response.data.updated_at,
                language: response.data.language
            };
        } catch (error) {
            console.error(`[GithubService] Failed to create repo ${name}:`, error);
            throw error;
        }
    }
}
