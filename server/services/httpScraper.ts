/**
 * Enhanced HTTP Scraper Services
 * 
 * This module provides functionality for scraping data using HTTP requests
 * with advanced anti-detection measures as a fallback for when browser-based
 * methods fail.
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { HttpProxyAgent } from 'http-proxy-agent';
import { getRandomUserAgent, extractDomain } from './apiService';

// Global access to proxies from apiService
declare global {
  var availableProxies: any[];
}

/**
 * Helper function to get a random proxy for HTTP requests
 */
function getRandomHttpProxy() {
  if (!global.availableProxies || !global.availableProxies.length) {
    return null;
  }
  
  // Filter to working proxies (those with low fail count)
  const workingProxies = global.availableProxies.filter(p => p.failCount < 3);
  if (workingProxies.length === 0) return null;
  
  // Pick a random working proxy
  const randomIndex = Math.floor(Math.random() * workingProxies.length);
  return workingProxies[randomIndex];
}

/**
 * Generate realistic browser fingerprint for HTTP headers
 */
function generateRealisticHeaders() {
  const userAgent = getRandomUserAgent();
  const language = Math.random() > 0.2 ? 'en-US,en;q=0.9' : 'en-GB,en;q=0.8,en-US;q=0.6';
  
  // Generate a random cookie consent value
  const now = new Date();
  const consentDate = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
  const cookieConsent = `CONSENT=YES+cb.${consentDate}-${Math.floor(Math.random() * 20)}-p0.en+FX+${Math.floor(Math.random() * 999)};`;
  
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': language,
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': Math.random() > 0.5 ? 'keep-alive' : 'close',
    'Cookie': cookieConsent,
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': Math.random() > 0.5 ? 'max-age=0' : 'no-cache',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'DNT': Math.random() > 0.5 ? '1' : '0'
  };
}

/**
 * Scrape Google search results using enhanced direct HTTP requests with POST method
 */
export const scrapeGoogleWithHttp = async (query: string, limit = 200): Promise<any[]> => {
  console.log(`Starting enhanced HTTP scraping for query: "${query}"`);
  const allResults: any[] = [];
  
  try {
    // Define the maximum number of pages to scrape
    const maxPages = Math.min(Math.ceil(limit / 10), 20); // Cap at 20 pages max
    
    // Loop through Google search result pages
    for (let currentPage = 0; currentPage < maxPages; currentPage++) {
      if (allResults.length >= limit) break;
      
      // Calculate start position for Google search pagination
      const start = currentPage * 10;
      console.log(`Scraping Google search page ${currentPage + 1} (results ${start + 1}-${start + 10})`);
      
      // Create URL with params that look like a real search
      const formattedQuery = encodeURIComponent(query);
      let url = `https://www.google.com/search?q=${formattedQuery}&start=${start}&num=10`;
      
      // Add some randomized parameters to look more natural
      const possibleParams = ['hl=en', 'gl=us', 'pws=0', 'filter=0', 'nfpr=1', 'ie=UTF-8'];
      const selectedParams = possibleParams.filter(() => Math.random() > 0.3);
      if (selectedParams.length > 0) {
        url += '&' + selectedParams.join('&');
      }
      
      try {
        console.log(`Making enhanced HTTP request to: ${url}`);
        
        // Get realistic headers and a proxy if available
        const headers = generateRealisticHeaders();
        const proxy = getRandomHttpProxy();
        let proxyConfig = {};
        
        // Configure proxy if available
        if (proxy) {
          console.log(`Using proxy ${proxy.host}:${proxy.port} for HTTP request`);
          const proxyUrl = `http://${proxy.host}:${proxy.port}`;
          proxyConfig = {
            proxy: false, // Disable axios proxy to use our custom one
            httpAgent: new HttpProxyAgent(proxyUrl)
          };
        }
        
        // Try POST request first (less likely to be detected as automated)
        try {
          // Parse the URL to extract the base endpoint
          const urlObj = new URL(url);
          const baseUrl = `${urlObj.protocol}//${urlObj.hostname}${urlObj.pathname}`;
          
          // Extract search params from URL for POST body
          const searchParams: Record<string, string> = {};
          urlObj.searchParams.forEach((value, key) => {
            searchParams[key] = value;
          });
          
          console.log(`Using POST request to ${baseUrl}`);
          
          // Make POST request with enhanced browser-like headers and form data
          const response = await axios.post(baseUrl, searchParams, {
            headers: {
              ...headers,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: status => status < 500,
            ...proxyConfig
          });
          
          // Parse the HTML response with cheerio
          const $ = cheerio.load(response.data);
          const pageResults: any[] = [];
          
          // Find all search result containers
          // These selectors target Google search result elements
          $('div.g, .Gx5Zad, .tF2Cxc, .yuRUbf, div[data-hveid]').each((index, element) => {
            // Find title and link elements within each result
            const titleEl = $(element).find('h3').first();
            const linkEl = $(element).find('a').first();
            const snippetEl = $(element).find('.VwiC3b, .lEBKkf, div[data-snc], .st').first();
            
            if (titleEl.length && linkEl.length) {
              const title = titleEl.text().trim();
              const link = linkEl.attr('href');
              const snippet = snippetEl.text().trim() || '';
              
              // Only add valid results
              if (title && link && link.startsWith('http')) {
                pageResults.push({
                  title,
                  link,
                  snippet,
                  position: index + 1,
                  source: 'google-http-post'
                });
              }
            }
          });
          
          console.log(`Found ${pageResults.length} results with POST request on page ${currentPage + 1}`);
          
          // Filter out duplicate results and add to the results array
          for (const result of pageResults) {
            if (allResults.some(r => r.link === result.link)) continue;
            allResults.push(result);
            
            // Stop if we've reached the limit
            if (allResults.length >= limit) break;
          }
          
          // If no results on this page, break the loop
          if (pageResults.length === 0) {
            throw new Error('No results found with POST request, falling back to GET');
          }
          
          // Check if there's a next page button
          const hasNextPage = $('#pnnext, a.pn').length > 0;
          if (!hasNextPage) {
            console.log('No more results pages found');
            break;
          }
          
        } catch (postError: any) {
          // If POST request fails, fall back to GET
          console.error('POST request failed:', postError.message || 'Unknown error');
          console.log('Falling back to GET request method...');
          
          // Fall back to traditional GET request
          const response = await axios.get(url, {
            headers,
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: status => status < 500,
            ...proxyConfig
          });
          
          // Parse the HTML response with cheerio
          const $ = cheerio.load(response.data);
          const pageResults: any[] = [];
          
          // Find all search result containers with more varied selectors
          $('div.g, .Gx5Zad, .tF2Cxc, .yuRUbf, div[data-hveid], .MjjYud > div').each((index, element) => {
            // Find title and link elements within each result
            const titleEl = $(element).find('h3').first();
            const linkEl = $(element).find('a[href^="http"]').first();
            const snippetEl = $(element).find('.VwiC3b, .lEBKkf, div[data-snc], .st, .DVO7oe').first();
            
            if (titleEl.length && linkEl.length) {
              const title = titleEl.text().trim();
              const link = linkEl.attr('href');
              const snippet = snippetEl.text().trim() || '';
              
              // Only add valid results
              if (title && link && link.startsWith('http')) {
                pageResults.push({
                  title,
                  link,
                  snippet,
                  position: index + 1,
                  source: 'google-http-get'
                });
              }
            }
          });
          
          console.log(`Found ${pageResults.length} results with GET request on page ${currentPage + 1}`);
          
          // Add unique results to the array
          for (const result of pageResults) {
            if (allResults.some(r => r.link === result.link)) continue;
            allResults.push(result);
            
            // Stop if we've reached the limit
            if (allResults.length >= limit) break;
          }
          
          // If no results found in this page, break the loop
          if (pageResults.length === 0) break;
          
          // Check if there's a next page button
          const hasNextPage = $('#pnnext, a.pn').length > 0;
          if (!hasNextPage) {
            console.log('No more results pages found');
            break;
          }
        }
        
        // Add a delay between pages to avoid detection
        if (currentPage < maxPages - 1) {
          const delay = 3000 + Math.floor(Math.random() * 5000);
          console.log(`Waiting ${delay}ms before loading next page...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      } catch (pageError) {
        console.error(`Error scraping page ${currentPage + 1}:`, pageError);
        // Continue to next page even if this one fails
      }
    }
    
    console.log(`Successfully scraped ${allResults.length} Google results for query: "${query}"`);
    return allResults;
    
  } catch (error) {
    console.error(`Error in HTTP Google scraping:`, error);
    return [];
  }
};

/**
 * Find similar websites using HTTP requests with POST method
 */
export const getSimilarWebsitesWithHttp = async (domain: string): Promise<string[]> => {
  console.log(`Finding similar websites for domain: ${domain} using HTTP scraping`);
  const domainName = domain.replace(/^www\./, '');
  
  try {
    // Create a list of search queries to find competitors
    const competitorQueries = [
      `competitors of ${domainName}`,
      `sites like ${domainName}`,
      `alternatives to ${domainName}`,
      `companies similar to ${domainName}`
    ];
    
    const allCompetitors: string[] = [];
    
    // Try each competitor query, stop once we find enough results
    for (const query of competitorQueries) {
      if (allCompetitors.length >= 15) break;
      
      console.log(`Searching for: ${query}`);
      
      try {
        // Format the query and create the URL with randomized parameters
        const formattedQuery = encodeURIComponent(query);
        
        // Use different Google domains to avoid patterns
        const googleDomains = [
          'https://www.google.com',
          'https://www.google.co.uk',
          'https://www.google.ca'
        ];
        const domain = googleDomains[Math.floor(Math.random() * googleDomains.length)];
        
        // Randomize search parameters
        const possibleParams = ['hl=en', 'gl=us', 'pws=0', 'filter=0', 'nfpr=1', 'ie=UTF-8', 'safe=off'];
        const randomParams = possibleParams
          .filter(() => Math.random() > 0.5)
          .join('&');
        
        // Build base URL and search params for POST
        const baseUrl = `${domain}/search`;
        const searchParams: Record<string, string> = {
          q: formattedQuery,
          num: '30'
        };
        
        // Add randomized params
        randomParams.split('&').forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            searchParams[key] = value;
          }
        });
        
        // Get realistic headers and a proxy
        const headers = generateRealisticHeaders();
        const proxy = getRandomHttpProxy();
        let proxyConfig = {};
        
        // Configure proxy if available
        if (proxy) {
          console.log(`Using proxy ${proxy.host}:${proxy.port} for HTTP request`);
          const proxyUrl = `http://${proxy.host}:${proxy.port}`;
          proxyConfig = {
            proxy: false,
            httpAgent: new HttpProxyAgent(proxyUrl)
          };
        }
        
        // Try POST request first (less likely to be detected)
        try {
          console.log(`Using POST request to find similar websites to ${domainName}`);
          
          // Make POST request with enhanced browser-like headers and form data
          const response = await axios.post(baseUrl, searchParams, {
            headers: {
              ...headers,
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: status => status < 500,
            ...proxyConfig
          });
          
          // Parse the HTML response with cheerio
          const $ = cheerio.load(response.data);
          const competitors: string[] = [];
          
          // Find all links in the search results
          $('a[href^="http"]').each((_, element) => {
            try {
              const href = $(element).attr('href');
              if (!href) return;
              
              // Skip Google's own links and the domain we're analyzing
              if (href.includes('google.com') || href.includes(domainName)) return;
              
              // Extract domain name
              const extractedDomain = extractDomain(href).toLowerCase();
              
              // Skip if already in results
              if (competitors.includes(extractedDomain)) return;
              
              competitors.push(extractedDomain);
            } catch (e) {
              // Skip invalid URLs
              return;
            }
          });
          
          console.log(`Found ${competitors.length} possible competitors using POST for query: "${query}"`);
          
          // Add unique competitors to our list
          for (const comp of competitors) {
            if (!allCompetitors.includes(comp) && comp !== domainName) {
              allCompetitors.push(comp);
            }
          }
          
        } catch (postError: any) {
          // If POST request fails, fall back to GET
          console.error('POST request failed:', postError.message || 'Unknown error');
          console.log('Falling back to GET request for similar websites...');
          
          // Construct URL for GET request
          const url = `${domain}/search?q=${formattedQuery}&num=30&${randomParams}`;
          
          // Make GET request
          const response = await axios.get(url, {
            headers,
            timeout: 30000,
            maxRedirects: 5,
            validateStatus: status => status < 500,
            ...proxyConfig
          });
          
          // Parse the HTML response with cheerio
          const $ = cheerio.load(response.data);
          const competitors: string[] = [];
          
          // Find all links in the search results
          $('a[href^="http"]').each((_, element) => {
            try {
              const href = $(element).attr('href');
              if (!href) return;
              
              // Skip Google's own links and the domain we're analyzing
              if (href.includes('google.com') || href.includes(domainName)) return;
              
              // Extract domain name
              const extractedDomain = extractDomain(href).toLowerCase();
              
              // Skip if already in results
              if (competitors.includes(extractedDomain)) return;
              
              competitors.push(extractedDomain);
            } catch (e) {
              // Skip invalid URLs
              return;
            }
          });
          
          console.log(`Found ${competitors.length} possible competitors using GET for query: "${query}"`);
          
          // Add unique competitors to our list
          for (const comp of competitors) {
            if (!allCompetitors.includes(comp) && comp !== domainName) {
              allCompetitors.push(comp);
            }
          }
        }
        
        // Add a delay between queries regardless of method used
        const delay = 3000 + Math.floor(Math.random() * 5000);
        await new Promise(resolve => setTimeout(resolve, delay));
        
      } catch (queryError) {
        console.error(`Error searching for: ${query}`, queryError);
        // Continue to next query
        continue;
      }
    }
    
    console.log(`Found a total of ${allCompetitors.length} competitor domains for ${domain}`);
    return allCompetitors.slice(0, 15); // Return at most 15 domains
    
  } catch (error) {
    console.error(`Error getting similar websites for ${domain}:`, error);
    return [];
  }
};