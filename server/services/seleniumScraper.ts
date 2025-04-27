/**
 * Selenium Scraper Service
 * 
 * This module provides advanced web scraping capabilities using Selenium WebDriver
 * which is more effective at bypassing CAPTCHA and rate limiting compared to Puppeteer.
 */

import { Builder, By, Key, until, WebDriver, WebElement } from 'selenium-webdriver';
import { Options as ChromeOptions } from 'selenium-webdriver/chrome';
import { getRandomUserAgent } from './apiService';

// Rate limiting configuration - more conservative to avoid detection
const RATE_LIMIT = {
  // Time between requests (randomized)
  minDelayBetweenRequests: 5000,  // 5 seconds minimum
  maxDelayBetweenRequests: 15000, // 15 seconds maximum
  
  // Time between search pages
  minDelayBetweenPages: 8000,     // 8 seconds minimum
  maxDelayBetweenPages: 20000,    // 20 seconds maximum
  
  // Time to wait after CAPTCHA detection before retry
  captchaBackoffDelay: 30000,     // 30 seconds
  
  // Maximum requests in time period
  maxRequestsPerHour: 10,         // Maximum Google searches per hour
  requestsHourlyWindow: 3600000,  // 1 hour in ms
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

// Get a proxy from the pool
async function getProxy() {
  try {
    // Simple proxy rotation system
    const fallbackProxies = [
      { host: '34.82.132.72', port: 80 },
      { host: '127.0.0.1', port: 80 }
    ];
    
    const randomIndex = Math.floor(Math.random() * fallbackProxies.length);
    return fallbackProxies[randomIndex];
  } catch (error) {
    console.error('Error getting proxy:', error);
    return null;
  }
}

/**
 * Create a Selenium WebDriver instance with anti-detection measures
 */
async function createDriver() {
  try {
    // Get a user agent and proxy
    const userAgent = getRandomUserAgent();
    const proxy = await getProxy();
    
    // Configure Chrome options with anti-detection measures
    const chromeOptions = new ChromeOptions();
    
    // Add basic browser flags for stability
    chromeOptions.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--disable-notifications',
      '--window-size=1920,1080',
      `--user-agent=${userAgent}`
    );

    // Add experimental settings to evade detection
    chromeOptions.setExperimentalOption('excludeSwitches', ['enable-automation']);
    chromeOptions.setExperimentalOption('useAutomationExtension', false);
    
    // Add random preferences to mimic real user browser settings
    const prefs = {
      'intl.accept_languages': 'en-US,en',
      'profile.default_content_setting_values.notifications': 2,
      'credentials_enable_service': false,
      'profile.password_manager_enabled': false,
      // Random time zone to prevent fingerprinting
      'profile.default_content_setting_values.geolocation': Math.random() > 0.5 ? 1 : 2,
    };
    chromeOptions.setUserPreferences(prefs);
    
    // Add proxy if available
    if (proxy) {
      console.log(`Using proxy ${proxy.host}:${proxy.port} with Selenium`);
      chromeOptions.addArguments(`--proxy-server=${proxy.host}:${proxy.port}`);
    }
    
    // Create the WebDriver with our options
    const driver = await new Builder()
      .forBrowser('chrome')
      .setChromeOptions(chromeOptions)
      .build();
    
    // Add anti-detection script after page loads
    await driver.executeScript(`
      // Overwrite webdriver properties
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });
      
      // Mock permissions API if it exists
      if (navigator.permissions) {
        navigator.permissions.query = (parameters) => {
          return Promise.resolve({ state: 'granted', onchange: null });
        };
      }
      
      // Modify navigator properties to appear more human
      const oldPlugins = navigator.plugins;
      Object.defineProperty(navigator, 'plugins', {
        get: () => [].slice.call(oldPlugins).concat([{
          name: 'Chrome PDF Plugin',
          filename: 'internal-pdf-viewer',
          description: 'Portable Document Format'
        }])
      });
      
      // Make navigator.languages ennumerable again
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        enumerable: true
      });
      
      // Add a fake chrome object if it doesn't exist
      if (!window.chrome) {
        window.chrome = {
          runtime: {}
        };
      }
    `);
    
    return driver;
  } catch (error) {
    console.error('Error creating Selenium driver:', error);
    throw error;
  }
}

/**
 * Helper function to add randomized human-like delays
 */
async function randomDelay(min: number, max: number) {
  const delay = Math.floor(Math.random() * (max - min + 1)) + min;
  console.log(`Adding human-like delay: ${delay}ms`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Human-like typing function with realistic timing
 */
async function humanTypeInto(element: WebElement, text: string) {
  // Split text into chunks to simulate natural typing patterns
  const chunks = text.match(/.{1,4}|.+/g) || [];
  
  for (const chunk of chunks) {
    // Type each chunk with a random delay
    await element.sendKeys(chunk);
    // Random delay between typing chunks (60-250ms)
    await randomDelay(60, 250);
  }
}

/**
 * Helper function to detect if Google is showing a CAPTCHA
 */
async function isCaptchaPresent(driver: WebDriver): Promise<boolean> {
  try {
    // Check multiple indicators of CAPTCHA presence
    const pageSource = await driver.getPageSource();
    const pageTitle = await driver.getTitle();
    
    // Direct CAPTCHA checks
    const captchaIndicators = [
      'unusual traffic', 
      'CAPTCHA', 
      'captcha-form',
      'recaptcha',
      'solve the above CAPTCHA',
      'robot',
      'automated software',
      'suspicious activity'
    ];
    
    // Check page title for CAPTCHA indicators
    if (captchaIndicators.some(indicator => pageTitle.includes(indicator))) {
      return true;
    }
    
    // Check page content for CAPTCHA indicators
    if (captchaIndicators.some(indicator => pageSource.includes(indicator))) {
      return true;
    }
    
    // Check for specific CAPTCHA elements
    try {
      const captchaForm = await driver.findElements(By.css('form#captcha-form'));
      if (captchaForm.length > 0) return true;
      
      const recaptcha = await driver.findElements(By.css('div#recaptcha, div.g-recaptcha'));
      if (recaptcha.length > 0) return true;
    } catch (e) {
      // Element not found, that's okay
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for CAPTCHA:', error);
    // If we can't check properly, assume no CAPTCHA to continue trying
    return false;
  }
}

/**
 * Scrape Google search results using Selenium
 */
export async function scrapeGoogleWithSelenium(query: string, limit = 200): Promise<any[]> {
  console.log(`Selenium: Scraping Google for query: "${query}"`);
  let driver: WebDriver | null = null;
  const results: any[] = [];
  
  // Check if we're being rate limited
  if (requestHistory.isRateLimited()) {
    const waitTime = requestHistory.getTimeToWait();
    console.log(`Rate limit reached. Need to wait ${Math.ceil(waitTime/1000)} seconds.`);
    console.log(`Continuing with limited scraping...`);
  }
  
  // Track this request for rate limiting
  requestHistory.addRequest();
  
  try {
    // Create a new driver
    driver = await createDriver();
    
    // Calculate number of pages needed based on limit (Google shows ~10 results per page)
    const resultsPerPage = 10;
    const maxPages = Math.min(Math.ceil(limit / resultsPerPage), 20); // Max 20 pages
    
    // Use a multi-step approach to mimic real user behavior
    
    // Step 1: Navigate to Google homepage
    console.log('Navigating to Google homepage');
    await driver.get('https://www.google.com');
    await randomDelay(1500, 3000);
    
    // Step 2: Check if we need to accept cookies consent (varies by region)
    try {
      const consentButtons = await driver.findElements(By.css('button[id*="consent"]'));
      if (consentButtons.length > 0) {
        console.log('Accepting Google cookies consent');
        await consentButtons[0].click();
        await randomDelay(1000, 2000);
      }
    } catch (error) {
      // Consent dialog may not appear, continue
    }
    
    // Step 3: Look for search input and type query with human-like timing
    try {
      console.log(`Typing search query: "${query}"`);
      const searchInput = await driver.findElement(By.name('q'));
      await humanTypeInto(searchInput, query);
      
      // Random delay before pressing Enter (like a human thinking before submitting)
      await randomDelay(800, 1500);
      await searchInput.sendKeys(Key.RETURN);
      
      // Wait for search results to load
      await driver.wait(until.elementLocated(By.css('div[data-hveid], div.g, .yuRUbf, h3')), 10000);
      await randomDelay(1500, 3000);
    } catch (error) {
      console.error('Error during search input:', error);
      
      // Try direct URL approach as fallback
      const safeQuery = encodeURIComponent(query);
      await driver.get(`https://www.google.com/search?q=${safeQuery}`);
      await randomDelay(2000, 4000);
    }
    
    // Step 4: Check for CAPTCHA before proceeding
    if (await isCaptchaPresent(driver)) {
      console.log('CAPTCHA detected on initial Google search');
      throw new Error('CAPTCHA detected');
    }
    
    // Step 5: Iterate through search result pages and extract results
    for (let pageNum = 0; pageNum < maxPages; pageNum++) {
      if (results.length >= limit) break;
      
      if (pageNum > 0) {
        console.log(`Navigating to search results page ${pageNum + 1}`);
        
        // Find and click the "Next" button
        try {
          const nextButton = await driver.findElement(By.id('pnnext'));
          
          // Scroll to the next button with a slight pause (human-like)
          await driver.executeScript('arguments[0].scrollIntoView({behavior: "smooth", block: "center"});', nextButton);
          await randomDelay(500, 1500);
          
          await nextButton.click();
          
          // Wait for results to load
          await driver.wait(until.elementLocated(By.css('div[data-hveid], div.g, .yuRUbf, h3')), 10000);
          await randomDelay(2000, 4000);
          
          // Check for CAPTCHA again after page navigation
          if (await isCaptchaPresent(driver)) {
            console.log(`CAPTCHA detected on page ${pageNum + 1}`);
            break; // Stop pagination, use what we have so far
          }
        } catch (error) {
          console.log('No more result pages or error navigating to next page');
          break;
        }
      }
      
      // Extract search results from the current page
      try {
        console.log(`Extracting results from page ${pageNum + 1}`);
        
        // Use multiple selectors to find result elements
        const resultElements = await driver.findElements(
          By.css('div.g:not(.kno-kp), .Gx5Zad, .tF2Cxc, .yuRUbf, div[data-hveid], div[data-sokoban-container]')
        );
        
        console.log(`Found ${resultElements.length} potential result elements`);
        
        // Process each result
        for (const element of resultElements) {
          try {
            // Extract title element
            let titleElement = null;
            try {
              titleElement = await element.findElement(By.css('h3'));
            } catch (e) {
              // Try alternative selectors
              try {
                titleElement = await element.findElement(By.css('[role="heading"]'));
              } catch (e2) {
                // No title found, skip this element
                continue;
              }
            }
            
            // Extract link element
            let linkElement = null;
            try {
              linkElement = await element.findElement(By.css('a[ping], a[href^="http"], a[data-ved], h3 a, a'));
            } catch (e) {
              // No link found, skip this element
              continue;
            }
            
            // Get title text
            const title = await titleElement.getText();
            if (!title) continue;
            
            // Get link URL
            let link = await linkElement.getAttribute('href');
            if (!link || !link.startsWith('http')) continue;
            
            // Extract description/snippet
            let snippet = '';
            try {
              const snippetElement = await element.findElement(
                By.css('div[style*="line-height"], div[style*="max-width"], .VwiC3b, span.st, .lEBKkf')
              );
              snippet = await snippetElement.getText();
            } catch (e) {
              // Snippet is optional
            }
            
            // Add to results if not already present
            if (!results.some(r => r.link === link)) {
              results.push({
                title,
                link,
                snippet,
                position: results.length + 1,
                source: 'google-selenium'
              });
              
              // Break if we've reached the limit
              if (results.length >= limit) break;
            }
          } catch (elementError) {
            // Skip problematic elements
            console.error('Error processing result element:', elementError);
          }
        }
        
        console.log(`Extracted ${results.length} total results so far`);
        
        // Add human-like delay between page scraping
        if (pageNum < maxPages - 1 && results.length < limit) {
          await randomDelay(
            RATE_LIMIT.minDelayBetweenPages,
            RATE_LIMIT.maxDelayBetweenPages
          );
        }
      } catch (pageError) {
        console.error(`Error extracting results from page ${pageNum + 1}:`, pageError);
      }
    }
    
    console.log(`Successfully scraped ${results.length} Google results using Selenium`);
    return results;
  } catch (error) {
    console.error('Error in Selenium Google scraping:', error);
    
    // If we hit a CAPTCHA, wait longer before subsequent requests
    if (error.message.includes('CAPTCHA')) {
      console.log(`CAPTCHA detected, implementing longer backoff period`);
      await randomDelay(RATE_LIMIT.captchaBackoffDelay, RATE_LIMIT.captchaBackoffDelay * 1.5);
    }
    
    return results; // Return any results we managed to get
  } finally {
    // Always close the driver to clean up resources
    if (driver) {
      try {
        await driver.quit();
      } catch (e) {
        console.error('Error closing Selenium driver:', e);
      }
    }
  }
}

/**
 * Find similar websites using Selenium
 */
export async function getSimilarWebsitesWithSelenium(domain: string): Promise<string[]> {
  console.log(`Selenium: Finding similar websites for domain: ${domain}`);
  let driver: WebDriver | null = null;
  const similarSites: string[] = [];
  
  // Check if we're being rate limited
  if (requestHistory.isRateLimited()) {
    const waitTime = requestHistory.getTimeToWait();
    console.log(`Rate limit reached. Need to wait ${Math.ceil(waitTime/1000)} seconds.`);
    console.log(`Continuing with limited scraping...`);
  }
  
  // Track this request for rate limiting
  requestHistory.addRequest();
  
  try {
    // Create a new driver
    driver = await createDriver();
    
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
      
      console.log(`Searching for: "${query}"`);
      
      try {
        // Navigate to Google homepage
        await driver.get('https://www.google.com');
        await randomDelay(1500, 3000);
        
        // Type query with human-like timing
        const searchInput = await driver.findElement(By.name('q'));
        await humanTypeInto(searchInput, query);
        
        // Random delay before pressing Enter
        await randomDelay(800, 1500);
        await searchInput.sendKeys(Key.RETURN);
        
        // Wait for search results to load
        await driver.wait(until.elementLocated(By.css('div[data-hveid], div.g, .yuRUbf, h3')), 10000);
        await randomDelay(1500, 3000);
        
        // Check for CAPTCHA
        if (await isCaptchaPresent(driver)) {
          console.log(`CAPTCHA detected for query "${query}", skipping to next query`);
          continue;
        }
        
        // Extract links from the search results page
        const links = await driver.findElements(By.css('a[href^="http"]'));
        
        // Process each link to extract domains
        for (const link of links) {
          try {
            const href = await link.getAttribute('href');
            if (!href) continue;
            
            // Extract domain from the URL
            try {
              const url = new URL(href);
              const extractedDomain = url.hostname.replace(/^www\./, '');
              
              // Skip if it's the original domain or common sites
              if (extractedDomain === domain || 
                  extractedDomain.includes('google.com') || 
                  extractedDomain.includes('youtube.com') || 
                  extractedDomain.includes('facebook.com') ||
                  extractedDomain.includes('linkedin.com') ||
                  extractedDomain.includes('twitter.com') ||
                  extractedDomain.includes('instagram.com')) {
                continue;
              }
              
              // Only add if we don't have it yet
              if (!similarSites.includes(extractedDomain)) {
                similarSites.push(extractedDomain);
              }
            } catch (urlError) {
              // Invalid URL, skip it
              continue;
            }
          } catch (linkError) {
            // Skip problematic links
            continue;
          }
        }
        
        console.log(`Found ${similarSites.length} competitor domains so far`);
        
        // Add a delay before the next query
        if (similarSites.length < 15 && competitorQueries.indexOf(query) < competitorQueries.length - 1) {
          await randomDelay(
            RATE_LIMIT.minDelayBetweenRequests,
            RATE_LIMIT.maxDelayBetweenRequests
          );
        }
      } catch (queryError) {
        console.error(`Error searching for "${query}":`, queryError);
        continue; // Try next query
      }
    }
    
    console.log(`Found total of ${similarSites.length} similar websites for ${domain}`);
    return similarSites.slice(0, 10); // Limit to 10 results
  } catch (error) {
    console.error('Error in Selenium similar websites search:', error);
    return similarSites; // Return any results we managed to get
  } finally {
    // Always close the driver to clean up resources
    if (driver) {
      try {
        await driver.quit();
      } catch (e) {
        console.error('Error closing Selenium driver:', e);
      }
    }
  }
}