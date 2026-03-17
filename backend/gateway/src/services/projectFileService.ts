import { db } from "../db/client.js";
import { supabase } from "../lib/supabase.js";
import { randomUUID } from "node:crypto";

export const projectFileService = {
  /**
   * Saves a single file to the project's file tree and updates the latest analysis snapshot.
   */
  async saveGeneratedFile(projectId: string, filePath: string, content: string, type: 'component' | 'page' | 'style' | 'config' = 'component') {
    try {
      // 1. Save to project_files table for individual file access
      await db`
        INSERT INTO project_files (id, project_id, file_path, content, type)
        VALUES (${randomUUID()}, ${projectId}, ${filePath}, ${content}, ${type})
        ON CONFLICT (project_id, file_path)
        DO UPDATE SET content = EXCLUDED.content, updated_at = NOW()
      `;

      // 2. Update the UPG snapshot in the analyses table
      const { data: latestAnalysis } = await supabase
        .from('analyses')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      let resultJson = latestAnalysis?.result_json || { upg: {} };
      if (!resultJson.upg) resultJson.upg = {};

      resultJson.upg[filePath] = {
        type: "file",
        content: content
      };

      if (latestAnalysis) {
        await supabase
          .from('analyses')
          .update({ result_json: resultJson })
          .eq('id', latestAnalysis.id);
      } else {
        await supabase
          .from('analyses')
          .insert({
            project_id: projectId,
            status: 'completed',
            result_json: resultJson
          });
      }

      console.log(`[ProjectFileService] Saved ${filePath} for project ${projectId}`);
    } catch (error) {
      console.error(`[ProjectFileService] Failed to save file ${filePath}:`, error);
      throw error;
    }
  },

  /**
   * Saves multiple files at once.
   */
  async saveGeneratedFiles(projectId: string, files: Array<{ path: string, content: string, type?: any }>) {
    for (const file of files) {
      await this.saveGeneratedFile(projectId, file.path, file.content, file.type || 'component');
    }
  }
};
