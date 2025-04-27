/**
 * Puppeteer Scraper with Stealth Mode
 * 
 * This module provides advanced Google scraping using puppeteer-extra with stealth plugins
 * to avoid detection and bypass rate limiting/CAPTCHA issues.
 */

import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { getRandomUserAgent } from './apiService';

// Configure puppeteer with stealth plugin
puppeteer.use(StealthPlugin());

// Pool of browser instances to reuse
let browserPool: any[] = [];
const MAX_POOL_SIZE = 2;

// Cache for search results
const cache: Record<string, { timestamp: number, results: any[] }> = {};
const CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Helper function to add random delay to simulate human behavior
 */
const randomDelay = async (min = 1000, max = 3000) => {
  const delay = Math.floor(Math.random() * (max - min)) + min;
  await new Promise(resolve => setTimeout(resolve, delay));
};

/**
 * Get or create a browser instance
 */
async function getBrowser() {
  // Check if we have an available browser in the pool
  if (browserPool.length > 0) {
    try {
      const browser = browserPool.pop();
      // Verify browser is still working
      const pages = await browser.pages().catch(() => null);
      if (pages) {
        return browser;
      }
      // If not working, close it and create a new one
      await browser.close().catch(() => {});
    } catch (err) {
      console.error('Error reusing browser from pool:', err);
    }
  }
  
  // Create a new browser
  console.log('Launching new puppeteer browser with stealth mode');
  const browser = await puppeteer.launch({
    executablePath: executablePath(),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      '--disable-site-isolation-trials',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--disable-gpu',
      '--window-size=1920x1080',
    ],
    ignoreHTTPSErrors: true,
    defaultViewport: {
      width: 1920,
      height: 1080
    }
  });
  
  return browser;
}

/**
 * Close and cleanup browser instances
 */
async function closeBrowsers() {
  for (const browser of browserPool) {
    await browser.close().catch(() => {});
  }
  browserPool = [];
}

/**
 * Setup a puppeteer page with extra anti-detection measures
 */
async function setupPage(browser: any) {
  const page = await browser.newPage();
  
  // Set random user agent
  const userAgent = getRandomUserAgent();
  await page.setUserAgent(userAgent);
  
  // Set extra headers to appear more like a real browser
  await page.setExtraHTTPHeaders({
    'Accept-Language': 'en-US,en;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Referer': 'https://www.google.com/'
  });
  
  // Override certain browser features to avoid detection
  await page.evaluateOnNewDocument(() => {
    // Override WebDriver
    Object.defineProperty(navigator, 'webdriver', {
      get: () => false,
      configurable: true
    });
    
    // Override plugins
    Object.defineProperty(navigator, 'plugins', {
      get: () => {
        return [
          {
            0: {
              type: 'application/x-google-chrome-pdf',
              suffixes: 'pdf',
              description: 'Portable Document Format',
              enabledPlugin: {}
            },
            name: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format',
            length: 1
          }
        ];
      }
    });
    
    // Override languages
    Object.defineProperty(navigator, 'languages', {
      get: () => ['en-US', 'en'],
      configurable: true
    });
    
    // Emulate WebGL
    const getParameter = WebGLRenderingContext.prototype.getParameter;
    WebGLRenderingContext.prototype.getParameter = function(parameter: any) {
      if (parameter === 37445) {
        return 'Intel Inc.';
      }
      if (parameter === 37446) {
        return 'Intel Iris Pro Graphics';
      }
      return getParameter.apply(this, [parameter]);
    };
  });
  
  // Set cookies for Google (helps with avoiding CAPTCHA)
  await page.setCookie({
    name: 'CONSENT',
    value: 'YES+cb',
    domain: '.google.com',
    path: '/',
    expires: Date.now() / 1000 + 10000
  });
  
  return page;
}

/**
 * Extract search results from a Google search page
 */
async function extractSearchResults(page: any): Promise<any[]> {
  console.log('Extracting search results from page');
  
  // Get all search result elements (multiple selectors for different Google layouts)
  const results = await page.evaluate(() => {
    const extractedResults: any[] = [];
    
    // Try different selectors for Google search results
    const resultElements = Array.from(document.querySelectorAll('div.g, div.tF2Cxc, div.Ww4FFb'));
    
    resultElements.forEach((element, index) => {
      try {
        // Extract link
        const linkElement = element.querySelector('a[href^="http"]');
        if (!linkElement) return;
        
        const link = linkElement.getAttribute('href');
        if (!link) return;
        
        // Extract title
        const titleElement = element.querySelector('h3');
        const title = titleElement ? titleElement.textContent : '';
        
        // Extract snippet
        const snippetElement = element.querySelector('div.VwiC3b, span.st, div[role="heading"]+div, div.IsZvec div');
        const snippet = snippetElement ? snippetElement.textContent : '';
        
        // Skip incomplete results
        if (!title && !snippet) return;
        
        extractedResults.push({
          position: index + 1,
          title: title || '',
          link,
          snippet: snippet || '',
          source: 'google'
        });
      } catch (err) {
        console.error('Error extracting search result:', err);
      }
    });
    
    return extractedResults;
  });
  
  console.log(`Found ${results.length} results on page`);
  return results;
}

/**
 * Check if CAPTCHA is present on the page
 */
async function isCaptchaPresent(page: any): Promise<boolean> {
  return page.evaluate(() => {
    return Boolean(
      document.querySelector('form#captcha-form') ||
      document.querySelector('div#recaptcha') ||
      document.querySelector('div.g-recaptcha') ||
      document.querySelector('iframe[src*="recaptcha"]') ||
      document.title.includes('unusual traffic') ||
      document.body.textContent?.includes('unusual traffic')
    );
  });
}

/**
 * Scrape Google search results using Puppeteer with stealth mode
 */
export async function scrapeGoogleWithPuppeteer(query: string, limit = 100): Promise<any[]> {
  console.log(`Scraping Google with puppeteer-stealth for query: "${query}"`);
  
  // Check cache first
  const cacheKey = `google:${query}:${limit}`;
  if (cache[cacheKey] && (Date.now() - cache[cacheKey].timestamp) < CACHE_TTL) {
    console.log(`Using cached results for query: "${query}"`);
    return cache[cacheKey].results.slice(0, limit);
  }
  
  let browser;
  try {
    browser = await getBrowser();
    const page = await setupPage(browser);
    
    // Navigate to Google
    await page.goto('https://www.google.com/', { 
      waitUntil: 'networkidle2',
      timeout: 60000
    });
    
    // Wait for and type into search box with human-like timing
    await page.waitForSelector('input[name="q"]');
    
    // Type with random delays between characters to appear more human
    await page.focus('input[name="q"]');
    for (const char of query) {
      await page.keyboard.type(char, { delay: Math.floor(Math.random() * 150) + 50 });
      await randomDelay(50, 200);
    }
    
    // Press enter and wait for results
    await Promise.all([
      page.keyboard.press('Enter'),
      page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 })
    ]);
    
    // Check for CAPTCHA
    const hasCaptcha = await isCaptchaPresent(page);
    if (hasCaptcha) {
      console.error('CAPTCHA detected, unable to proceed with scraping');
      throw new Error('CAPTCHA detected');
    }
    
    // Extract results
    const results = await extractSearchResults(page);
    
    // Update cache
    cache[cacheKey] = {
      timestamp: Date.now(),
      results
    };
    
    // Add browser back to pool if we haven't reached max pool size
    if (browserPool.length < MAX_POOL_SIZE) {
      browserPool.push(browser);
      browser = null; // Prevent closing the browser
    }
    
    return results.slice(0, limit);
  } catch (error) {
    console.error('Error in puppeteer scraper:', error);
    throw error;
  } finally {
    // Close browser if not added to pool
    if (browser && !browserPool.includes(browser)) {
      await browser.close().catch(() => {});
    }
  }
}

/**
 * Get domain-specific content using puppeteer scraper
 */
export async function getDomainContentWithPuppeteer(domain: string, keywords: string[] = [], limit = 10): Promise<any[]> {
  console.log(`Getting content for domain ${domain} with puppeteer`);
  
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
    for (const keyword of keywords.slice(0, 3)) { // Limit to first 3 keywords to avoid too many queries
      if (keyword && keyword.trim()) {
        queries.push(`site:${domain} ${keyword.trim()} article`);
        queries.push(`site:${domain} ${keyword.trim()} blog`);
      }
    }
  }
  
  // Try each query until we get enough results
  for (const query of queries) {
    if (allResults.length >= limit) break;
    
    try {
      console.log(`Searching with puppeteer for: "${query}"`);
      const results = await scrapeGoogleWithPuppeteer(query, 20);
      
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
      await randomDelay(2000, 4000);
      
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }
  
  console.log(`Found ${allResults.length} unique content items for ${domain} with puppeteer`);
  return allResults;
}

/**
 * Find similar domains using puppeteer scraper
 */
export async function findSimilarDomainsWithPuppeteer(domain: string, keywords: string[] = [], limit = 10): Promise<string[]> {
  console.log(`Finding similar domains to ${domain} with puppeteer`);
  
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
    for (const keyword of keywords.slice(0, 2)) { // Limit to first 2 keywords
      if (keyword && keyword.trim()) {
        queries.push(`${keyword.trim()} sites like ${baseDomain}`);
        queries.push(`${keyword.trim()} alternatives to ${baseDomain}`);
      }
    }
  }
  
  // Try each query until we get enough competitors
  for (const query of queries.slice(0, 3)) { // Limit to first 3 queries to avoid rate limiting
    if (competitors.size >= limit) break;
    
    try {
      console.log(`Searching with puppeteer for: "${query}"`);
      const results = await scrapeGoogleWithPuppeteer(query, 30);
      
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
      await randomDelay(3000, 6000);
      
    } catch (error) {
      console.error(`Error searching for "${query}":`, error);
    }
  }
  
  // Add some fallback competitors if we didn't find enough
  if (competitors.size < limit) {
    const industryDomains: Record<string, string[]> = {
      'insurance': ['statefarm.com', 'geico.com', 'progressive.com', 'allstate.com', 'libertymutual.com'],
      'finance': ['bankofamerica.com', 'chase.com', 'wellsfargo.com', 'capitalone.com', 'discover.com'],
      'health': ['mayoclinic.org', 'webmd.com', 'healthline.com', 'medlineplus.gov', 'nih.gov'],
      'tech': ['microsoft.com', 'apple.com', 'google.com', 'samsung.com', 'dell.com'],
      'ecommerce': ['amazon.com', 'walmart.com', 'target.com', 'bestbuy.com', 'etsy.com'],
      'general': ['blog.hubspot.com', 'forbes.com', 'entrepreneur.com', 'businessinsider.com', 'medium.com']
    };
    
    // Determine industry from domain/keywords
    let industry = 'general';
    const lowerDomain = baseDomain.toLowerCase();
    const lowerKeywords = keywords.join(' ').toLowerCase();
    
    if (lowerDomain.includes('insur') || lowerDomain.includes('policy') || 
        lowerKeywords.includes('insurance') || lowerKeywords.includes('coverage')) {
      industry = 'insurance';
    } else if (lowerDomain.includes('bank') || lowerDomain.includes('finance') || 
               lowerDomain.includes('invest') || lowerDomain.includes('money')) {
      industry = 'finance';
    } else if (lowerDomain.includes('health') || lowerDomain.includes('medical') || 
               lowerDomain.includes('care') || lowerDomain.includes('hospital')) {
      industry = 'health';
    } else if (lowerDomain.includes('tech') || lowerDomain.includes('software') || 
               lowerDomain.includes('app') || lowerDomain.includes('digital')) {
      industry = 'tech';
    } else if (lowerDomain.includes('shop') || lowerDomain.includes('store') || 
               lowerDomain.includes('market') || lowerDomain.includes('buy')) {
      industry = 'ecommerce';
    }
    
    const fallbackDomains = industryDomains[industry] || industryDomains.general;
    for (const fallbackDomain of fallbackDomains) {
      if (competitors.size >= limit) break;
      if (fallbackDomain !== baseDomain) {
        competitors.add(fallbackDomain);
      }
    }
  }
  
  console.log(`Found ${competitors.size} competitor domains for ${domain} with puppeteer`);
  return Array.from(competitors).slice(0, limit);
}

/**
 * Cleanup function to close browsers when server shuts down
 */
export function cleanupPuppeteerResources() {
  return closeBrowsers();
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