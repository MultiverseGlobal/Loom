
import puppeteer, { Browser, Page } from 'puppeteer';
import { BlueprintNode, ShiftBlueprint } from './adapters/types.js';

export class ScraperService {
    private static browser: Browser | null = null;

    private static async getBrowser(): Promise<Browser> {
        if (!this.browser) {
            this.browser = await puppeteer.launch({
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });
        }
        return this.browser;
    }

    /**
     * Captures a visual tree from a live URL
     */
    static async getVisualTree(url: string): Promise<BlueprintNode | null> {
        console.log(`[Scraper] Starting visual capture for: ${url}`);
        let page: Page | null = null;
        
        try {
            const browser = await this.getBrowser();
            page = await browser.newPage();
            
            // Set viewport to a common desktop size
            await page.setViewport({ width: 1440, height: 900 });

            // Navigate and wait for content to load
            await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });

            // Inject the extraction script
            const result = await page.evaluate(this.extractionScript);

            return result as BlueprintNode;
        } catch (error) {
            console.error('[Scraper] Capture failed:', error);
            return null;
        } finally {
            if (page) await page.close();
        }
    }

    /**
     * Script to be executed in the browser context to extract the DOM tree
     */
    private static extractionScript = `(() => {
        function getComputedStyles(el) {
            const styles = window.getComputedStyle(el);
            const result = {};
            // Filter only useful styles for the refactoring engine
            const keys = [
                'display', 'position', 'flexDirection', 'justifyContent', 'alignItems',
                'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft',
                'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
                'width', 'height', 'backgroundColor', 'color', 'fontSize', 'fontWeight',
                'borderRadius', 'borderWidth', 'borderColor', 'opacity', 'zIndex',
                'gap', 'gridTemplateColumns'
            ];
            keys.forEach(key => {
                const val = styles[key];
                if (val && val !== 'initial' && val !== 'none' && val !== 'normal' && val !== '0px' && val !== 'rgba(0, 0, 0, 0)') {
                    result[key] = val;
                }
            });
            return result;
        }

        function extractNode(el, depth = 0) {
            if (!el || depth > 20) return null; // Safety limit
            if (el.nodeType === Node.TEXT_NODE) {
                const content = el.textContent.trim();
                if (!content) return null;
                return {
                    id: 'text-' + Math.random().toString(36).substr(2, 9),
                    type: 'text',
                    name: 'Text',
                    content: content,
                    style: {},
                    layout: {}
                };
            }

            if (el.nodeType !== Node.ELEMENT_NODE) return null;
            
            // Ignore hidden/internal elements
            const style = getComputedStyles(el);
            if (style.display === 'none' || el.tagName === 'SCRIPT' || el.tagName === 'STYLE' || el.tagName === 'NOSCRIPT') return null;

            const node = {
                id: el.id || 'node-' + Math.random().toString(36).substr(2, 9),
                type: el.tagName === 'IMG' ? 'image' : (el.tagName === 'BUTTON' ? 'button' : 'view'),
                name: el.tagName.toLowerCase(),
                style: style,
                layout: {},
                children: []
            };

            // Specialized handling for text containers
            if (el.childNodes.length === 1 && el.childNodes[0].nodeType === Node.TEXT_NODE) {
                node.type = 'text';
                node.content = el.childNodes[0].textContent.trim();
            } else {
                for (const child of el.childNodes) {
                    const childNode = extractNode(child, depth + 1);
                    if (childNode) node.children.push(childNode);
                }
            }

            return node;
        }

        return extractNode(document.body);
    })()`;
}
