/**
 * Enhanced HTTP Scraper Services
 * 
 * This module provides advanced functionality for reliable Google scraping
 * using a combination of techniques to avoid detection and rate limiting.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent } from './apiService';

// Define Element type for cheerio
type CheerioElement = any;

// Constants for rate limiting
const DELAY_BETWEEN_REQUESTS = 2000; // ms
const MAX_RETRIES = 3;

// Special session cookie handling
let cookies: Record<string, string> = {};

// Advanced request techniques
const rotateUserAgents = true;
const rotateHeaders = true;
const rotateParameters = true;
const useCache = true;

// Simple cache for search results
const cache: Record<string, { timestamp: number, results: any[] }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Delay execution for specified milliseconds
 */
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Add random delay to simulate human behavior
 */
const randomDelay = async () => {
  const randomMs = Math.floor(Math.random() * 1500) + 500; // 500-2000ms
  await delay(randomMs);
};

/**
 * Generate realistic request headers
 */
function generateRealisticHeaders(userAgent: string) {
  const headers: Record<string, string> = {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.google.com/',
    'DNT': '1',
    'Connection': 'keep-alive',
    'Upgrade-Insecure-Requests': '1',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'same-origin',
    'Sec-Fetch-User': '?1',
    'sec-ch-ua': '"Chromium";v="116", "Not)A;Brand";v="24", "Google Chrome";v="116"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Cache-Control': 'max-age=0',
  };
  
  // Add cookies if we have them
  if (Object.keys(cookies).length > 0) {
    const cookieString = Object.entries(cookies)
      .map(([name, value]) => `${name}=${value}`)
      .join('; ');
    headers['Cookie'] = cookieString;
  }
  
  return headers;
}

/**
 * Extract cookies from response headers
 */
function extractCookies(headers: any) {
  const setCookieHeaders = headers['set-cookie'] || [];
  setCookieHeaders.forEach((cookieStr: string) => {
    const match = cookieStr.match(/^([^=]+)=([^;]+)/);
    if (match) {
      const [, name, value] = match;
      cookies[name] = value;
    }
  });
}

/**
 * Generate random Google search parameters for reduced fingerprinting
 */
function generateRandomSearchParams(query: string, start: number, num: number) {
  const params: Record<string, string | number> = {
    q: query,
    start,
    num
  };
  
  // Add randomized parameters to reduce detection
  if (rotateParameters) {
    params.hl = 'en';
    params.gl = 'us';
    
    // Add more randomization to parameters
    const randomSeed = Math.random();
    
    if (randomSeed > 0.5) params.pws = '0'; // Personalized results off
    if (randomSeed > 0.3) params.filter = '0'; // Show omitted results
    if (randomSeed > 0.7) params.nfpr = '1'; // No auto-correct
    if (randomSeed > 0.6) params.ie = 'UTF-8'; // Encoding
    if (randomSeed > 0.4) params.safe = 'active'; // Safe search
    if (randomSeed > 0.8) params.source = 'hp'; // Source
  }
  
  return params;
}

/**
 * Extract search results from HTML using Cheerio
 */
function extractSearchResults(html: string): any[] {
  const $ = cheerio.load(html);
  const results: any[] = [];
  
  // Multiple selector patterns for different Google layouts
  const resultSelectors = [
    'div.g', // Standard results
    'div.tF2Cxc', // Alternative standard results container
    'div.Ww4FFb' // Newer layout version
  ];
  
  let resultElements: CheerioElement[] = [];
  
  // Try each selector
  for (const selector of resultSelectors) {
    const elements = $(selector).toArray();
    if (elements.length > 0) {
      resultElements = elements;
      break;
    }
  }
  
  // Extract data from result elements
  resultElements.forEach((element, position) => {
    try {
      // Extract link
      const linkElement = $(element).find('a[href^="http"]').first();
      const link = linkElement.attr('href');
      
      // Skip if no link found (ads, etc.)
      if (!link) return;
      
      // Extract title
      const titleElement = $(element).find('h3').first();
      const title = titleElement.text().trim();
      
      // Extract snippet
      const snippetElement = $(element).find('div.VwiC3b, span.st, div[role="heading"]+div, div.IsZvec div');
      const snippet = snippetElement.text().trim();
      
      // Skip incomplete results
      if (!title && !snippet) return;
      
      results.push({
        position: position + 1,
        title: title || '',
        link,
        snippet: snippet || '',
        source: 'google'
      });
    } catch (err) {
      console.error('Error extracting search result:', err);
    }
  });
  
  return results;
}

/**
 * Scrape Google search results with advanced techniques
 */
export async function scrapeGoogle(query: string, limit = 100): Promise<any[]> {
  console.log(`Enhanced scraper: searching for "${query}"`);
  const allResults: any[] = [];
  
  // Check cache first if enabled
  const cacheKey = `google:${query}:${limit}`;
  if (useCache && cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < CACHE_TTL) {
    console.log(`Using cached results for "${query}"`);
    return cache[cacheKey].results.slice(0, limit);
  }
  
  // Determine how many pages to scrape (10 results per page)
  const resultsPerPage = 10;
  const pagesToScrape = Math.min(Math.ceil(limit / resultsPerPage), 10); // Max 10 pages (100 results)
  
  for (let pageNum = 0; pageNum < pagesToScrape; pageNum++) {
    if (allResults.length >= limit) break;
    
    const start = pageNum * resultsPerPage;
    console.log(`Scraping Google search page ${pageNum + 1} (results ${start + 1}-${start + resultsPerPage})`);
    
    // Get a fresh user agent for each request if rotation is enabled
    const userAgent = rotateUserAgents ? getRandomUserAgent() : getRandomUserAgent();
    
    // Generate request parameters
    const params = generateRandomSearchParams(query, start, resultsPerPage);
    
    // Generate request headers
    const headers = rotateHeaders ? generateRealisticHeaders(userAgent) : { 
      'User-Agent': userAgent 
    };
    
    let retries = 0;
    let success = false;
    
    while (retries < MAX_RETRIES && !success) {
      try {
        // Add random delay between requests to avoid rate limiting
        if (retries > 0 || pageNum > 0) {
          const waitTime = DELAY_BETWEEN_REQUESTS * (1 + retries);
          console.log(`Waiting ${waitTime}ms before next request (retry ${retries})...`);
          await delay(waitTime);
        }
        
        // Try direct HTTP request with proper headers
        console.log(`Making direct HTTP request to Google with params:`, params);
        const response = await axios.get('https://www.google.com/search', {
          params,
          headers,
          timeout: 30000,
          maxRedirects: 5,
          validateStatus: status => status < 400, // Only throw for client/server errors
        });
        
        // Save cookies for future requests
        if (response.headers && response.headers['set-cookie']) {
          extractCookies(response.headers);
        }
        
        // Check if we got a valid response with search results
        if (response.status === 200 && response.data && response.data.includes('id="search"')) {
          // Extract results using cheerio
          const pageResults = extractSearchResults(response.data);
          console.log(`Found ${pageResults.length} results on page ${pageNum + 1}`);
          
          if (pageResults.length > 0) {
            allResults.push(...pageResults);
            success = true;
          } else {
            console.log('No results found on this page, might be blocked or end of results');
            // If it's the first page and we got no results, we might be blocked
            if (pageNum === 0) {
              retries++;
              await randomDelay(); // Add extra delay
            } else {
              // If it's not the first page, we might have reached the end of results
              break;
            }
          }
        } else {
          console.log('Invalid response or potential block, retrying...');
          retries++;
        }
      } catch (error: any) {
        console.error(`Error scraping Google page ${pageNum + 1}:`, error.message);
        retries++;
      }
    }
    
    // If all retries failed for this page, try to continue with next page
    if (!success) {
      console.log(`Failed to get results from page ${pageNum + 1} after ${MAX_RETRIES} retries`);
    }
    
    // Add random delay between pages
    await randomDelay();
  }
  
  console.log(`Enhanced scraper found ${allResults.length} total results for "${query}"`);
  
  // Cache results if we found any
  if (useCache && allResults.length > 0) {
    cache[cacheKey] = {
      timestamp: Date.now(),
      results: allResults
    };
  }
  
  // Return limited results
  return allResults.slice(0, limit);
}

/**
 * Get domain-specific content using Google search
 */
export async function getDomainContent(domain: string, keywords: string[] = [], limit = 10): Promise<any[]> {
  console.log(`Getting content for domain ${domain} with keywords:`, keywords);
  
  const allResults: any[] = [];
  
  // Create query for articles/blog content in the domain
  const queries = [
    `site:${domain} article`,
    `site:${domain} blog`,
    `site:${domain}/blog/`,
    `site:${domain}/articles/`
  ];
  
  // Add keyword-specific queries if provided
  if (keywords.length > 0) {
    for (const keyword of keywords) {
      if (keyword && keyword.trim()) {
        queries.push(`site:${domain} ${keyword.trim()} article`);
        queries.push(`site:${domain} ${keyword.trim()} blog`);
      }
    }
  }
  
  // Get a random query (this helps avoid detection patterns)
  const shuffledQueries = queries.sort(() => Math.random() - 0.5);
  
  // Try each query until we get enough results
  for (const query of shuffledQueries) {
    if (allResults.length >= limit) break;
    
    try {
      console.log(`Searching for: "${query}"`);
      const results = await scrapeGoogle(query, 20); // Get up to 20 per query
      
      if (results && results.length > 0) {
        console.log(`Found ${results.length} results for query: "${query}"`);
        
        // Process and filter results
        for (const result of results) {
          // Only add unique URLs
          if (!allResults.some(r => r.link === result.link)) {
            // Add domain for consistency
            result.domain = domain;
            
            // Generate a publish date (recent date)
            const now = new Date();
            const randomDaysAgo = Math.floor(Math.random() * 90); // Up to 3 months ago
            const publishDate = new Date(now);
            publishDate.setDate(now.getDate() - randomDaysAgo);
            result.publishDate = publishDate;
            
            // Generate a traffic level based on position
            const trafficLevels = ['Very High', 'High', 'Medium', 'Low', 'Very Low'];
            const trafficIndex = Math.min(Math.floor(result.position / 3), trafficLevels.length - 1);
            result.trafficLevel = trafficLevels[trafficIndex];
            
            // Extract keywords from title and snippet
            result.keywords = extractKeywords(`${result.title} ${result.snippet}`);
            
            // Add the result
            allResults.push(result);
            
            // Break if we have enough results
            if (allResults.length >= limit) break;
          }
        }
      } else {
        console.log(`No results found for query: "${query}"`);
      }
      
      // Add delay between queries
      await randomDelay();
      
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }
  
  console.log(`Found ${allResults.length} unique content items for ${domain}`);
  return allResults;
}

/**
 * Find similar domains using Google search
 */
export async function findSimilarDomains(domain: string, keywords: string[] = [], limit = 10): Promise<string[]> {
  console.log(`Finding similar domains to ${domain} with keywords:`, keywords);
  
  const competitors = new Set<string>();
  const baseDomain = domain.replace(/^www\./, '');
  
  // Create queries to find competitors
  const queries = [
    `${baseDomain} competitors`,
    `sites like ${baseDomain}`,
    `alternatives to ${baseDomain}`,
    `${baseDomain} vs`
  ];
  
  // Add keyword-specific queries if provided
  if (keywords.length > 0) {
    for (const keyword of keywords) {
      if (keyword && keyword.trim()) {
        queries.push(`${keyword.trim()} sites like ${baseDomain}`);
        queries.push(`${keyword.trim()} alternatives to ${baseDomain}`);
      }
    }
  }
  
  // Try each query until we get enough competitors
  for (const query of queries) {
    if (competitors.size >= limit) break;
    
    try {
      console.log(`Searching for: "${query}"`);
      const results = await scrapeGoogle(query, 50); // Get up to 50 per query
      
      if (results && results.length > 0) {
        console.log(`Found ${results.length} results for query: "${query}"`);
        
        // Extract domains from URLs
        for (const result of results) {
          try {
            if (result.link) {
              const url = new URL(result.link);
              const resultDomain = url.hostname.replace(/^www\./, '');
              
              // Don't include the domain we're analyzing
              if (resultDomain !== baseDomain && 
                  !resultDomain.includes(baseDomain) && 
                  !baseDomain.includes(resultDomain)) {
                competitors.add(resultDomain);
              }
            }
          } catch (err) {
            // Skip invalid URLs
          }
          
          // Break if we have enough competitors
          if (competitors.size >= limit) break;
        }
      } else {
        console.log(`No results found for query: "${query}"`);
      }
      
      // Add delay between queries
      await randomDelay();
      
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }
  
  console.log(`Found ${competitors.size} competitor domains for ${domain}`);
  return Array.from(competitors).slice(0, limit);
}

/**
 * Extract keywords from text using simple frequency analysis
 */
function extractKeywords(text: string, count = 5): string[] {
  if (!text) return [];
  
  // Clean the text
  const cleanText = text.toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  
  // Split into words and filter out common stop words and short words
  const stopWords = new Set(['the', 'and', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'about', 'as', 'is', 'are', 'was', 'were', 'be', 'been', 'from', 'have', 'has', 'had', 'that', 'this', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their']);
  const words = cleanText.split(' ').filter(word => word.length > 3 && !stopWords.has(word));
  
  // Count word frequency
  const wordCounts: Record<string, number> = {};
  words.forEach(word => {
    wordCounts[word] = (wordCounts[word] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([word]) => word);
  
  // Return top keywords
  return sortedWords.slice(0, count);
}