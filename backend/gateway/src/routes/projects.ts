import type { FastifyInstance, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import fs from "node:fs";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createProject, getProject, listProjects } from "../services/projectService.js";
import { requireAuth } from '../middleware/supabase-auth.js';
import * as commandService from "../services/commandService.js";
import { supabase } from "../lib/supabase.js";
import { db } from "../db/client.js";
import JSZip from 'jszip';

const createBody = z.any();
// const createBody = z.object({
//   name: z.string().min(1).max(120),
//   framework: z.string().optional(),
//   source_platform: z.string().optional(),
//   source_url: z.string().optional(),
//   origin_meta: z.record(z.any()).optional(),
// });

const projectResponse = z.object({
  id: z.string(),
  name: z.string(),
  framework: z.string().nullable(),
  platform: z.string().nullable(),
  status: z.string().nullable(),
  created_at: z.any(),
  source_url: z.string().nullable(),
});

function mapProject(p: any) {
  return {
    ...p,
    platform: p.source_platform || 'shift',
    status: p.status || 'ready'
  };
}

export async function registerProjectRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ... (GET /, GET /:id, POST /) ...


  typedApp.post(
    "/:id/upload-webflow",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ success: z.boolean(), message: z.string() }),
          400: z.object({ error: z.string() }),
          404: z.object({ error: z.string() }),
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.userId!;
      
      const project = await getProject(id);
      if (!project || project.user_id !== userId) {
        return reply.notFound("Project not found");
      }

      const data = await request.file();
      if (!data) {
        return reply.badRequest("No file uploaded");
      }

      if (!data.filename.endsWith('.zip')) {
        return reply.badRequest("Only .zip files are supported for Webflow imports");
      }

      try {
        const buffer = await data.toBuffer();
        console.log(`[WebflowUpload] Received ${data.filename} (${buffer.length} bytes) for project ${id}`);

        const { WebflowParserService } = await import('../services/webflowParserService.js');
        await WebflowParserService.processZipUpload(id, buffer, data.filename);

        return { success: true, message: "Webflow project uploaded and parsing started" };
      } catch (error: any) {
        request.log.error(error);
        return (reply as any).code(500).send({ error: "Failed to process Webflow file" });
      }
    }
  );

  typedApp.post(
    "/:id/import",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          sourceUrl: z.string().url(),
          options: z.record(z.any()).optional()
        }),
        response: {
          200: z.object({ success: z.boolean(), message: z.string() }),
          404: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.userId!;
      const { sourceUrl, options = {} } = request.body as any;

      const project = await getProject(id);
      if (!project || project.user_id !== userId) {
        return reply.notFound("Project not found");
      }

      try {
        const { bridgeService } = await import('../services/bridgeService.js');
        const { projectFileService } = await import('../services/projectFileService.js');

        // 1. Get code from the bridge (extractor + AI)
        const result = await bridgeService.bridgeFromSource({
          sourceUrl,
          options,
          userId
        });

        // 2. Determine a good filename
        const componentName = result.blueprint.root.name.replace(/\s+/g, '') || "ImportedComponent";
        const filename = `${componentName}.tsx`;

        // 3. Save results
        await projectFileService.saveGeneratedFile(id, filename, result.code, 'component');

        return { 
          success: true, 
          message: `Successfully imported from ${result.blueprint.source.type}` 
        };
      } catch (error: any) {
        request.log.error(error);
        return reply.status(500).send({ error: error.message || "Import failed" });
      }
    }
  );

  typedApp.post(
    "/:id/push-to-github",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: z.object({
          repoUrl: z.string().optional(), // "owner/repo"
          createRepo: z.boolean().optional(),
          repoName: z.string().optional(),
          isPrivate: z.boolean().optional(),
          branch: z.string().optional(),
        }),
        response: {
          200: z.object({ success: z.boolean(), repoUrl: z.string(), commitSha: z.string() }),
          404: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
          500: z.object({ error: z.string() }),
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const userId = request.userId!;
      const { repoUrl, createRepo, repoName, isPrivate, branch } = request.body as any;

      const project = await getProject(id);
      if (!project || project.user_id !== userId) {
        return reply.notFound("Project not found");
      }

      // 1. Get the GitHub integration
      const { integrationService } = await import('../services/integrationService.js');
      const integration = await integrationService.getUserIntegrationByProvider(userId, 'github');
      
      if (!integration) {
        return reply.badRequest("GitHub account not connected. Please connect your GitHub account in settings.");
      }

      // 2. Fetch real generated files from project_files table
      let projectFiles: any[] = await db<{ file_path: string; content: string }[]>`
        SELECT file_path, content
        FROM project_files
        WHERE project_id = ${project.id}
        ORDER BY file_path ASC
      `;

      let filesArr = projectFiles.map(f => ({ path: f.file_path, content: f.content }));

      // Fallback: If no project_files, check for a UPG blueprint in the analyses table
      if (filesArr.length === 0) {
        console.log(`[PushToGitHub] No project_files found for ${project.id}. Checking for UPG blueprint...`);
        const { data: latestAnalysis } = await supabase
          .from('analyses')
          .select('result_json')
          .eq('project_id', project.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const blueprint = latestAnalysis?.result_json?.blueprint || latestAnalysis?.result_json?.upg;

        if (blueprint && blueprint.file_tree && blueprint.nodes) {
          console.log(`[PushToGitHub] Found UPG blueprint. Extracting files...`);
          const extractedFiles: Array<{ path: string; content: string }> = [];
          
          const walkTree = (tree: any) => {
            for (const [name, value] of Object.entries(tree)) {
              if (typeof value === 'string') {
                const node = blueprint.nodes[value];
                if (node && (node.type === 'file' || node.type === 'component')) {
                  extractedFiles.push({ path: node.path || name, content: node.content || '' });
                }
              } else if (typeof value === 'object') {
                walkTree(value);
              }
            }
          };

          walkTree(blueprint.file_tree);
          filesArr = extractedFiles;

          // Add package.json if metadata exists
          if (blueprint.project && !filesArr.some(f => f.path === 'package.json')) {
            filesArr.push({
              path: 'package.json',
              content: JSON.stringify({
                name: blueprint.project.name.toLowerCase().replace(/[^a-z0-9]/g, '-'),
                version: blueprint.project.version || "0.1.0",
                dependencies: blueprint.project.dependencies || {}
              }, null, 2)
            });
          }
        }
      }

      if (filesArr.length === 0) {
        return reply.badRequest("No generated code found for this project. Upload a source or trigger generation first.");
      }

      // 3. Resolve target repo
      let targetRepoUrl = repoUrl;

      if (!targetRepoUrl && !createRepo) {
        // Fallback to linked repo
        const projectIntegrations = await integrationService.getProjectIntegrations(project.id);
        const repoLink = projectIntegrations.find(i => i.integration.provider === 'github' && i.resource_type === 'repository');
        if (repoLink) {
          targetRepoUrl = repoLink.resource_id;
        }
      }

      if (!targetRepoUrl && !createRepo) {
        return reply.badRequest("No repository specified and no default linked repository found.");
      }

      // 4. Invoke GitHub Integration
      try {
        const { getIntegration } = await import('../integrations/registry.js');
        const githubAdapter = getIntegration('github');
        
        if (!githubAdapter) {
          throw new Error("GitHub integration adapter not registered");
        }

        const result = await githubAdapter.processEvent({
          type: 'export',
          projectId: project.id,
          userConfig: {
            apiKey: integration.access_token
          },
          payload: {
            repoUrl: targetRepoUrl,
            branch: branch || 'main',
            files: filesArr,
            createRepo,
            repoName,
            isPrivate
          }
        });

        if (!result.success) {
          return reply.status(500).send({ error: result.error || "Failed to push to GitHub" });
        }

        const data = result.data as any;

        // 5. If a link was created or updated, ensure the project integration is recorded
        if (createRepo && data.repoUrl) {
          await integrationService.linkProjectToIntegration({
            project_id: project.id,
            integration_id: integration.id,
            resource_type: 'repository',
            resource_id: data.repoUrl,
            resource_name: repoName || data.repoUrl.split('/')[1],
            sync_config: { branch: branch || 'main' }
          });
        }

        return { 
          success: true, 
          repoUrl: data.repoUrl || targetRepoUrl, 
          commitSha: data.commitSha 
        };

      } catch (err: any) {
        request.log.error(err);
        return reply.status(500).send({ error: err.message || "Internal server error during GitHub push" });
      }
    }
  );

  typedApp.post(
    "/:id/push-to-ide",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.object({ success: z.boolean(), command_id: z.string() }),
          404: z.object({ error: z.string() }),
          400: z.object({ error: z.string() }),
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      // LOG BOMB
      const logFile = `C:\\Users\\LENOVO\\Documents\\Loom\\backend\\gateway\\debug_launch.txt`;
      try {
        fs.appendFileSync(logFile, `[${new Date().toISOString()}] PushToIDE called for ${id}\n`);
      } catch (e) { }

      const userId = request.userId!;

      const project = await getProject(id);

      console.log(`[PushToIDE] User: ${userId} | Project: ${id} | Owner: ${project?.user_id}`);

      if (!project || project.user_id !== userId) {
        console.warn(`[PushToIDE] Ownership mismatch or project not found: User ${userId}, Project Owner ${project?.user_id}`);
        return reply.notFound("Project not found");
      }

      // Check for an explicit GitHub binding
      const { integrationService } = await import('../services/integrationService.js');
      const integrations = await integrationService.getProjectIntegrations(project.id);
      const repoLink = integrations.find(i => i.integration.provider === 'github' && i.resource_type === 'repository');

      const sourceUrl = repoLink
        ? `https://github.com/${repoLink.resource_id}.git`
        : project.source_url;

      // Allow pushing even without sourceUrl - extension can handle UPG projects

      // Get the most recently seen device
      const devices = await commandService.getUserDevices(userId);
      console.log(`[PushToIDE] Found ${devices.length} devices for user ${userId}`);

      const activeDevice = devices.find(d => d.status === 'online') || devices[0];

      if (!activeDevice) {
        console.warn(`[PushToIDE] FAILED: No devices found for user ${userId}`);
        return reply.badRequest("No connected IDE found. Please ensure your VS Code extension is running and connected.");
      }

      console.log(`[PushToIDE] Using device ${activeDevice.id} (${activeDevice.status})`);

      // Fetch latest analysis to include UPG/Blueprint in payload
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('result_json')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      console.log(`[PushToIDE] Creating command for user ${userId} on device ${activeDevice.id}`);

      try {
        const command = await commandService.createCommand(
          userId,
          activeDevice.id,
          "IMPORT_PROJECT",
          {
            projectId: project.id,
            projectName: project.name,
            sourceUrl: sourceUrl,
            isGitRepo: !!repoLink,
            branch: repoLink?.sync_config?.branch || 'main',
            upg: latestAnalysis?.result_json?.blueprint || latestAnalysis?.result_json?.upg
          },
          project.id
        );
        console.log(`[PushToIDE] Command created successfully: ${command?.id}`);
        return { success: true, command_id: command.id };
      } catch (err) {
        console.error('[PushToIDE] FAILED to create command:', err);
        throw err;
      }
    }
  );

  typedApp.get(
    "/",
    {
      schema: {
        response: { 200: z.array(projectResponse) },
      },
      preHandler: [requireAuth],
    },
    async (request) => {
      try {
        console.log(`[Projects] Listing projects for User: ${request.userId}`);
        const projects = await listProjects(request.userId);
        console.log(`[Projects] Found ${projects.length} projects`);
        return projects.map(mapProject);
      } catch (error) {
        if (process.env.LOCAL_MODE === 'true') {
          console.warn('[Projects] List failed (Local Mode Fallback):', error);
          return [];
        }
        throw error;
      }
    }
  );

  typedApp.get(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 200: projectResponse },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const project = await getProject(id);
      if (!project || project.user_id !== request.userId) {
        return reply.notFound("Project not found");
      }
      return mapProject(project);
    }
  );

  // GET /:id/files — list all generated files for a project
  typedApp.get(
    "/:id/files",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: {
          200: z.array(z.object({
            id: z.string(),
            file_path: z.string(),
            type: z.string(),
            updated_at: z.any(),
          })),
          404: z.object({ error: z.string() }),
        },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const project = await getProject(id);
      if (!project || project.user_id !== request.userId) {
        return reply.notFound("Project not found");
      }

      const files = await db<{ id: string; file_path: string; type: string; updated_at: string }[]>`
        SELECT id, file_path, type, updated_at
        FROM project_files
        WHERE project_id = ${id}
        ORDER BY updated_at DESC
      `;

      return files;
    }
  );

  // GET /:id/export — ZIP download of all generated files
  typedApp.get(
    "/:id/export",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const project = await getProject(id);
      if (!project || project.user_id !== request.userId) {
        return reply.notFound("Project not found");
      }

      // 1. Read real generated files from project_files table
      let rows: any[] = await db<{ file_path: string; content: string }[]>`
        SELECT file_path, content
        FROM project_files
        WHERE project_id = ${id}
        ORDER BY file_path ASC
      `;

      // Fallback: If no project_files, check for a UPG blueprint
      if (rows.length === 0) {
        console.log(`[Export] No project_files found for ${id}. Checking for UPG blueprint...`);
        const { data: latestAnalysis } = await supabase
          .from('analyses')
          .select('result_json')
          .eq('project_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const blueprint = latestAnalysis?.result_json?.blueprint || latestAnalysis?.result_json?.upg;

        if (blueprint && blueprint.file_tree && blueprint.nodes) {
          console.log(`[Export] Found UPG blueprint. Generating files for ZIP...`);
          const extractedRows: Array<{ file_path: string; content: string }> = [];
          
          const walkTree = (tree: any) => {
            for (const [name, value] of Object.entries(tree)) {
              if (typeof value === 'string') {
                const node = blueprint.nodes[value];
                if (node && (node.type === 'file' || node.type === 'component')) {
                  extractedRows.push({ file_path: node.path || name, content: node.content || '' });
                }
              } else if (typeof value === 'object') {
                walkTree(value);
              }
            }
          };

          walkTree(blueprint.file_tree);
          rows = extractedRows;
        }
      }

      if (rows.length === 0) {
        return reply.status(404).send({ error: "No generated files found. Upload a source or trigger generation first." } as any);
      }

      // 2. Bundle into a ZIP

      const zip = new JSZip();
      const projectFolder = zip.folder(project.name.replace(/[^a-z0-9_-]/gi, '_') || 'project')!;

      for (const row of rows) {
        projectFolder.file(row.file_path, row.content);
      }

      // 3. Add a minimal package.json and README so the ZIP is immediately openable
      projectFolder.file('package.json', JSON.stringify({
        name: project.name.toLowerCase().replace(/\s+/g, '-'),
        version: '0.1.0',
        scripts: { dev: 'next dev', build: 'next build', start: 'next start' },
        dependencies: {
          next: '^14.0.0',
          react: '^18.0.0',
          'react-dom': '^18.0.0',
          typescript: '^5.0.0',
        },
        devDependencies: {
          '@types/react': '^18.0.0',
          '@types/node': '^20.0.0',
          tailwindcss: '^3.3.0',
          autoprefixer: '^10.0.0',
          postcss: '^8.0.0',
        },
      }, null, 2));

      projectFolder.file('README.md',
        `# ${project.name}\n\nGenerated by Loom AI from ${project.source_platform || 'Webflow'}.\n\n## Getting Started\n\n\`\`\`bash\nnpm install\nnpm run dev\n\`\`\`\n`);

      // 4. Stream the ZIP as a binary download
      const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

      const safeName = project.name.replace(/[^a-z0-9_-]/gi, '_') || 'project';
      reply
        .header('Content-Type', 'application/zip')
        .header('Content-Disposition', `attachment; filename="${safeName}.zip"`)
        .header('Content-Length', zipBuffer.length)
        .send(zipBuffer);
    }
  );

  typedApp.post(
    "/",
    {
      schema: {
        body: createBody,
        response: { 201: projectResponse },
      },
      preHandler: [requireAuth],
      preValidation: async (request: FastifyRequest) => {
        console.log('🔵 [CREATE PROJECT] Request received:', JSON.stringify(request.body, null, 2));
      },
    },
    async (request, reply) => {
      try {
        const { name, framework, source_platform, source_url, origin_meta } = request.body as any;

        const id = await createProject(
          request.userId!,
          name,
          framework,
          source_platform,
          source_url,
          origin_meta
        );
        console.log('✅ [CREATE PROJECT] Created ID:', id);

        const project = await getProject(id);
        if (!project) { throw new Error("Could not fetch created project") }
        return reply.code(201).send(mapProject(project));
      } catch (error: any) {
        console.error('❌ [PROJECTS] Error creating project:', error);
        console.error('Error detail:', error.detail);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        return (reply as any).code(500).send({
          error: "Internal Server Error"
        });
      }
    }
  );

  /*
  typedApp.patch(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        body: createBody.partial(),
        response: { 200: projectResponse },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const { name, framework } = request.body;

      const project = await getProject(id);
      if (!project || project.user_id !== request.userId) {
        return reply.notFound("Project not found");
      }

      const { updateProject } = await import("../services/projectService.js");
      await updateProject(id, { name, framework });
      const updated = await getProject(id);
      return mapProject(updated);
    }
  );
  */

  typedApp.delete(
    "/:id",
    {
      schema: {
        params: z.object({ id: z.string().uuid() }),
        response: { 204: z.null() },
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const project = await getProject(id);
      if (!project || project.user_id !== request.userId) {
        return reply.notFound("Project not found");
      }

      const { deleteProject } = await import("../services/projectService.js");
      await deleteProject(id);
      return reply.code(204).send();
    }
  );
}
