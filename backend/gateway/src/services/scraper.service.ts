
import axios from 'axios';
import * as cheerio from 'cheerio';
import puppeteer, { Browser, Page } from 'puppeteer';
import { BlueprintNode, ShiftBlueprint } from './adapters/types.js';

export class ScraperService {
    private static browser: Browser | null = null;

    private static async getBrowser(): Promise<Browser> {
        if (!this.browser) {
            console.log('[Scraper] Launching browser...');
            try {
                this.browser = await puppeteer.launch({
                    headless: true,
                    executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
                    pipe: true,
                    args: [
                        '--no-sandbox', 
                        '--disable-setuid-sandbox',
                        '--disable-dev-shm-usage',
                        '--disable-gpu',
                        '--no-zygote',
                        '--single-process'
                    ]
                });
                console.log('[Scraper] Browser launched successfully.');
            } catch (err) {
                console.error('[Scraper] Failed to launch browser:', err);
                throw err;
            }
        }
        return this.browser;
    }

    /**
     * Captures a visual tree from a live URL
     */
    static async getVisualTree(url: string): Promise<BlueprintNode | null> {
        console.log(`[Scraper] Starting visual capture for: ${url}`);
        
        try {
            // Try Puppeteer first for high-fidelity (JS support)
            const result = await Promise.race([
                this.getPuppeteerTree(url),
                new Promise<null>((_, reject) => setTimeout(() => reject(new Error('Puppeteer Timeout')), 15000))
            ]);
            
            if (result) return result;
        } catch (error) {
            console.warn('[Scraper] Puppeteer failed or timed out, falling back to static scrape:', error);
        }

        // Fallback to static scrape (Cheerio)
        return this.getStaticTree(url);
    }

    private static async getPuppeteerTree(url: string): Promise<BlueprintNode | null> {
        let page: Page | null = null;
        try {
            const browser = await this.getBrowser();
            console.log('[Scraper] Creating new page...');
            page = await browser.newPage();
            
            await page.setViewport({ width: 1440, height: 900 });
            console.log(`[Scraper] Navigating to ${url}...`);

            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            console.log('[Scraper] Page loaded. Executing extraction script...');

            const result = await page.evaluate(this.extractionScript);
            console.log('[Scraper] Extraction complete.');

            return result as BlueprintNode;
        } catch (error) {
            console.error('[Scraper] Puppeteer error:', error);
            return null;
        } finally {
            if (page) await page.close();
        }
    }

    private static async getStaticTree(url: string): Promise<BlueprintNode | null> {
        console.log(`[Scraper] Performing static scrape for ${url}`);
        try {
            const { data } = await axios.get(url, { timeout: 10000 });
            const $ = cheerio.load(data);
            
            // Simple conversion of HTML to BlueprintNode
            const rootNode: BlueprintNode = {
                id: 'root',
                type: 'view',
                name: 'body',
                style: {},
                layout: {},
                children: []
            };

            // Basic extraction of text and structure
            $('body').children().each((_, el) => {
                const node = this.cheerioExtract($(el));
                if (node) rootNode.children?.push(node);
            });

            return rootNode;
        } catch (error) {
            console.error('[Scraper] Static scrape failed:', error);
            return null;
        }
    }

    private static cheerioExtract(el: any): BlueprintNode | null {
        const tagName = el.prop('tagName')?.toLowerCase();
        if (!tagName || ['script', 'style', 'noscript'].includes(tagName)) return null;

        const node: BlueprintNode = {
            id: 'node-' + Math.random().toString(36).substr(2, 9),
            type: tagName === 'img' ? 'image' : (tagName === 'button' ? 'button' : 'view'),
            name: tagName,
            style: {},
            layout: {},
            children: []
        };

        const text = el.clone().children().remove().end().text().trim();
        if (text) {
            node.children?.push({
                id: 'text-' + Math.random().toString(36).substr(2, 9),
                type: 'text',
                name: 'Text',
                content: text,
                style: {},
                layout: {}
            });
        }

        el.children().each((_: any, child: any) => {
            const childNode = this.cheerioExtract(cheerio.load(el.html() || '')(child));
            if (childNode) node.children?.push(childNode);
        });

        return node;
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
