/**
 * Headless Browser Services
 * 
 * This module provides functionality for scraping using Puppeteer headless browser
 * with advanced rate limiting and anti-detection measures.
 */

import puppeteer from 'puppeteer';
import { getRandomUserAgent } from './apiService';
import { scrapeGoogleWithHttp, getSimilarWebsitesWithHttp } from './httpScraper';

// Rate limiting configuration
const RATE_LIMIT = {
  // Time between requests (randomized)
  minDelayBetweenRequests: 3000, // 3 seconds minimum
  maxDelayBetweenRequests: 8000, // 8 seconds maximum
  
  // Time between search pages
  minDelayBetweenPages: 5000,    // 5 seconds minimum
  maxDelayBetweenPages: 10000,   // 10 seconds maximum
  
  // Exponential backoff for retries
  baseRetryDelay: 10000,         // 10 seconds initial backoff
  maxRetries: 3,                 // Maximum number of retries

  // Maximum requests in time period
  maxRequestsPerHour: 20,        // Maximum Google searches per hour
  requestsHourlyWindow: 3600000, // 1 hour in ms
};

// Track request history for rate limiting
const requestHistory = {
  timestamps: [] as number[],
  
  // Add a request timestamp and clean up old ones
  addRequest() {
    const now = Date.now();
    this.timestamps.push(now);
    // Remove timestamps older than our window
    this.timestamps = this.timestamps.filter(
      t => (now - t) < RATE_LIMIT.requestsHourlyWindow
    );
  },
  
  // Check if we've hit our rate limit
  isRateLimited() {
    return this.timestamps.length >= RATE_LIMIT.maxRequestsPerHour;
  },
  
  // Get time to wait until we can make another request
  getTimeToWait() {
    if (!this.isRateLimited()) return 0;
    
    // Sort timestamps and find when the oldest will expire
    const sortedTimes = [...this.timestamps].sort((a, b) => a - b);
    const oldestTime = sortedTimes[0];
    return oldestTime + RATE_LIMIT.requestsHourlyWindow - Date.now();
  }
};

// Constants for browser configuration
const BROWSER_CONFIG: puppeteer.LaunchOptions = {
  headless: true, // Use headless mode
  args: [
    '--no-sandbox',
    '--disable-setuid-sandbox',
    '--disable-dev-shm-usage',
    '--disable-accelerated-2d-canvas',
    '--disable-gpu',
    '--disable-extensions',
    '--disable-background-networking',
    '--disable-default-apps',
    '--disable-sync',
    '--disable-translate',
    '--hide-scrollbars',
    '--metrics-recording-only',
    '--mute-audio',
    '--no-first-run',
    '--safebrowsing-disable-auto-update',
    '--disable-features=site-per-process,TranslateUI,BlinkGenPropertyTrees'
  ],
  defaultViewport: {
    width: 1280,
    height: 800
  },
  ignoreHTTPSErrors: true,
  timeout: 30000 // 30 seconds timeout
};

// Helper function to get a new browser instance
async function getBrowser() {
  try {
    return await puppeteer.launch(BROWSER_CONFIG);
  } catch (error) {
    console.error('Error launching Puppeteer browser:', error);
    throw error;
  }
}

// Anti-bot detection features
async function setupAntiDetection(page: puppeteer.Page) {
  const userAgent = getRandomUserAgent();
  
  // Set a random user agent
  await page.setUserAgent(userAgent);
  
  // Randomize navigator properties to avoid fingerprinting
  await page.evaluateOnNewDocument(() => {
    // Overwrite the languages property to make it less fingerprintable
    Object.defineProperty(navigator, 'languages', {
      get: function() {
        return ['en-US', 'en'];
      },
    });
    
    // Modify plugins length to appear more like a regular browser
    Object.defineProperty(navigator, 'plugins', {
      get: function() {
        return [1, 2, 3, 4, 5].map(() => {
          return {
            name: `Plugin ${Math.random().toString(36).substring(7)}`,
            description: `Random plugin ${Math.random().toString(36).substring(7)}`,
            filename: `plugin_${Math.random().toString(36).substring(7)}.dll`,
            length: Math.floor(Math.random() * 10) + 1
          };
        });
      },
    });
    
    // Mask the webdriver property
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Add a fake canvas fingerprint based on common patterns
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
      const context = originalGetContext.apply(this, [type, ...args]);
      if (type === '2d') {
        const originalFillText = context.fillText;
        context.fillText = function(...args: any[]) {
          return originalFillText.apply(this, args);
        };
        
        const originalGetImageData = context.getImageData;
        context.getImageData = function(...args: any[]) {
          return originalGetImageData.apply(this, args);
        };
      }
      return context;
    };
  });
  
  // Set cookies to appear more like a regular browser session
  const initialCookies = [
    { name: 'NID', value: `${Math.random().toString(36).substring(2)}`, domain: '.google.com', path: '/' },
    { name: 'CONSENT', value: 'YES+', domain: '.google.com', path: '/' }
  ];
  
  await page.setCookie(...initialCookies);
}

/**
 * Scrape Google search results using Puppeteer headless browser
 */
// Helper function for random delay within range
const randomDelay = (min: number, max: number): Promise<void> => {
  const delay = Math.floor(min + Math.random() * (max - min));
  console.log(`Adding random delay of ${delay}ms...`);
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Helper function for exponential backoff with jitter
const exponentialBackoff = async (attempt: number): Promise<void> => {
  if (attempt <= 0) return;
  
  const baseDelay = RATE_LIMIT.baseRetryDelay;
  const maxDelay = baseDelay * Math.pow(2, attempt);
  const actualDelay = Math.floor(Math.random() * maxDelay);
  
  console.log(`Exponential backoff: attempt ${attempt}, waiting ${actualDelay}ms`);
  await new Promise(resolve => setTimeout(resolve, actualDelay));
};

export const scrapeGoogleWithHeadlessBrowser = async (query: string, limit = 200): Promise<any[]> => {
  console.log(`Puppeteer: Scraping Google for query: "${query}"`);
  const results: any[] = [];
  let browser: puppeteer.Browser | null = null;
  
  // Check if we're being rate limited
  if (requestHistory.isRateLimited()) {
    const waitTime = requestHistory.getTimeToWait();
    console.log(`Rate limit reached. Need to wait ${Math.ceil(waitTime/1000)} seconds before making another request.`);
    console.log(`Falling back to HTTP scraper to avoid waiting.`);
    return scrapeGoogleWithHttp(query, limit);
  }
  
  // Track this request for rate limiting
  requestHistory.addRequest();
  
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Set up anti-detection measures
    await setupAntiDetection(page);
    
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(60000); // 60 seconds
    
    // Calculate how many pages we need to scrape based on limit
    const resultsPerPage = 10; // Google shows 10 results per page by default
    const pagesToScrape = Math.min(Math.ceil(limit / resultsPerPage), 20); // Max 20 pages
    
    console.log(`Will scrape up to ${pagesToScrape} Google result pages`);
    
    // Create a URL with decreased risk of triggering CAPTCHA
    const safeQuery = encodeURIComponent(query);
    
    // Navigate to first page of results
    const initialUrl = `https://www.google.com/search?q=${safeQuery}&hl=en&gl=us&num=${resultsPerPage}&safe=active`;
    console.log(`Navigating to: ${initialUrl}`);
    
    await page.goto(initialUrl, { waitUntil: 'networkidle2' });
    
    // Check if we got a CAPTCHA
    const isCaptcha = await page.evaluate(() => {
      return document.title.includes('unusual traffic') || 
             document.querySelector('form#captcha-form') !== null ||
             document.querySelector('div:contains("captcha")') !== null;
    });
    
    if (isCaptcha) {
      console.log('CAPTCHA detected, falling back to HTTP scraper');
      if (browser) await browser.close();
      
      // Fall back to HTTP scraper
      return scrapeGoogleWithHttp(query, limit);
    }
    
    // Loop through multiple pages of search results if needed
    for (let pageNum = 0; pageNum < pagesToScrape; pageNum++) {
      if (results.length >= limit) break;
      
      if (pageNum > 0) {
        // Navigate to next page
        console.log(`Navigating to Google search results page ${pageNum + 1}`);
        
        // Use the "next" button to get to the next page
        const nextButton = await page.$('a#pnnext');
        if (!nextButton) {
          console.log('No more result pages available');
          break;
        }
        
        // Click next button and wait for results to load
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          nextButton.click()
        ]);
        
        // Add a small delay between page loads
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      }
      
      // Extract organic search results from the page
      const pageResults = await page.evaluate(() => {
        const organicResults: any[] = [];
        
        // Target organic result elements
        const resultDivs = document.querySelectorAll('div.g:not(.kno-kp)');
        
        let position = organicResults.length + 1;
        
        resultDivs.forEach(div => {
          // Skip if this doesn't look like a standard organic result
          if (!div.querySelector('h3') || !div.querySelector('a')) {
            return;
          }
          
          // Extract information
          const titleElement = div.querySelector('h3');
          const linkElement = div.querySelector('a');
          
          // Skip if we can't find essential elements
          if (!titleElement || !linkElement) return;
          
          const title = titleElement.textContent || '';
          const link = linkElement.getAttribute('href') || '';
          
          // Filter out non-http links
          if (!link.startsWith('http')) return;
          
          // Extract snippet text
          const snippetElement = div.querySelector('div[style*="line-height"]') || 
                                 div.querySelector('div[style*="max-width"]') || 
                                 div.querySelector('span.st');
          const snippet = snippetElement ? snippetElement.textContent || '' : '';
          
          organicResults.push({
            title,
            link,
            snippet,
            position
          });
          
          position++;
        });
        
        return organicResults;
      });
      
      if (pageResults.length > 0) {
        console.log(`Found ${pageResults.length} results on page ${pageNum + 1}`);
        
        // Add results from this page to our collection, avoiding duplicates
        for (const result of pageResults) {
          if (!results.some(r => r.link === result.link)) {
            results.push(result);
            
            // Break if we've reached the limit
            if (results.length >= limit) break;
          }
        }
      } else {
        console.log(`No results found on page ${pageNum + 1}, stopping pagination`);
        break;
      }
      
      // Add a significant random delay between page scrapes to avoid rate limiting
      if (pageNum < pagesToScrape - 1) {
        // Use our rate limit configuration for the delay between pages
        await randomDelay(
          RATE_LIMIT.minDelayBetweenPages, 
          RATE_LIMIT.maxDelayBetweenPages
        );
      }
    }
    
    console.log(`Successfully retrieved ${results.length} results using Puppeteer`);
    return results;
    
  } catch (error) {
    console.error(`Error in Puppeteer Google scraping:`, error);
    
    // If headless browser fails completely, try the HTTP method as fallback
    if (results.length === 0) {
      console.log('Falling back to HTTP scraper');
      return scrapeGoogleWithHttp(query, limit);
    }
    
    return results;
  } finally {
    // Clean up browser
    if (browser) {
      await browser.close();
    }
  }
};

/**
 * Find similar websites using Puppeteer headless browser
 */
export const getSimilarWebsitesWithHeadlessBrowser = async (domain: string): Promise<string[]> => {
  console.log(`Puppeteer: Finding similar websites for domain: ${domain}`);
  let browser: puppeteer.Browser | null = null;
  const similarSites: string[] = [];
  
  // Check if we're being rate limited
  if (requestHistory.isRateLimited()) {
    const waitTime = requestHistory.getTimeToWait();
    console.log(`Rate limit reached. Need to wait ${Math.ceil(waitTime/1000)} seconds before making another request.`);
    console.log(`Falling back to HTTP scraper to avoid waiting.`);
    return getSimilarWebsitesWithHttp(domain);
  }
  
  // Track this request for rate limiting
  requestHistory.addRequest();
  
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    
    // Set up anti-detection measures
    await setupAntiDetection(page);
    
    // Set default navigation timeout
    page.setDefaultNavigationTimeout(60000); // 60 seconds
    
    // Create a list of search queries to find competitors
    const competitorQueries = [
      `competitors of ${domain}`,
      `sites like ${domain}`,
      `alternatives to ${domain}`,
      `companies similar to ${domain}`
    ];
    
    // Try each competitor query, stop once we find enough results
    for (const query of competitorQueries) {
      if (similarSites.length >= 15) break;
      
      // Search for the query on Google
      console.log(`Searching for: "${query}"`);
      const safeQuery = encodeURIComponent(query);
      const searchUrl = `https://www.google.com/search?q=${safeQuery}&hl=en&gl=us&num=20`;
      
      // Navigate to search results
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Check if we got a CAPTCHA
      const isCaptcha = await page.evaluate(() => {
        return document.title.includes('unusual traffic') || 
               document.querySelector('form#captcha-form') !== null ||
               document.querySelector('div:contains("captcha")') !== null;
      });
      
      if (isCaptcha) {
        console.log('CAPTCHA detected, trying next query or falling back');
        continue;
      }
      
      // Extract domains from search results
      const extractedDomains = await page.evaluate((targetDomain) => {
        const domains: string[] = [];
        
        // Get all links on the page
        const links = Array.from(document.querySelectorAll('a'));
        
        links.forEach(link => {
          const href = link.getAttribute('href') || '';
          if (!href.startsWith('http')) return;
          
          try {
            // Extract domain from URL
            const url = new URL(href);
            let domain = url.hostname;
            
            // Normalize domain (remove www. prefix)
            domain = domain.replace(/^www\./, '');
            
            // Filter out Google's own domains and the domain we're analyzing
            if (domain.includes('google.com') || domain === targetDomain) {
              return;
            }
            
            // Filter out common non-competitor domains
            const excludedDomains = [
              'wikipedia.org', 'twitter.com', 'facebook.com', 'linkedin.com',
              'instagram.com', 'youtube.com', 'pinterest.com', 'reddit.com', 
              'quora.com', 'medium.com', 'github.com', 'mozilla.org'
            ];
            
            if (excludedDomains.some(excluded => domain.includes(excluded))) {
              return;
            }
            
            // Add domain if it's not already in the list
            if (!domains.includes(domain)) {
              domains.push(domain);
            }
          } catch (error) {
            // Skip invalid URLs
          }
        });
        
        return domains;
      }, domain);
      
      // Add unique domains to our collection
      for (const extractedDomain of extractedDomains) {
        if (!similarSites.includes(extractedDomain)) {
          similarSites.push(extractedDomain);
        }
      }
      
      console.log(`Found ${extractedDomains.length} potential competitors from query: "${query}"`);
      
      // Add a significant random delay between queries to avoid rate limiting
      await randomDelay(
        RATE_LIMIT.minDelayBetweenRequests, 
        RATE_LIMIT.maxDelayBetweenRequests
      );
    }
    
    console.log(`Successfully found ${similarSites.length} similar websites for ${domain}`);
    return similarSites.slice(0, 15); // Return at most 15 domains
    
  } catch (error) {
    console.error(`Error finding similar websites with Puppeteer:`, error);
    
    // If Puppeteer fails completely, try the HTTP method as fallback
    if (similarSites.length === 0) {
      console.log('Falling back to HTTP scraper');
      return getSimilarWebsitesWithHttp(domain);
    }
    
    return similarSites;
  } finally {
    // Clean up browser
    if (browser) {
      await browser.close();
    }
  }
};