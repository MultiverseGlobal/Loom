import type { FastifyInstance, FastifyRequest } from "fastify";
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
    platform: p.source_platform || 'komposo',
    status: p.status || 'ready'
  };
}

export async function registerProjectRoutes(app: FastifyInstance) {
  const typedApp = app.withTypeProvider<ZodTypeProvider>();

  // ... (GET /, GET /:id, POST /) ...


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
        const { name, framework, source_platform, source_url, origin_meta } = request.body;

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
        return reply.code(201).send(mapProject(project));
      } catch (error: any) {
        console.error('❌ [PROJECTS] Error creating project:', error);
        console.error('Error detail:', error.detail);
        console.error('Error hint:', error.hint);
        console.error('Error code:', error.code);
        return reply.status(500).send({
          error: "Internal Server Error",
          message: error.message,
          detail: error.detail
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
