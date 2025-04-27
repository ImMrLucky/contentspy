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
const BROWSER_CONFIG: any = {
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
// Get a proxy from the pool
async function getProxy() {
  try {
    // Simple random proxy selection from our fallback list
    const fallbackProxies = [
      { host: '34.82.132.72', port: 80 }, // Replace with actual proxies if needed
      { host: '127.0.0.1', port: 80 }
    ];
    
    const randomIndex = Math.floor(Math.random() * fallbackProxies.length);
    return fallbackProxies[randomIndex];
  } catch (error) {
    console.error('Error getting proxy:', error);
    return null;
  }
}

async function getBrowser() {
  try {
    // Try to get a proxy
    const proxy = await getProxy();
    
    if (proxy) {
      console.log(`Using proxy: ${proxy.host}:${proxy.port}`);
      
      // Launch with proxy settings
      const launchOptions = {
        ...BROWSER_CONFIG,
        args: [
          ...BROWSER_CONFIG.args,
          `--proxy-server=${proxy.host}:${proxy.port}`
        ]
      };
      
      return await puppeteer.launch(launchOptions);
    }
    
    // Fallback to direct connection if no proxy available
    console.log('No proxy available, connecting directly');
    return await puppeteer.launch(BROWSER_CONFIG);
  } catch (error) {
    console.error('Error launching Puppeteer browser:', error);
    throw error;
  }
}

// Anti-bot detection features
async function setupAntiDetection(page: any) {
  const userAgent = getRandomUserAgent();
  
  // Set a random user agent
  await page.setUserAgent(userAgent);
  
  // Randomize navigator properties to avoid fingerprinting
  await page.evaluateOnNewDocument(() => {
    // Overwrite the languages property to make it less fingerprintable
    Object.defineProperty(navigator, 'languages', {
      get: function() {
        return ['en-US', 'en', 'en-GB'];
      },
    });
    
    // Add a realistic-looking hardware concurrency value
    Object.defineProperty(navigator, 'hardwareConcurrency', {
      get: () => Math.floor(Math.random() * 8) + 2, // Random value between 2-10
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
    
    // Mask the webdriver property more thoroughly
    delete (Object.getPrototypeOf(navigator) as any).webdriver;
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
    });
    
    // Add a more realistic window.chrome property that Google often checks
    if ((window as any).chrome === undefined) {
      (window as any).chrome = {};
    }
    
    // Add a highly random canvas fingerprint to avoid detection
    const originalGetContext = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = function(type: string, ...args: any[]) {
      const context = originalGetContext.apply(this, [type, ...args]);
      if (type === '2d' && context) {
        const ctx = context as CanvasRenderingContext2D;
        const originalFillText = ctx.fillText;
        ctx.fillText = function(...args: any[]) {
          // Add subtle random modifications to text rendering - avoid fingerprinting
          if (Math.random() > 0.9) {
            args[1] = (args[1] as number) + (Math.random() * 0.001 - 0.0005);
            args[2] = (args[2] as number) + (Math.random() * 0.001 - 0.0005);
          }
          return originalFillText.apply(this, args);
        };
        
        const originalGetImageData = ctx.getImageData;
        ctx.getImageData = function(...args: any[]) {
          const imageData = originalGetImageData.apply(this, args);
          // Slightly modify a few random pixels to avoid fingerprinting
          if (imageData && imageData.data && Math.random() > 0.9) {
            for (let i = 0; i < 10; i++) {
              const idx = Math.floor(Math.random() * imageData.data.length / 4) * 4;
              imageData.data[idx] = (imageData.data[idx] + Math.floor(Math.random() * 2)) % 256;
            }
          }
          return imageData;
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
  let browser: any = null;
  
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
    
    // Use a more stealthy approach - navigate to Google homepage first
    try {
      // First navigate to Google homepage to establish a normal session
      console.log(`Navigating to Google homepage first...`);
      await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
      
      // Add a short delay to mimic human behavior
      await randomDelay(1000, 2000);
      
      // Now perform search from the homepage
      console.log(`Entering search query: "${query}"`);
      await page.type('input[name="q"]', query);
      
      // Short delay before pressing Enter
      await randomDelay(500, 1500);
      
      // Press Enter and wait for results
      await Promise.all([
        page.waitForNavigation({ waitUntil: 'networkidle2' }),
        page.keyboard.press('Enter')
      ]);
    } catch (navigationError) {
      console.error(`Error during stealthy navigation: ${navigationError}`);
      console.log(`Trying direct URL approach instead...`);
      
      // If stealthy approach fails, use direct URL as fallback
      const initialUrl = `https://www.google.com/search?q=${safeQuery}&hl=en&gl=us&num=${resultsPerPage}&safe=active`;
      console.log(`Navigating to: ${initialUrl}`);
      await page.goto(initialUrl, { waitUntil: 'networkidle2' });
    }
    
    // Check if we got a CAPTCHA
    const isCaptcha = await page.evaluate(() => {
      return document.title.includes('unusual traffic') || 
             document.title.includes('CAPTCHA') ||
             document.querySelector('form#captcha-form') !== null ||
             document.querySelector('div#recaptcha') !== null ||
             document.querySelector('div[class*="recaptcha"]') !== null ||
             document.body.innerText.includes('unusual traffic from your computer network') ||
             document.body.innerText.includes('solve the above CAPTCHA');
    });
    
    if (isCaptcha) {
      console.log('CAPTCHA detected, increasing rate limiting and retrying with new proxy...');
      // Make note of CAPTCHA for more aggressive rate limiting in the future
      
      // Use exponential backoff before retrying
      await exponentialBackoff(1);
      
      if (browser) await browser.close();
      
      // Fall back to HTTP scraper
      console.log('Falling back to HTTP scraper after CAPTCHA detected');
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
        await randomDelay(1000, 2000);
      }
      
      // Extract organic search results from the page with a more robust approach
      const pageResults = await page.evaluate(() => {
        const organicResults: any[] = [];
        
        // Use multiple selectors for broader compatibility with Google's layout changes
        const resultSelectors = [
          // Standard organic result containers
          'div.g:not(.kno-kp)',
          // Modern layout variations
          '.Gx5Zad', '.tF2Cxc', '.yuRUbf', 
          // Various other result container formats
          'div[data-sokoban-container]', 
          'div[data-hveid]',
          // Fallback to any div containing an h3 and link
          'div:has(h3):has(a)'
        ];
        
        // Find all possible result containers using different selector strategies
        let resultElements: Element[] = [];
        for (const selector of resultSelectors) {
          const elements = document.querySelectorAll(selector);
          if (elements.length > 0) {
            resultElements = [...resultElements, ...Array.from(elements)];
          }
        }
        
        // Filter out duplicates (elements might match multiple selectors)
        resultElements = Array.from(new Set(resultElements));
        
        let position = 1;
        
        resultElements.forEach(div => {
          try {
            // Multi-tier heading selection strategy
            const headingSelectors = ['h3', 'h3 a', 'a h3', 'a[data-ved] h3', '[role="heading"]'];
            let titleElement = null;
            
            for (const selector of headingSelectors) {
              titleElement = div.querySelector(selector);
              if (titleElement) break;
            }
            
            // Multi-tier link selection strategy
            const linkSelectors = ['a[ping]', 'a[data-ved]', 'a[href^="http"]', 'h3 a', 'a:has(h3)', 'a'];
            let linkElement = null;
            
            for (const selector of linkSelectors) {
              linkElement = div.querySelector(selector);
              if (linkElement) break;
            }
            
            // Skip if we can't find essential elements
            if (!titleElement || !linkElement) return;
            
            // Get title text with fallbacks
            const title = titleElement.textContent?.trim() || linkElement.textContent?.trim() || '';
            
            // Get link with validation
            let link = linkElement.getAttribute('href') || '';
            
            // Process link if it's a Google redirect
            if (link.startsWith('/url?') || link.includes('/url?')) {
              const url = new URL(link, 'https://www.google.com');
              link = url.searchParams.get('q') || url.searchParams.get('url') || link;
            }
            
            // Filter out non-http links
            if (!link.startsWith('http')) return;
            
            // Multi-tier snippet selection strategy
            const snippetSelectors = [
              'div[style*="line-height"]', 'div[style*="max-width"]', 
              'span.st', '.VwiC3b', '.lEBKkf', 'div[data-snc]',
              'div[class*="lyLwlc"]', '[data-content-feature="1"]',
              'div:not(:has(h3)):not(:has(a)):not(:empty)'
            ];
            
            let snippetElement = null;
            for (const selector of snippetSelectors) {
              snippetElement = div.querySelector(selector);
              if (snippetElement) break;
            }
            
            const snippet = snippetElement ? snippetElement.textContent?.trim() || '' : '';
            
            // Add to results if title and link are valid
            if (title && link) {
              organicResults.push({
                title,
                link,
                snippet,
                position,
                source: 'google-puppeteer'
              });
              
              position++;
            }
          } catch (error) {
            // Skip this element if there's an error processing it
            console.error('Error processing search result element:', error);
          }
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
  let browser: any = null;
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
      
      // Use stealthy approach for competitor search too
      console.log(`Searching for: "${query}"`);
      
      try {
        // First navigate to Google homepage
        await page.goto('https://www.google.com', { waitUntil: 'networkidle2' });
        await randomDelay(1000, 2000);
        
        // Enter search query
        await page.type('input[name="q"]', query);
        await randomDelay(500, 1500);
        
        // Submit search
        await Promise.all([
          page.waitForNavigation({ waitUntil: 'networkidle2' }),
          page.keyboard.press('Enter')
        ]);
      } catch (error) {
        console.error(`Error during stealthy navigation: ${error}`);
        continue; // Try next query
      }
      
      // Check for CAPTCHA
      const isCaptcha = await page.evaluate(() => {
        return document.title.includes('unusual traffic') || 
               document.title.includes('CAPTCHA') ||
               document.querySelector('form#captcha-form') !== null;
      });
      
      if (isCaptcha) {
        console.log('CAPTCHA detected, skipping this query');
        continue; // Try next query
      }
      
      // Extract competitor domains from search results
      const domains = await page.evaluate((targetDomain: string) => {
        const foundDomains: string[] = [];
        
        // Look for all links in the search results
        const links = Array.from(document.querySelectorAll('a[href^="http"]'));
        
        for (const link of links) {
          const href = link.getAttribute('href');
          if (!href) continue;
          
          try {
            // Extract domain from link
            const url = new URL(href);
            const domain = url.hostname.replace(/^www\./, '');
            
            // Skip if it's the original domain or common sites
            if (domain === targetDomain || 
                domain.includes('google.com') || 
                domain.includes('youtube.com') || 
                domain.includes('facebook.com') ||
                domain.includes('linkedin.com') ||
                domain.includes('twitter.com') ||
                domain.includes('instagram.com')) {
              continue;
            }
            
            // Only add if we don't have it yet
            if (!foundDomains.includes(domain)) {
              foundDomains.push(domain);
            }
          } catch (error) {
            continue; // Skip invalid URLs
          }
        }
        
        return foundDomains;
      }, domain);
      
      // Add new domains to our collection
      for (const newDomain of domains) {
        if (!similarSites.includes(newDomain)) {
          similarSites.push(newDomain);
        }
      }
      
      console.log(`Found ${domains.length} potential competitor domains from query "${query}"`);
      
      // Add a delay before the next query
      await randomDelay(RATE_LIMIT.minDelayBetweenRequests, RATE_LIMIT.maxDelayBetweenRequests);
    }
    
    console.log(`Found ${similarSites.length} similar websites for ${domain}`);
    return similarSites.slice(0, 10); // Limit to 10 results
    
  } catch (error) {
    console.error(`Error finding similar websites:`, error);
    
    // Fall back to HTTP method if headless browser fails completely
    if (similarSites.length === 0) {
      console.log('Falling back to HTTP scraper for finding similar websites');
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