import type { FastifyInstance, FastifyRequest } from "fastify";
import type { MultipartFile } from "@fastify/multipart";
import fs from "node:fs";
import { z } from "zod";
import type { ZodTypeProvider } from "fastify-type-provider-zod";
import { createProject, getProject, listProjects } from "../services/projectService.js";
import { requireAuth } from '../middleware/supabase-auth.js';
import * as commandService from "../services/commandService.js";
import { supabase } from "../lib/supabase.js";

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

      // 2. Fetch latest files from analysis (UPG)
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('result_json')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const upg = latestAnalysis?.result_json?.blueprint || latestAnalysis?.result_json?.upg;
      if (!upg || Object.keys(upg).length === 0) {
        return reply.badRequest("No generated code found for this project. Please generate code first.");
      }

      // Convert UPG map to files array for the integration
      const filesArr = Object.entries(upg).map(([path, file]: [string, any]) => ({
        path,
        content: typeof file === 'string' ? file : file.content
      }));

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

        // Initialize with user's token (important override if global isn't set)
        await githubAdapter.initialize({ 
          enabled: true, 
          apiKey: integration.access_token 
        });

        const result = await githubAdapter.processEvent({
          type: 'export',
          projectId: project.id,
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

  typedApp.get(
    "/:id/export",
    {
      schema: {
        params: z.object({ id: z.string().uuid() })
      },
      preHandler: [requireAuth],
    },
    async (request, reply) => {
      const { id } = request.params;
      const project = await getProject(id);
      if (!project || project.user_id !== request.userId) {
        return reply.notFound("Project not found");
      }

      // Fetch latest analysis
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('result_json')
        .eq('project_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
      const upg = latestAnalysis?.result_json?.blueprint || latestAnalysis?.result_json?.upg;
      
      if (!upg || !upg.nodes) {
         return reply.badRequest("No generated components available for export.");
      }
      
      const files: { path: string, content: string }[] = [];
      const explanation = latestAnalysis?.result_json?.summary || "Successfully downloaded UPG blueprint.";
      
      // Parse the UPG mock nodes into physical files
      // Basic flat-map: every 'component' node becomes a .tsx file.
      for (const [key, node] of Object.entries(upg.nodes as Record<string, any>)) {
         if (node.type === 'component') {
            const fileName = node.name ? `${node.name}.tsx` : `Component_${key}.tsx`;
            
            // Build the stringified code for this component
            let importsText = '';
            if (node.imports && Array.isArray(node.imports)) {
                importsText = node.imports.map((i: any) => {
                   const named = i.named && i.named.length > 0 ? `{ ${i.named.join(', ')} }` : '';
                   const def = i.default || '';
                   const combo = [def, named].filter(Boolean).join(', ');
                   return `import ${combo} from '${i.module}';`;
                }).join('\n') + '\n\n';
            }
            
            const stateText = node.state ? 
                 Object.entries(node.state).map(([sKey, sVal]: [string, any]) => 
                    `  const [${sKey}, set${sKey.charAt(0).toUpperCase() + sKey.slice(1)}] = useState(${JSON.stringify(sVal.defaultValue)});`
                 ).join('\n') + '\n\n' : '';

            // This is a naive code generator tailored to the Counter App payload structure
            const renderChildren = (childIds: string[], level: number): string => {
                const indent = '  '.repeat(level);
                return childIds.map(cId => {
                    const child = upg.nodes[cId];
                    if (!child) return '';
                    if (child.type === 'text') return `${indent}${child.content}\n`;
                    if (child.type === 'element') {
                        const propsString = Object.entries(child.props || {}).map(([p, v]) => `${p}={${v}}`).join(' ');
                        const className = child.className ? ` className="${child.className}"` : '';
                        const allAttribs = [className, propsString].filter(Boolean).join(' ');
                        
                        if (!child.children || child.children.length === 0) {
                            return `${indent}<${child.tag}${allAttribs} />\n`;
                        } else {
                            const innerItems = renderChildren(child.children, level + 1);
                            return `${indent}<${child.tag}${allAttribs}>\n${innerItems}${indent}</${child.tag}>\n`;
                        }
                    }
                    return '';
                }).join('');
            };

            const bodyContent = node.children && Array.isArray(node.children) 
                ? renderChildren(node.children, 2) 
                : '    <div />\n';

            const componentText = `${importsText}export default function ${node.name}() {\n${stateText}  return (\n${bodyContent}  );\n}\n`;
            files.push({ path: fileName, content: componentText });
         }
      }
      
      // If we somehow found zero components (like the fallback Analyzer limit), just output a single JSON representing it
      if (files.length === 0) {
          files.push({ path: 'blueprint.json', content: JSON.stringify(upg, null, 2) });
      }

      return reply.send({ files, explanation });
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
