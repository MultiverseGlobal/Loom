import OpenAI from 'openai';
import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import crypto from 'crypto';
import { GoogleGenerativeAI } from "@google/generative-ai";
import axios from 'axios';

//Initialize AI clients
const openai = new OpenAI({
    apiKey: config.openaiApiKey || 'dummy-key',
});

const anthropic = new Anthropic({
    apiKey: config.anthropicApiKey || 'dummy-key',
});

const genAI = new GoogleGenerativeAI(config.geminiApiKey || 'dummy-key');

// Interfaces
interface FileContext {
    name: string;
    content: string;
}

interface AnalysisResult {
    issues: Array<{
        type: 'error' | 'warning' | 'info';
        message: string;
        detail: string;
        file?: string;
        line?: number;
    }>;
    score: number;
    summary: string;
    creditsUsed: number;
}

export type AIModel = 'gpt-4o' | 'gpt-4o-mini' | 'claude-3-5-sonnet' | 'gemini-1.5-pro' | 'gemini-1.5-flash';

interface ModelConfig {
    name: AIModel;
    cost: number; // Credits cost
    maxTokens: number;
    bestFor: string[];
}

// Model configurations
const MODEL_CONFIGS: Record<AIModel, ModelConfig> = {
    'gpt-4o': {
        name: 'gpt-4o',
        cost: 3,
        maxTokens: 4096,
        bestFor: ['deep-analysis', 'complex-fixes', 'security-audit']
    },
    'gpt-4o-mini': {
        name: 'gpt-4o-mini',
        cost: 1,
        maxTokens: 2048,
        bestFor: ['quick-scan', 'simple-fixes', 'syntax-check']
    },
    'claude-3-5-sonnet': {
        name: 'claude-3-5-sonnet',
        cost: 2,
        maxTokens: 4096,
        bestFor: ['code-review', 'refactoring', 'architecture']
    },
    'gemini-1.5-pro': {
        name: 'gemini-1.5-pro',
        cost: 2,
        maxTokens: 32000,
        bestFor: ['large-context', 'full-project-analysis', 'creative-generation']
    },
    'gemini-1.5-flash': {
        name: 'gemini-1.5-flash',
        cost: 1,
        maxTokens: 16000,
        bestFor: ['quick-scan', 'summarization']
    }
};

export const aiEngine = {
    /**
     * Intelligently select the best model based on task complexity
     */
    selectModel(taskType: 'quick-scan' | 'deep-analysis' | 'fix' | 'refactor', fileCount: number): AIModel {
        // Quick scan or small projects -> use gemini-flash (cheapest/fastest)
        if (taskType === 'quick-scan') {
            return 'gemini-1.5-flash';
        }

        // Very large projects -> use gemini-pro (huge context window)
        if (fileCount > 20) {
            return 'gemini-1.5-pro';
        }

        // Deep analysis or many files -> use full GPT-4o
        if (taskType === 'deep-analysis' || fileCount > 10) {
            return 'gpt-4o';
        }

        // Medium complexity -> use Claude
        return 'claude-3-5-sonnet';
    },

    /**
     * Analyze project with intelligent model selection
     */
    async analyzeProject(
        files: FileContext[],
        options?: {
            model?: AIModel;
            depth?: 'quick' | 'deep';
        }
    ): Promise<AnalysisResult> {
        const depth = options?.depth || 'quick';
        const selectedModel = options?.model || this.selectModel(
            depth === 'quick' ? 'quick-scan' : 'deep-analysis',
            files.length
        );

        const modelConfig = MODEL_CONFIGS[selectedModel];

        try {
            // Build system prompt based on depth
            const systemPrompt = depth === 'quick'
                ? "You are a code quality assistant. Quickly identify critical bugs and syntax errors."
                : "You are a senior software architect. Perform comprehensive analysis including bugs, performance, security, and best practices.";

            const userPrompt = `
Analyze the following ${files.length} file(s):

${files.map(f => `
--- ${f.name} ---
${f.content.slice(0, 2000)}... ${f.content.length > 2000 ? '(truncated)' : ''}
`).join('\n')}

Return a JSON object with this exact structure:
{
  "issues": [
    {
      "type": "error" | "warning" | "info",
      "message": "Short description",
      "detail": "Detailed explanation with file location",
      "file": "filename",
      "line": 10
    }
  ],
  "score": number (0-100, where 100 is perfect),
  "summary": "Brief summary of code quality"
}
`;

            let analysisResult;

            if (selectedModel.startsWith('gpt')) {
                // Use OpenAI
                const response = await openai.chat.completions.create({
                    model: selectedModel,
                    messages: [
                        { role: "system", content: systemPrompt },
                        { role: "user", content: userPrompt }
                    ],
                    response_format: { type: "json_object" },
                    max_tokens: modelConfig.maxTokens
                });

                const content = response.choices[0].message.content;
                if (!content) throw new Error("No response from OpenAI");
                analysisResult = JSON.parse(content);

            } else if (selectedModel.startsWith('claude')) {
                // Use Claude
                const response = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: modelConfig.maxTokens,
                    messages: [{
                        role: 'user',
                        content: `${systemPrompt}\n\n${userPrompt}`
                    }]
                });

                const textContent = response.content.find(c => c.type === 'text');
                if (!textContent || textContent.type !== 'text') {
                    throw new Error("No text response from Claude");
                }
                analysisResult = JSON.parse(textContent.text);

            } else if (selectedModel.startsWith('gemini')) {
                // Use Gemini
                const model = genAI.getGenerativeModel({ model: selectedModel, generationConfig: { responseMimeType: "application/json" } });

                const prompt = `${systemPrompt}\n\n${userPrompt}`;
                const result = await model.generateContent(prompt);
                const response = result.response;
                const text = response.text();

                if (!text) throw new Error("No response from Gemini");
                analysisResult = JSON.parse(text);
            }

            return {
                ...analysisResult,
                creditsUsed: modelConfig.cost
            };

        } catch (error: any) {
            console.error(`AI Analysis failed with ${selectedModel}:`, error);

            // Fallback: try a different model
            if (selectedModel !== 'gpt-4o-mini') {
                console.log('Retrying with gpt-4o-mini...');
                return this.analyzeProject(files, { ...options, model: 'gpt-4o-mini' });
            }

            console.warn(`[AI Engine] All AI models failed or unavailable (${error.message}). Returning mock analysis.`);
            return {
                issues: [
                    {
                        type: 'warning',
                        message: 'AI Analysis Unavailable',
                        detail: `The AI analysis failed (Reason: ${error.message}). Please ensure your API keys are correctly configured and have sufficient quota.`,
                        file: 'blueprint.json',
                        line: 1
                    }
                ],
                score: 100,
                summary: 'Analysis could not be completed because the AI engine is currently unavailable or missing configuration.',
                creditsUsed: 0
            };
        }
    },

    /**
     * Generate a fix for a specific issue
     */
    async fixIssue(
        issueDescription: string,
        fileContent: string,
        options?: {
            model?: AIModel;
            fileName?: string;
        }
    ): Promise<{ fixedCode: string; explanation: string; creditsUsed: number }> {
        const selectedModel = options?.model || 'gpt-4o-mini'; // Default to mini for fixes
        const modelConfig = MODEL_CONFIGS[selectedModel];

        try {
            const prompt = `
Fix the following issue in the code: "${issueDescription}"

${options?.fileName ? `File: ${options.fileName}` : ''}

Current Code:
\`\`\`
${fileContent}
\`\`\`

Return a JSON object with:
{
  "fixedCode": "The complete corrected code",
  "explanation": "Brief explanation of the fix"
}
`;

            if (selectedModel.startsWith('gpt')) {
                const response = await openai.chat.completions.create({
                    model: selectedModel,
                    messages: [
                        {
                            role: "system",
                            content: "You are a coding assistant. Fix the code and explain your changes."
                        },
                        { role: "user", content: prompt }
                    ],
                    response_format: { type: "json_object" }
                });

                const content = response.choices[0].message.content;
                if (!content) throw new Error("No response from OpenAI");

                const result = JSON.parse(content);
                return {
                    ...result,
                    creditsUsed: modelConfig.cost
                };
            } else if (selectedModel.startsWith('claude')) {
                // Claude
                const response = await anthropic.messages.create({
                    model: 'claude-3-5-sonnet-20241022',
                    max_tokens: 2048,
                    messages: [{
                        role: 'user',
                        content: prompt
                    }]
                });

                const textContent = response.content.find(c => c.type === 'text');
                if (!textContent || textContent.type !== 'text') {
                    throw new Error("No text response from Claude");
                }

                const result = JSON.parse(textContent.text);
                return {
                    ...result,
                    creditsUsed: modelConfig.cost
                };
            } else if (selectedModel.startsWith('gemini')) {
                // Use Gemini
                const model = genAI.getGenerativeModel({ model: selectedModel, generationConfig: { responseMimeType: "application/json" } });
                const result = await model.generateContent(prompt);
                const text = result.response.text();

                if (!text) throw new Error("No response from Gemini");
                return {
                    ...JSON.parse(text),
                    creditsUsed: modelConfig.cost
                };
            }

            throw new Error(`Model ${selectedModel} is not supported`);

        } catch (error: any) {
            console.error(`Fix generation failed with ${selectedModel}:`, error);
            
            console.warn(`[AI Engine] Backend API keys missing or Model unavailable. Returning mock fix.`);
            return {
                fixedCode: `// The AI Engine is currently unavailable. No fix could be generated.\n// Reason: ${error.message}\n\n${fileContent}`,
                explanation: `Failed to generate a fix because the AI engine reported: ${error.message}. Please configure your API keys.`,
                creditsUsed: 0
            };
        }
    },

    /**
     * Get available models and their configs
     */
    getAvailableModels(): ModelConfig[] {
        return Object.values(MODEL_CONFIGS);
    },

    /**
     * Generate UI code from a prompt
     */
    /**
     * Generate UI code from a prompt
     */
    async generateUI(
        prompt: string,
        options?: {
            model?: AIModel;
            framework?: string;
        }
    ): Promise<{ code: string; explanation: string; creditsUsed: number }> {
        // Use Python Analyzer for UI generation
        try {
            console.log(`[AI Engine] Requesting UI generation for: "${prompt}"`);
            const response = await axios.post(`${config.analyzerUrl}/analyzer/generate`, {
                prompt,
                framework: options?.framework || 'react'
            });

            return {
                code: response.data.code,
                explanation: response.data.explanation,
                creditsUsed: 1 // Flat fee for now
            };
        } catch (error: any) {
            console.error("Failed to generate UI via Analyzer:", error.message);
            // Fallback to internal mock/AI if analyzer fails? 
            // For now, let's keep the error to debug connection.
            throw error;
        }
    },

    /**
     * Generate UPG Blueprint from source via Python Analyzer
     */
    async generateBlueprint(type: string, payload: any, projectName: string): Promise<any> {
        try {
            console.log(`[AI Engine] Requesting blueprint for ${projectName} (${type})`);

            // Call Python Service
            const response = await axios.post(`${config.analyzerUrl}/analyzer/blueprint/generate`, {
                type,
                payload,
                project_name: projectName
            });
            return response.data;

        } catch (error: any) {
            const isConnectionError = error.code === 'ECONNREFUSED' || error.message.includes('network');
            const isTimeout = error.code === 'ECONNABORTED';
            
            let specificReason = "";
            if (isConnectionError) specificReason = `Could not reach Python Analyzer at ${config.analyzerUrl}. Ensure ANALYZER_URL is set correctly in Render.`;
            else if (isTimeout) specificReason = "The Python Analyzer took too long to respond (Cold Start). Please wait 30 seconds and try again.";
            else specificReason = error.message;

            console.error(`[AI Engine] Python analyzer failed: ${specificReason}`);
            
            // Return a safe mock blueprint instead of crashing the entire analysis flow
            const rootId = 'fallback-root';
            const containerId = 'fallback-container';
            return {
                id: 'mock-blueprint',
                rootComponentId: rootId,
                nodes: {
                    [rootId]: {
                        id: rootId,
                        name: projectName || "FallbackComponent",
                        type: "component",
                        children: [containerId],
                    },
                    [containerId]: {
                        id: containerId,
                        tag: 'div',
                        type: 'element',
                        parent: rootId,
                        className: 'p-8 bg-gray-900 border border-gray-800 text-white rounded-lg flex flex-col gap-4',
                        children: ['t1', 't2']
                    },
                    't1': { 
                        id: 't1', 
                        tag: 'h3',
                        type: 'element',
                        parent: containerId,
                        className: 'text-xl font-bold text-red-400',
                        children: ['t1_text'] 
                    },
                    't1_text': { id: 't1_text', type: 'text', parent: 't1', content: 'Analyzer Connection Error' },
                    't2': { 
                        id: 't2',
                        tag: 'p',
                        type: 'element', 
                        parent: containerId, 
                        className: 'text-gray-400 text-sm font-mono',
                        children: ['t2_text']
                    },
                    't2_text': { id: 't2_text', type: 'text', parent: 't2', content: specificReason }
                }
            };
        }
    }
};
