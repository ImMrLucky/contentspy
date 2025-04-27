/**
 * Python Scraper Bridge
 * 
 * This module provides an interface to call our Python scraper from Node.js
 * for improved CAPTCHA avoidance and more robust scraping capabilities.
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';

const execPromise = promisify(exec);

// Maximum execution time for Python scripts (in milliseconds)
const PYTHON_TIMEOUT = 120000; // 2 minutes

/**
 * Helper function to execute Python scripts with improved error handling
 */
async function executePythonScript(scriptArgs: string[]): Promise<string> {
  try {
    // Get the absolute path to the Python script
    const scriptPath = path.join(process.cwd(), 'server', 'services', 'pythonScraper.py');
    
    // Build the complete command
    const command = `python3 ${scriptPath} ${scriptArgs.join(' ')}`;
    console.log(`Executing Python command: ${command}`);
    
    // Execute with timeout
    const { stdout, stderr } = await execPromise(command, { timeout: PYTHON_TIMEOUT });
    
    if (stderr && stderr.trim()) {
      console.warn(`Python script warning: ${stderr}`);
    }
    
    return stdout;
  } catch (error) {
    console.error(`Error executing Python script: ${error.message}`);
    
    // Include stderr if available
    if (error.stderr) {
      console.error(`Python stderr: ${error.stderr}`);
    }
    
    // Re-throw with improved message
    throw new Error(`Python script execution failed: ${error.message}`);
  }
}

/**
 * Scrape Google search results using the Python scraper (requests-html)
 */
export async function scrapeGoogleWithPython(query: string, limit = 200): Promise<any[]> {
  console.log(`Starting Python scraper for query: "${query}"`);
  
  try {
    // Execute the Python script for search
    const output = await executePythonScript(['search', `"${query}"`, limit.toString()]);
    
    // Find the JSON results in the output
    let jsonStr = '';
    const jsonStartIndex = output.indexOf('[');
    const jsonEndIndex = output.lastIndexOf(']');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      jsonStr = output.substring(jsonStartIndex, jsonEndIndex + 1);
      const results = JSON.parse(jsonStr);
      console.log(`Python scraper found ${results.length} results`);
      return results;
    }
    
    // If we can't parse the JSON, look for results in the output
    console.warn('Failed to parse JSON from Python output. Output was:', output);
    return [];
  } catch (error) {
    console.error('Error in Python scraper:', error);
    return [];
  }
}

/**
 * Find similar websites using the Python scraper
 */
export async function getSimilarWebsitesWithPython(domain: string): Promise<string[]> {
  console.log(`Finding similar websites for domain: ${domain} using Python`);
  
  try {
    // Execute the Python script for similar websites
    const output = await executePythonScript(['similar', `"${domain}"`]);
    
    // Find the JSON results in the output
    let jsonStr = '';
    const jsonStartIndex = output.indexOf('[');
    const jsonEndIndex = output.lastIndexOf(']');
    
    if (jsonStartIndex !== -1 && jsonEndIndex !== -1) {
      jsonStr = output.substring(jsonStartIndex, jsonEndIndex + 1);
      const results = JSON.parse(jsonStr);
      console.log(`Python scraper found ${results.length} similar websites`);
      return results;
    }
    
    // If we can't parse the JSON, look for results in the output
    console.warn('Failed to parse JSON from Python output. Output was:', output);
    return [];
  } catch (error) {
    console.error('Error in Python similar websites scraper:', error);
    return [];
  }
}