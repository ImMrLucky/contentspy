/**
 * SerpAPI Scraper
 * 
 * This module provides functionality for scraping search results using SerpAPI
 * to bypass CAPTCHA and anti-bot detection measures
 */

import axios from 'axios';
import { extractDomain } from './apiService';

// SerpAPI key is stored in environment variables
const SERPAPI_KEY = process.env.SERPAPI_KEY;

/**
 * Get search results from Google using SerpAPI
 */
export const scrapeGoogleWithSerpApi = async (query: string, limit = 200): Promise<any[]> => {
  console.log(`Using SerpAPI for query: "${query}"`);
  const allResults: any[] = [];
  
  try {
    // Calculate number of pages needed
    const resultsPerPage = 100; // SerpAPI can return up to 100 results at once
    const maxPages = Math.min(Math.ceil(limit / resultsPerPage), 3); // Cap at 3 pages max
    
    // Loop through pages
    for (let currentPage = 0; currentPage < maxPages; currentPage++) {
      if (allResults.length >= limit) break;
      
      const start = currentPage * resultsPerPage;
      console.log(`Fetching SerpAPI results page ${currentPage + 1} (results ${start + 1}-${start + resultsPerPage})`);
      
      // Construct SerpAPI URL with parameters
      const params = new URLSearchParams();
      params.append('engine', 'google');
      params.append('q', query);
      if (SERPAPI_KEY) {
        params.append('api_key', SERPAPI_KEY);
      }
      params.append('num', resultsPerPage.toString());
      params.append('start', start.toString());
      params.append('hl', 'en');
      params.append('gl', 'us'); // US results only
      
      try {
        // Make API request
        const response = await axios.get(`https://serpapi.com/search?${params.toString()}`);
        
        if (response.status === 200 && response.data) {
          const data = response.data;
          
          // Process organic results
          if (data.organic_results && Array.isArray(data.organic_results)) {
            const pageResults = data.organic_results.map((result: any, index: number) => ({
              title: result.title || '',
              link: result.link || '',
              snippet: result.snippet || '',
              position: start + index + 1,
              source: 'google-serpapi'
            }));
            
            console.log(`Found ${pageResults.length} results on page ${currentPage + 1}`);
            
            // Filter out duplicate results
            for (const result of pageResults) {
              if (allResults.some(r => r.link === result.link)) continue;
              allResults.push(result);
              
              // Stop if we've reached the limit
              if (allResults.length >= limit) break;
            }
          } else {
            console.log('No organic results found in SerpAPI response');
          }
          
          // Check if there are more results
          if (!data.serpapi_pagination || !data.serpapi_pagination.next) {
            console.log('No more results pages available');
            break;
          }
          
          // Add a delay between pages
          if (currentPage < maxPages - 1) {
            const delay = 1000 + Math.floor(Math.random() * 2000);
            console.log(`Waiting ${delay}ms before requesting next page...`);
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        } else {
          console.error(`Error in SerpAPI response: ${response.status}`);
          break;
        }
      } catch (pageError) {
        console.error(`Error fetching SerpAPI results page ${currentPage + 1}:`, pageError);
        break;
      }
    }
    
    console.log(`Successfully retrieved ${allResults.length} results using SerpAPI for query: "${query}"`);
    return allResults;
    
  } catch (error) {
    console.error(`Error using SerpAPI:`, error);
    return [];
  }
};

/**
 * Find similar websites using SerpAPI
 */
export const getSimilarWebsitesWithSerpApi = async (domain: string): Promise<string[]> => {
  console.log(`Finding similar websites for domain: ${domain} using SerpAPI`);
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
      
      // Use SerpAPI to get search results
      const searchResults = await scrapeGoogleWithSerpApi(query, 30);
      
      if (searchResults.length > 0) {
        // Extract domains from search results
        const domains = searchResults.map(result => extractDomain(result.link))
          // Filter out Google's own domains and the domain we're analyzing
          .filter(d => !d.includes('google.com') && 
                     !d.includes(domainName) && 
                     d !== domainName);
        
        // Add unique competitors
        for (const competitorDomain of domains) {
          if (!allCompetitors.includes(competitorDomain)) {
            allCompetitors.push(competitorDomain);
          }
        }
        
        console.log(`Found ${domains.length} possible competitors from query: "${query}"`);
      }
      
      // Add a delay between queries
      const delay = 1500 + Math.floor(Math.random() * 2000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    console.log(`Found a total of ${allCompetitors.length} competitor domains for ${domain}`);
    return allCompetitors.slice(0, 15); // Return at most 15 domains
    
  } catch (error) {
    console.error(`Error getting similar websites using SerpAPI for ${domain}:`, error);
    return [];
  }
};