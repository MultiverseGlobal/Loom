import { promises as fs } from 'fs';
import path from 'path';

/**
 * Service to handle direct file system operations for Local Mode.
 * This allows the Loom Gateway to apply fixes directly to disk.
 */
export const localFileSystemService = {
    /**
     * Appends content to a file. Useful for logs or simple patches.
     */
    async appendToFile(filePath: string, content: string): Promise<void> {
        try {
            await fs.appendFile(filePath, content + '\n');
        } catch (error) {
            console.error(`[LocalFS] Failed to append to ${filePath}:`, error);
            throw error;
        }
    },

    /**
     * Writes content to a file, creating it if it doesn't exist.
     */
    async writeFile(filePath: string, content: string): Promise<void> {
        try {
            const dir = path.dirname(filePath);
            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(filePath, content);
        } catch (error) {
            console.error(`[LocalFS] Failed to write to ${filePath}:`, error);
            throw error;
        }
    },

    /**
     * Reads a file from disk.
     */
    async readFile(filePath: string): Promise<string> {
        try {
            return await fs.readFile(filePath, 'utf-8');
        } catch (error) {
            console.error(`[LocalFS] Failed to read ${filePath}:`, error);
            throw error;
        }
    },

    /**
     * Checks if a file or directory exists.
     */
    async exists(filePath: string): Promise<boolean> {
        try {
            await fs.access(filePath);
            return true;
        } catch {
            return false;
        }
    }
};
