#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import axios from 'axios';
import fs from 'fs/promises';
import path from 'path';

// Load environment variables if running locally
require('dotenv').config();

const API_URL = process.env.SHIFT_API_URL || 'https://shift-gateway.onrender.com/api';

const program = new Command();

program
  .name('shift')
  .description('Instantly sync your AI-generated components directly into your local codebase.')
  .version('0.1.0');

const SHIFT_LOGO = `
   _____ __  _____________   ___    ____
  / ___// / / /  _/ ____/ /_ /   |  /  _/
  \\__ \\/ /_/ // // /_  / __// /| |  / /  
 ___/ / __  // // __/ / /_ / ___ |_/ /   
/____/_/ /_/___/_/    \\__//_/  |_/___/   
`;

program
  .command('pull')
  .description('Pull a project or component into your local workspace')
  .argument('<projectId>', 'The ID of the project to pull')
  .requiredOption('-t, --token <type>', 'Export token provided by the dashboard')
  .option('-d, --dir <dir>', 'The directory to install into', './src/components')
  .action(async (projectId, options) => {
    console.log(chalk.cyan(SHIFT_LOGO));
    console.log(chalk.bold.white(`  Developer Sync Utility v0.1.0\n`));

    const spinner = ora(`Connecting to Shift AI Global Grid...`).start();
    
    try {
      // 1. Fetch file payload
      spinner.text = `Downloading components for project ${chalk.cyan(projectId)}...`;
      
      const response = await axios.get(`${API_URL}/projects/${projectId}/export`, {
        headers: {
          'Authorization': `Bearer ${options.token}`
        }
      });
      
      const data = response.data;
      
      if (!data || !data.files) {
         throw new Error('Invalid project export format received from API');
      }

      spinner.text = `Writing ${data.files.length} files to ${chalk.cyan(options.dir)}...`;

      // 2. Ensure target directory exists
      const targetDir = path.resolve(process.cwd(), options.dir);
      await fs.mkdir(targetDir, { recursive: true });

      // 3. Write files
      for (const file of data.files) {
        const filePath = path.join(targetDir, file.path);
        const fileDir = path.dirname(filePath);
        
        await fs.mkdir(fileDir, { recursive: true });
        await fs.writeFile(filePath, file.content, 'utf-8');
      }

      spinner.succeed(chalk.green(`Successfully synced ${data.files.length} files!`));
      console.log(`\nYour components are ready at ${chalk.bold(options.dir)}`);
      
      // Print explanation if provided
      if (data.explanation) {
         console.log(`\n${chalk.gray(data.explanation)}`);
      }

    } catch (error: any) {
      spinner.fail(chalk.red('Failed to pull project components.'));
      if (error.response?.data?.message) {
         console.error(chalk.red(`Error: ${error.response.data.message}`));
      } else {
         console.error(chalk.red(`Error: ${error.message}`));
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
