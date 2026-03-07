import type { FastifyInstance } from "fastify";
import { z } from "zod";
import { requireAuth, type AuthenticatedRequest } from "../middleware/supabase-auth";
import { supabase } from "../lib/supabase";
import { aiEngine, type AIModel } from "../services/ai-engine";

const analyzeSchema = z.object({
    projectId: z.string().optional(),
    source: z.string(),
    payload: z.object({
        repo: z.string().optional(),
        url: z.string().optional(),
        prompt: z.string().optional()
    }).optional(),
    depth: z.enum(['quick', 'deep']).optional(),
    model: z.enum(['gpt-4o', 'gpt-4o-mini', 'claude-3-5-sonnet']).optional()
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
            const { projectId, source, payload, depth, model } = request.body as AnalyzeSchema;

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
                            full_name: authRequest.user?.user_metadata?.full_name || 'Loom User'
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

                // 2. Perform AI Analysis / Blueprint Generation
                // For the analysis page preview, we generate a blueprint
                const projectName = payload?.repo?.split('/')[1] || "New Project";
                const blueprint = await aiEngine.generateBlueprint(source, payload, projectName);

                // 3. Perform AI analysis on the concept
                const analysisResult = await aiEngine.analyzeProject([
                    { name: 'blueprint.json', content: JSON.stringify(blueprint) }
                ], {
                    depth: depth || 'quick',
                    model: model as AIModel | undefined
                });

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
                    ...analysisResult,
                    blueprint,
                    analysisId: analysisRecord?.id,
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
