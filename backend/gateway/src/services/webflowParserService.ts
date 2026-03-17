import JSZip from 'jszip';
import * as cheerio from 'cheerio';
import { supabase } from '../lib/supabase.js';
import { aiEngine } from './ai-engine.js';
import { projectFileService } from './projectFileService.js';

export interface WebflowFileData {
  path: string;
  content: string;
}

export class WebflowParserService {
  /**
   * Processes an uploaded Webflow ZIP file.
   * Extracts HTML and CSS, cleans it, and initiates AI generation.
   */
  static async processZipUpload(projectId: string, zipBuffer: Buffer, filename: string) {
    try {
      console.log(`[WebflowParser] Starting extraction for project ${projectId}`);
      
      const zip = new JSZip();
      const unzipped = await zip.loadAsync(zipBuffer);
      
      const htmlFiles: WebflowFileData[] = [];
      let globalCss = '';

      // 1. Extract files
      for (const [path, file] of Object.entries(unzipped.files)) {
        if (file.dir) continue;
        
        // We only care about HTML for structure and CSS for styling
        if (path.endsWith('.html')) {
          const content = await file.async('string');
          htmlFiles.push({ path, content });
        } else if (path.endsWith('.css')) {
          const content = await file.async('string');
          globalCss += `\n/* From ${path} */\n${content}`;
        }
      }

      console.log(`[WebflowParser] Extracted ${htmlFiles.length} HTML files and CSS styles`);

      if (htmlFiles.length === 0) {
        throw new Error("No HTML files found in the ZIP archive.");
      }

      // 2. Clean and parse each HTML file
      for (const htmlFile of htmlFiles) {
        console.log(`[WebflowParser] Cleaning ${htmlFile.path}`);
        const cleanedHtml = this.cleanWebflowHtml(htmlFile.content);

        // 3. Send to AI Engine for Generation
        console.log(`[WebflowParser] Sending ${htmlFile.path} to Claude for Next.js generation...`);
        
        const prompt = `
          Convert this Webflow HTML into a clean, modern Next.js React component using Tailwind CSS.
          
          Guidelines:
          1. Return ONLY the raw code, no markdown wrapping, no explanations.
          2. Use semantic HTML5 elements where appropriate.
          3. Convert the provided CSS classes into their equivalent Tailwind CSS utility classes. 
          4. Strip out any remaining Webflow-specific data attributes or legacy scripts.
          5. Make the component responsive.
          
          Filename: ${htmlFile.path}
          
          HTML Structure:
          \`\`\`html
          ${cleanedHtml}
          \`\`\`
          
          Global CSS reference (use to determine Tailwind equivalents):
          \`\`\`css
          ${globalCss.length > 50000 ? globalCss.substring(0, 50000) + '... (truncated)' : globalCss}
          \`\`\`
        `;

        // We use the existing aiEngine, but bypass the 'framework' wrapper to get raw React
        const result = await aiEngine.generateUI(prompt, { framework: 'react' });
        
        const filename = this.generateFilename(htmlFile.path);

        // 4. Save the generated component using the unified projectFileService
        await projectFileService.saveGeneratedFile(projectId, filename, result.code, 'component');
      }

      console.log(`[WebflowParser] Successfully processed ${filename}`);

    } catch (error) {
      console.error(`[WebflowParser] Error processing ZIP:`, error);
      throw error;
    }
  }

  /**
   * Cleans Webflow HTML by removing standard boilerplate and scripts to reduce token count.
   */
  private static cleanWebflowHtml(rawHtml: string): string {
    const $ = cheerio.load(rawHtml);

    // Remove Webflow scripts
    $('script[src*="webflow.js"]').remove();
    $('script[src*="jquery"]').remove();
    
    // Remove Webflow specific meta tags and attributes if they clutter too much
    $('[data-wf-page]').removeAttr('data-wf-page');
    $('[data-wf-site]').removeAttr('data-wf-site');

    // Extract just the body content to save tokens (we don't need the head for React components usually)
    const bodyContent = $('body').html() || rawHtml;
    
    return bodyContent.trim();
  }

  private static generateFilename(originalPath: string): string {
    const componentName = originalPath
      .replace('.html', '')
      .split(/[-_]+/)
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join('');
      
    return `${componentName || 'Component'}.tsx`;
  }
}
