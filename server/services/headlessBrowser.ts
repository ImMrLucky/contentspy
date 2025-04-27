/**
 * Headless Browser Services
 * 
 * This module provides functionality for scraping data using Puppeteer headless browser
 */

import puppeteer from 'puppeteer';
import { getRandomUserAgent } from './apiService';

/**
 * Scrape Google search results using a headless browser
 */
export const scrapeGoogleWithHeadlessBrowser = async (query: string, limit = 200): Promise<any[]> => {
  console.log(`Starting Puppeteer headless browser for query: "${query}"`);
  const allResults: any[] = [];
  let browser = null;
  
  try {
    // Launch a headless browser with stealth mode settings
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--disable-extensions',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--disable-gpu'
      ]
    });
    
    // Create a new browser page
    const page = await browser.newPage();
    
    // Use a random viewport size
    const viewportSizes = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 }
    ];
    const viewport = viewportSizes[Math.floor(Math.random() * viewportSizes.length)];
    await page.setViewport(viewport);
    
    // Set user agent and other browser headers
    await page.setUserAgent(getRandomUserAgent());
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    });
    
    // Set cookies to bypass Google consent screen
    await page.setCookie({
      name: 'CONSENT',
      value: 'YES+cb.20220321-17-p0.en+FX+119',
      domain: '.google.com',
    });
    
    // Define the maximum number of pages to scrape
    const maxPages = Math.min(Math.ceil(limit / 10), 20); // Cap at 20 pages max
    
    // Loop through Google search result pages
    for (let currentPage = 0; currentPage < maxPages; currentPage++) {
      if (allResults.length >= limit) break;
      
      // Calculate start position for Google search pagination
      const start = currentPage * 10;
      console.log(`Scraping Google search page ${currentPage + 1} (results ${start + 1}-${start + 10})`);
      
      // Create URL with params to look like a real search
      const formattedQuery = encodeURIComponent(query);
      let url = `https://www.google.com/search?q=${formattedQuery}&start=${start}&num=10`;
      
      // Add some randomized parameters to look more natural
      const possibleParams = ['hl=en', 'gl=us', 'pws=0', 'filter=0'];
      const selectedParams = possibleParams.filter(() => Math.random() > 0.3);
      if (selectedParams.length > 0) {
        url += '&' + selectedParams.join('&');
      }
      
      // Navigate to Google search URL
      try {
        console.log(`Navigating to: ${url}`);
        await page.goto(url, { 
          waitUntil: 'networkidle2',
          timeout: 30000
        });
        
        // Add a small random delay to simulate human browsing
        const delay1 = 2000 + Math.floor(Math.random() * 3000);
        await new Promise(resolve => setTimeout(resolve, delay1));
        
        // Check for and handle Google consent/cookie popup if present
        try {
          const consentButtons = [
            'button[id="L2AGLb"]', // "I agree" button
            'button[aria-label="Accept all"]',
            'button:contains("I agree")',
            'button:contains("Accept")'
          ];
          
          for (const selector of consentButtons) {
            const button = await page.$(selector);
            if (button) {
              console.log('Found consent button, clicking it...');
              await button.click();
              await new Promise(resolve => setTimeout(resolve, 1500));
              break;
            }
          }
        } catch (consentError) {
          console.log('No consent button found or error clicking it');
        }
        
        // Extract search results
        const pageResults = await page.evaluate(() => {
          const results: any[] = [];
          
          // Find all search result containers
          const resultElements = document.querySelectorAll('div.g, .Gx5Zad, .tF2Cxc, .yuRUbf, div[data-hveid]');
          
          resultElements.forEach((el, index) => {
            // Find title and link elements
            const titleEl = el.querySelector('h3');
            const linkEl = el.querySelector('a');
            const snippetEl = el.querySelector('.VwiC3b, .lEBKkf, div[data-snc], .st');
            
            if (titleEl && linkEl) {
              const title = titleEl.textContent?.trim();
              const link = linkEl.getAttribute('href');
              const snippet = snippetEl?.textContent?.trim() || '';
              
              // Only add valid results
              if (title && link && link.startsWith('http')) {
                results.push({
                  title,
                  link,
                  snippet,
                  position: index + 1,
                  source: 'google-browser'
                });
              }
            }
          });
          
          return results;
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
        
        // Find next page button - if not found, stop paginating
        const hasNextPage = await page.evaluate(() => {
          // Look for the next page button
          const nextButton = document.querySelector('#pnnext, a.pn');
          return !!nextButton;
        });
        
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
    console.error(`Error in headless browser Google scraping:`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
      console.log('Browser closed successfully');
    }
  }
};

/**
 * Find similar websites using a headless browser
 */
export const getSimilarWebsitesWithHeadlessBrowser = async (domain: string): Promise<string[]> => {
  console.log(`Finding similar websites for domain: ${domain} using headless browser scraping`);
  const domainName = domain.replace(/^www\./, '');
  let browser = null;
  
  try {
    // Create a list of search queries to find competitors
    const competitorQueries = [
      `competitors of ${domainName}`,
      `sites like ${domainName}`,
      `alternatives to ${domainName}`,
      `companies similar to ${domainName}`
    ];
    
    // Launch a headless browser
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-infobars',
        '--window-position=0,0',
        '--ignore-certificate-errors',
        '--disable-extensions',
        '--disable-dev-shm-usage'
      ]
    });
    
    // Create a new browser page with random viewport
    const page = await browser.newPage();
    
    // Set a random viewport size
    const viewportSizes = [
      { width: 1366, height: 768 },
      { width: 1920, height: 1080 },
      { width: 1536, height: 864 },
      { width: 1440, height: 900 }
    ];
    const viewport = viewportSizes[Math.floor(Math.random() * viewportSizes.length)];
    await page.setViewport(viewport);
    
    // Set user agent and other browser headers
    await page.setUserAgent(getRandomUserAgent());
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'
    });
    
    // Set cookies to bypass Google consent screen
    await page.setCookie({
      name: 'CONSENT',
      value: 'YES+cb.20220321-17-p0.en+FX+119',
      domain: '.google.com',
    });
    
    const allCompetitors: string[] = [];
    
    // Try each competitor query, stop once we find enough results
    for (const query of competitorQueries) {
      if (allCompetitors.length >= 15) break;
      
      console.log(`Searching for: ${query}`);
      
      // Navigate to Google with the search query
      const formattedQuery = encodeURIComponent(query);
      await page.goto(`https://www.google.com/search?q=${formattedQuery}&num=30`, {
        waitUntil: 'networkidle2',
        timeout: 30000
      });
      
      // Wait a moment to ensure page is loaded
      const delay2 = 2000 + Math.floor(Math.random() * 2000);
      await new Promise(resolve => setTimeout(resolve, delay2));
      
      // Extract domain names from search results
      const competitors = await page.evaluate((searchDomain) => {
        const results: string[] = [];
        
        // Find all search result links
        const links = Array.from(document.querySelectorAll('a[href^="http"]'));
        
        for (const link of links) {
          try {
            const href = link.getAttribute('href');
            if (!href) continue;
            
            // Skip Google's own links and the domain we're analyzing
            if (href.includes('google.com') || 
                href.includes(searchDomain)) continue;
            
            // Extract domain name
            const url = new URL(href);
            let domain = url.hostname.toLowerCase();
            
            // Remove www. prefix
            domain = domain.replace(/^www\./, '');
            
            // Skip if already in results
            if (results.includes(domain)) continue;
            
            results.push(domain);
          } catch (e) {
            // Skip invalid URLs
            continue;
          }
        }
        
        return results;
      }, domainName);
      
      console.log(`Found ${competitors.length} possible competitors from query: "${query}"`);
      
      // Add unique competitors to our list
      for (const comp of competitors) {
        if (!allCompetitors.includes(comp) && comp !== domainName) {
          allCompetitors.push(comp);
        }
      }
      
      // Add a random delay between queries
      const delay3 = 3000 + Math.floor(Math.random() * 5000);
      await new Promise(resolve => setTimeout(resolve, delay3));
    }
    
    console.log(`Found a total of ${allCompetitors.length} competitor domains for ${domain}`);
    return allCompetitors.slice(0, 15); // Return at most 15 domains
    
  } catch (error) {
    console.error(`Error getting similar websites for ${domain}:`, error);
    return [];
  } finally {
    if (browser) {
      await browser.close();
    }
  }
};