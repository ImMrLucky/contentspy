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
const PYTHON_TIMEOUT = 150000; // 2.5 minutes

// Maximum number of retry attempts for Python script execution
const MAX_RETRY_ATTEMPTS = 3;

// Delay between retry attempts (in milliseconds)
const RETRY_DELAY = 5000;

/**
 * Helper function to sleep/delay execution
 */
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Helper function to execute Python scripts with improved error handling and retry logic
 */
async function executePythonScript(scriptArgs: string[]): Promise<string> {
  let lastError: any = null;
  
  // Try multiple times with exponential backoff
  for (let attempt = 0; attempt < MAX_RETRY_ATTEMPTS; attempt++) {
    try {
      // Get the absolute path to the Python script
      const scriptPath = path.join(process.cwd(), 'server', 'services', 'pythonScraper.py');
      
      // Build the complete command
      const command = `python3 ${scriptPath} ${scriptArgs.join(' ')}`;
      console.log(`Executing Python command (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}): ${command}`);
      
      // Execute with timeout
      const { stdout, stderr } = await execPromise(command, { timeout: PYTHON_TIMEOUT });
      
      if (stderr && stderr.trim()) {
        console.warn(`Python script warning: ${stderr}`);
      }
      
      return stdout;
    } catch (error: any) {
      lastError = error;
      console.error(`Error executing Python script (attempt ${attempt + 1}/${MAX_RETRY_ATTEMPTS}): ${error.message || 'Unknown error'}`);
      
      // Include stderr if available
      if (error.stderr) {
        console.error(`Python stderr: ${error.stderr}`);
      }
      
      // Only retry for specific error conditions that could be transient
      const isTransientError = 
        error.message?.includes('timeout') || 
        error.message?.includes('rate limit') || 
        error.message?.includes('captcha') ||
        error.stderr?.includes('timeout') ||
        error.stderr?.includes('rate limit') ||
        error.stderr?.includes('captcha');
      
      if (!isTransientError) {
        console.log('Non-transient error detected, not retrying Python script execution');
        break;
      }
      
      // Wait before next attempt with exponential backoff
      const delayTime = RETRY_DELAY * Math.pow(2, attempt);
      console.log(`Waiting ${delayTime}ms before retrying Python script execution...`);
      await sleep(delayTime);
    }
  }
  
  // If we get here, all attempts failed
  throw new Error(`Python script execution failed after ${MAX_RETRY_ATTEMPTS} attempts: ${lastError?.message || 'Unknown error'}`);
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
      try {
        const results = JSON.parse(jsonStr) as any[];
        console.log(`Python scraper found ${results.length} results`);
        
        // Validate and enhance results
        const validResults = results
          .filter((item: any) => item && item.title && item.link) // Ensure required fields exist
          .map((item: any) => {
            // Ensure consistent field names
            return {
              title: item.title,
              link: item.link,
              snippet: item.snippet || '',
              position: item.position || 0,
              source: 'google-python-scraper'
            };
          });
        
        console.log(`Returning ${validResults.length} valid results from Python scraper`);
        return validResults;
      } catch (parseError: any) {
        console.error(`Error parsing JSON from Python output: ${parseError?.message || 'Unknown error'}`);
        console.warn('JSON parsing failed. Partial output was:', jsonStr.substring(0, 500) + '...');
      }
    }
    
    // If JSON parsing failed, try to extract individual result objects
    console.warn('Attempting to extract partial results from Python output...');
    try {
      // Look for individual JSON objects pattern: {"title": "...", "link": "..."}
      const resultRegex = /{[^{}]*"title"[^{}]*"link"[^{}]*}/g;
      const matches = output.match(resultRegex);
      
      if (matches && matches.length > 0) {
        console.log(`Found ${matches.length} potential result objects in Python output`);
        const parsedResults = [];
        
        for (const match of matches) {
          try {
            const result = JSON.parse(match);
            if (result.title && result.link) {
              parsedResults.push({
                title: result.title,
                link: result.link,
                snippet: result.snippet || '',
                position: result.position || 0,
                source: 'google-python-partial'
              });
            }
          } catch (e) {
            // Skip invalid matches
          }
        }
        
        if (parsedResults.length > 0) {
          console.log(`Successfully extracted ${parsedResults.length} partial results`);
          return parsedResults;
        }
      }
    } catch (regexError: any) {
      console.error(`Error trying to extract partial results: ${regexError?.message || 'Unknown error'}`);
    }
    
    console.warn('Failed to extract any valid results from Python output');
    return [];
  } catch (error: any) {
    console.error('Error in Python scraper:', error?.message || 'Unknown error');
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
      try {
        const results = JSON.parse(jsonStr);
        console.log(`Python scraper found ${results.length} similar websites`);
        
        // Filter for valid domains and US-based domains
        const validDomains = results
          .filter(Boolean) // Remove null/undefined
          .map((d: string) => d.trim()) // Trim whitespace
          .filter((d: string) => d.length > 0) // Filter out empty strings
          .filter((d: string) => {
            // Prioritize US domains
            return d.endsWith('.com') || 
                   d.endsWith('.org') || 
                   d.endsWith('.net') || 
                   d.endsWith('.us');
          });
        
        console.log(`Filtered to ${validDomains.length} valid US-based domains`);
        return validDomains;
      } catch (parseError: any) {
        console.error(`Error parsing JSON from Python output: ${parseError?.message || 'Unknown error'}`);
      }
    }
    
    // If JSON parsing failed, try to extract domains using regex
    console.warn('Attempting to extract domains from Python output...');
    try {
      // Look for quoted domain strings in the output
      const domainRegex = /"([a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,}\.[a-zA-Z]{2,}|[a-zA-Z0-9][a-zA-Z0-9-]*\.[a-zA-Z]{2,})"/g;
      
      // Use a safer approach to iterate through matches instead of using matchAll
      const extractedDomains = new Set<string>();
      let match: RegExpExecArray | null;
      
      // Use exec in a loop instead of matchAll for better compatibility
      while ((match = domainRegex.exec(output)) !== null) {
        if (match[1] && match[1].length > 0) {
          // Filter for US domains
          const d = match[1].trim();
          if (d.endsWith('.com') || d.endsWith('.org') || d.endsWith('.net') || d.endsWith('.us')) {
            extractedDomains.add(d);
          }
        }
      }
      
      if (extractedDomains.size > 0) {
        const domainArray = Array.from(extractedDomains);
        console.log(`Successfully extracted ${domainArray.length} domains using regex`);
        return domainArray;
      }
    } catch (regexError: any) {
      console.error(`Error trying to extract domains with regex: ${regexError?.message || 'Unknown error'}`);
    }
    
    console.warn('Failed to extract any valid domains from Python output');
    return [];
  } catch (error: any) {
    console.error('Error in Python similar websites scraper:', error?.message || 'Unknown error');
    return [];
  }
}