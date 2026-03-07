import OpenAI from 'openai';
import { config } from '../config';

// Initialize OpenAI client
// We allow it to fail silently if key is missing, but methods will throw
const openai = new OpenAI({
    apiKey: config.openaiApiKey || 'dummy-key',
});

interface FileContext {
    name: string;
    content: string;
}

export const openaiService = {
    /**
     * Analyzes a project's structure and code to identify issues.
     */
    async analyzeProject(files: FileContext[]) {
        if (!config.openaiApiKey) {
            throw new Error("OpenAI API Key is missing. Please set OPENAI_API_KEY in backend .env");
        }

        const prompt = `
        You are a senior software architect. Analyze the following project files for:
        1. Bugs or Syntax Errors
        2. Performance Issues
        3. Best Practice Violations
        4. Missing Dependencies or Assets

        Files:
        ${files.map(f => `--- ${f.name} ---\n${f.content.slice(0, 1000)}... (truncated)`).join('\n\n')}

        Return a JSON object with this shape:
        {
          "issues": [
            { "type": "error" | "warning" | "info", "message": "Short description", "detail": "Detailed explanation and file location" }
          ],
          "score": number (0-100),
          "summary": "Brief summary of code quality"
        }
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a helpful code analysis assistant. Always respond in valid JSON." },
                { role: "user", content: prompt }
            ],
            response_format: { type: "json_object" }
        });

        const content = response.choices[0].message.content;
        if (!content) throw new Error("No response from OpenAI");

        return JSON.parse(content);
    },

    /**
     * Generates a fix for a specific issue.
     */
    async fixIssue(issueDescription: string, fileContent: string) {
        if (!config.openaiApiKey) {
            throw new Error("OpenAI API Key is missing.");
        }

        const prompt = `
        Fix the following issue in the code: "${issueDescription}"

        Code:
        ${fileContent}

        Return only the full corrected code block. No markdown fencing around it if possible, or plain text.
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                { role: "system", content: "You are a coding assistant. Return replacement code only." },
                { role: "user", content: prompt }
            ]
        });

        return response.choices[0].message.content;
    }
};
