/**
 * HTTP Scraper Services
 * 
 * This module provides functionality for scraping data using HTTP requests
 * as a fallback for environments where headless browsers aren't available
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import { getRandomUserAgent, extractDomain } from './apiService';

/**
 * Scrape Google search results using direct HTTP requests
 */
export const scrapeGoogleWithHttp = async (query: string, limit = 200): Promise<any[]> => {
  console.log(`Starting HTTP fallback scraping for query: "${query}"`);
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
      const possibleParams = ['hl=en', 'gl=us', 'pws=0', 'filter=0'];
      const selectedParams = possibleParams.filter(() => Math.random() > 0.3);
      if (selectedParams.length > 0) {
        url += '&' + selectedParams.join('&');
      }
      
      try {
        console.log(`Making HTTP request to: ${url}`);
        
        // Make HTTP request with browser-like headers
        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cookie': 'CONSENT=YES+cb.20220321-17-p0.en+FX+119;',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
          },
          timeout: 30000
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
                source: 'google-http'
              });
            }
          }
        });
        
        console.log(`Found ${pageResults.length} results on page ${currentPage + 1}`);
        
        // Filter out duplicate results and add to the results array
        for (const result of pageResults) {
          if (allResults.some(r => r.link === result.link)) continue;
          allResults.push(result);
          
          // Stop if we've reached the limit
          if (allResults.length >= limit) break;
        }
        
        // If no results on this page, break the loop
        if (pageResults.length === 0) break;
        
        // Check if there's a next page button
        const hasNextPage = $('#pnnext, a.pn').length > 0;
        if (!hasNextPage) {
          console.log('No more results pages found');
          break;
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
 * Find similar websites using HTTP requests
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
        // Format the query and create the URL
        const formattedQuery = encodeURIComponent(query);
        const url = `https://www.google.com/search?q=${formattedQuery}&num=30`;
        
        // Make HTTP request with browser-like headers
        const response = await axios.get(url, {
          headers: {
            'User-Agent': getRandomUserAgent(),
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate, br',
            'Connection': 'keep-alive',
            'Cookie': 'CONSENT=YES+cb.20220321-17-p0.en+FX+119;',
            'Upgrade-Insecure-Requests': '1',
            'Cache-Control': 'max-age=0'
          },
          timeout: 30000
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
            const domain = extractDomain(href).toLowerCase();
            
            // Skip if already in results
            if (competitors.includes(domain)) return;
            
            competitors.push(domain);
          } catch (e) {
            // Skip invalid URLs
            return;
          }
        });
        
        console.log(`Found ${competitors.length} possible competitors from query: "${query}"`);
        
        // Add unique competitors to our list
        for (const comp of competitors) {
          if (!allCompetitors.includes(comp) && comp !== domainName) {
            allCompetitors.push(comp);
          }
        }
        
        // Add a delay between queries
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