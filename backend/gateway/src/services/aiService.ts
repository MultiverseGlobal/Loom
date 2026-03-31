import { db } from "../db/client.js";

export async function createConversation(userId: string, projectId?: string, title?: string) {
  const [row] = await db`
    INSERT INTO ai_conversations (user_id, project_id, title)
    VALUES (${userId}, ${projectId ?? null}, ${title ?? 'New Chat'})
    RETURNING id
  `;
  return row.id;
}

export async function addMessage(
  conversationId: string,
  role: 'user' | 'assistant' | 'system',
  content: string,
  metadata: Record<string, any> = {}
) {
  await db`
    INSERT INTO ai_messages (conversation_id, role, content, metadata)
    VALUES (${conversationId}, ${role}, ${content}, ${db.json(metadata)})
  `;
}

export async function getConversationHistory(conversationId: string) {
  return db`
    SELECT role, content, metadata, created_at
    FROM ai_messages
    WHERE conversation_id = ${conversationId}
    ORDER BY created_at ASC
  `;
}

export async function listUserConversations(userId: string) {
  return db`
    SELECT * FROM ai_conversations
    WHERE user_id = ${userId}
    ORDER BY updated_at DESC
  `;
}

/**
 * Converts a Shift Blueprint into a structured prompt for the AI Generator
 */
export function formatBlueprintPrompt(blueprint: any): string {
  const root = blueprint.root;

  return `
BRIDE DESIGN TO CODE REQUEST
Target Framework: Next.js + Tailwind CSS

UI STRUCTURE (Shift Blueprint):
${JSON.stringify(root, null, 2)}

INSTRUCTIONS:
1. Convert the above Blueprint tree into a high-quality React component.
2. Use Tailwind CSS for ALL styling.
3. MapBlueprint 'view' to <div>, 'text' to <p> or <span>, 'button' to <button>, etc.
4. IMPORTANT: Respect the 'layout' props (flexDirection, gap, padding, alignment).
5. IMPORTANT: Respect the 'style' props (backgroundColor, borderRadius, fontSize, etc.).
6. Ensure the result is responsive and accessible.
7. Return ONLY the code in the "code" field of the JSON response.
`;
}
