import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/supabase-auth.js";
import { supabase } from "../lib/supabase.js";
import { aiEngine, type AIModel } from "../services/ai-engine.js";

const analyzeSchema = z.object({
    projectId: z.string().optional(),
    source: z.string(),
    toolType: z.string().optional(), // 'lovable', 'bubble', etc.
    payload: z.object({
        repo: z.string().optional(),
        url: z.string().optional(),
        prompt: z.string().optional(),
        files: z.array(z.object({
            path: z.string(),
            content: z.string()
        })).optional()
    }).optional(),
    depth: z.enum(['quick', 'deep']).optional(),
    model: z.enum(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet', 'gemini-1.5-pro', 'gemini-1.5-flash']).optional(),
    projectName: z.string().optional()
});


const fixSchema = z.object({
    issueDescription: z.string(),
    fileContent: z.string(),
    fileName: z.string().optional()
});

type AnalyzeSchema = z.infer<typeof analyzeSchema>;
type FixSchema = z.infer<typeof fixSchema>;

export async function registerAnalysisRoutes(app: FastifyInstance) {
    app.log.info("Analysis routes initialized");

    // POST /api/analyze - Analyze a project source
    app.withTypeProvider().post(
        "/analyze",
        {
            preHandler: [requireAuth],
            schema: {
                body: analyzeSchema
            },
        },
        async (request, reply) => {
            const authRequest = request as AuthenticatedRequest;
            const userId = authRequest.userId!;
            const { projectId, source, toolType, payload, depth, model } = request.body as AnalyzeSchema;

            try {
                // 1. Check/Create User in DB (Sync from Supabase Auth)
                let { data: user, error: userError } = await supabase
                    .from('users')
                    .select('*')
                    .eq('id', userId)
                    .single();

                if (userError || !user) {
                    // Create user record if it doesn't exist
                    const { data: newUser, error: createError } = await supabase
                        .from('users')
                        .insert({
                            id: userId,
                            email: authRequest.user?.email || 'unknown@example.com',
                            full_name: authRequest.user?.user_metadata?.full_name || 'Shift AI User'
                        })
                        .select()
                        .single();

                    if (createError) throw createError;
                    user = newUser;
                }

                if (!user || user.credits <= 0) {
                    return reply.status(403).send({
                        error: "Insufficient credits",
                        message: "Please upgrade your plan or purchase more credits"
                    });
                }

                // 2. Perform AI Analysis / Blueprint Generation (Parallelized for Speed)
                const projectName = payload?.repo?.split('/')[1] || "New Project";
                const files = payload?.files || [];

                let blueprint: any;
                let analysisResult: any;

                if (files.length > 0) {
                    // We have raw files! Run both synthesis and audit in parallel
                    console.log(`[Analysis] Parallelizing scan for ${files.length} files...`);
                    const [bp, ar] = await Promise.all([
                        aiEngine.generateBlueprint(source, payload, projectName, projectId, toolType),
                        aiEngine.analyzeProject(files.map((f: any) => ({
                            name: f.path,
                            content: f.content
                        })), {
                            depth: depth || 'quick',
                            model: (model as AIModel | undefined) || 'gemini-1.5-flash' // Faster default for parallel audits
                        })
                    ]);
                    blueprint = bp;
                    analysisResult = ar;
                } else {
                    // Sequential fallback (used for Figma/Prompt where BP is the only source)
                    blueprint = await aiEngine.generateBlueprint(source, payload, projectName, projectId, toolType);
                    analysisResult = await aiEngine.analyzeProject([
                        { name: 'blueprint.json', content: JSON.stringify(blueprint) }
                    ], {
                        depth: depth || 'quick',
                        model: model as AIModel | undefined
                    });
                }

                // 4. Deduct Credits
                const creditsToDeduct = analysisResult.creditsUsed || 1;
                await supabase
                    .from('users')
                    .update({ credits: user.credits - creditsToDeduct })
                    .eq('id', userId);

                // 5. Store Analysis Result
                const { data: analysisRecord } = await supabase
                    .from('analyses')
                    .insert({
                        user_id: userId,
                        project_id: projectId || null,
                        result_json: {
                            projectId: projectId || 'pending',
                            blueprint,
                            analysis: analysisResult
                        },
                        credits_used: creditsToDeduct
                    })
                    .select()
                    .single();

                return {
                    analysisId: analysisRecord?.id,
                    projectId: projectId || 'pending',
                    blueprint,
                    analysis: analysisResult,
                    creditsRemaining: user.credits - creditsToDeduct
                };

            } catch (error: any) {
                request.log.error(error);
                return reply.status(500).send({
                    error: "Analysis failed",
                    details: error.message
                });
            }
        }
    );

    // POST /api/analyze/stream - Stream analysis for Neural Bridge
    app.withTypeProvider().post(
        "/analyze/stream",
        {
            preHandler: [requireAuth],
            schema: {
                body: analyzeSchema
            }
        },
        async (request, reply) => {
            const authRequest = request as AuthenticatedRequest;
            const userId = authRequest.userId!;
            const { projectId, source, toolType, payload, projectName: customProjectName } = request.body as AnalyzeSchema;

            const projectName = customProjectName || payload?.repo?.split('/')[1] || "New Project";
            
            // Set headers for SSE-like streaming
            reply.raw.setHeader('Content-Type', 'application/x-ndjson');
            reply.raw.setHeader('Cache-Control', 'no-cache');
            reply.raw.setHeader('Connection', 'keep-alive');

            try {
                const stream = aiEngine.generateBlueprintStream(source, payload || {}, projectName, projectId, toolType);

                for await (const chunk of stream) {
                    reply.raw.write(JSON.stringify(chunk) + "\n");
                }
                
                reply.raw.end();
            } catch (error: any) {
                console.error(`[Analysis Stream] Failed: ${error.message}`);
                reply.raw.write(JSON.stringify({ status: 'error', message: error.message }) + "\n");
                reply.raw.end();
            }
        }
    );

    // POST /api/analyze/fix - Generate a fix for an issue
    app.withTypeProvider().post(
        "/analyze/fix",
        {
            preHandler: [requireAuth],
            schema: {
                body: fixSchema
            },
        },
        async (request, reply) => {
            const authRequest = request as AuthenticatedRequest;
            const userId = authRequest.userId!;
            const { issueDescription, fileContent, fileName } = request.body as FixSchema;

            try {
                // Check user credits
                const { data: user } = await supabase
                    .from('users')
                    .select('credits')
                    .eq('id', userId)
                    .single();

                if (!user || user.credits <= 0) {
                    return reply.status(403).send({
                        error: "Insufficient credits"
                    });
                }

                // Generate fix using AI Engine
                const result = await aiEngine.fixIssue(issueDescription, fileContent, {
                    fileName
                });

                // Check credits
                if (user.credits < result.creditsUsed) {
                    return reply.status(403).send({
                        error: "Insufficient credits",
                        message: `Fix requires ${result.creditsUsed} credits`
                    });
                }

                // Deduct credits
                await supabase
                    .from('users')
                    .update({ credits: user.credits - result.creditsUsed })
                    .eq('id', userId);

                return {
                    ...result,
                    fileName,
                    creditsRemaining: user.credits - result.creditsUsed
                };

            } catch (error: any) {
                request.log.error(error);
                return reply.status(500).send({
                    error: "Fix generation failed",
                    details: error.message
                });
            }
        }
    );

    // GET /api/analyses - List analyses
    app.withTypeProvider().get(
        "/analyses",
        {
            preHandler: [requireAuth],
            schema: {
                querystring: z.object({
                    projectId: z.string().optional()
                })
            }
        },
        async (request, reply) => {
            const authRequest = request as AuthenticatedRequest;
            const userId = authRequest.userId!;
            const { projectId } = request.query as { projectId?: string };

            try {
                let query = supabase
                    .from('analyses')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });

                if (projectId) {
                    // If projectId is stored in metadata or a specific column
                    // The POST /analyze uses projectId in the body but doesn't seem to store it in a dedicated column in the snippet above?
                    // Wait, let's look at the INSERT in POST /analyze.
                    /*
                    const { data: analysisRecord } = await supabase
                        .from('analyses')
                        .insert({
                            user_id: userId,
                            result_json: {
                                blueprint,
                                analysis: analysisResult
                            },
                            credits_used: creditsToDeduct
                        })
                    */
                    // It doesn't store projectId. I should probably add it to the table or store it in result_json.
                    // For now, I'll assume we want to filter by user and maybe search result_json for projectId?
                    // Or I should UPDATE the POST /analyze to store projectId.
                    query = query.eq('project_id', projectId);
                }

                const { data: analyses, error } = await query;
                if (error) throw error;

                return analyses;
            } catch (error: any) {
                request.log.error(error);
                return reply.status(500).send({
                    error: "Failed to fetch analyses",
                    details: error.message
                });
            }
        }
    );
}
