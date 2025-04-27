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
    
    // Configure Chrome options with advanced anti-detection measures
    const chromeOptions = new ChromeOptions();
    
    // Generate random viewport dimensions (realistic desktop sizes)
    const width = 1100 + Math.floor(Math.random() * 800); // 1100-1900
    const height = 700 + Math.floor(Math.random() * 400); // 700-1100
    
    // Add enhanced browser flags to appear more like a regular user
    chromeOptions.addArguments(
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--disable-blink-features=AutomationControlled',
      '--disable-extensions',
      '--disable-notifications',
      `--window-size=${width},${height}`,
      `--user-agent=${userAgent}`,
      '--disable-web-security', // Helps with some CAPTCHA scenarios
      '--disable-features=IsolateOrigins,site-per-process', // Disables site isolation
      '--disable-site-isolation-trials',
      '--disable-features=BlockInsecurePrivateNetworkRequests',
      `--disable-setuid-sandbox`,
      '--disable-infobars',
      '--lang=en-US,en;q=0.9',
      '--disable-gpu', // Sometimes helps with CAPTCHA detection
      `--use-fake-ui-for-media-stream`,
      '--disable-popup-blocking'
    );

    // Add experimental settings to evade detection more effectively
    // Cast to any to avoid TypeScript errors with these experimental options
    (chromeOptions as any).setExperimentalOption('excludeSwitches', ['enable-automation', 'enable-logging']);
    (chromeOptions as any).setExperimentalOption('useAutomationExtension', false);
    
    // Add more detailed user preferences to appear more human-like
    const prefs = {
      'intl.accept_languages': 'en-US,en;q=0.9',
      'profile.default_content_setting_values.notifications': 2,
      'credentials_enable_service': false,
      'profile.password_manager_enabled': false,
      'profile.default_content_setting_values.cookies': Math.random() > 0.2 ? 1 : 2, // Usually accept cookies
      'profile.cookie_controls_mode': 0,
      'profile.default_content_setting_values.images': 1,
      'profile.default_content_setting_values.javascript': 1,
      'profile.default_content_setting_values.plugins': 1,
      'profile.default_content_setting_values.popups': Math.random() > 0.7 ? 1 : 2,
      'profile.default_content_setting_values.geolocation': Math.random() > 0.5 ? 1 : 2,
      'profile.default_content_setting_values.media_stream': Math.random() > 0.5 ? 1 : 2,
      'profile.managed_default_content_settings.images': 1,
      'profile.managed_default_content_settings.javascript': 1,
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
    
    // Add enhanced anti-detection script after page loads
    await driver.executeScript(`
      // Advanced anti-detection measures
      
      // 1. Mask WebDriver property - most important anti-detection measure
      Object.defineProperty(navigator, 'webdriver', {
        get: () => false,
        configurable: true
      });
      
      // 2. Mock permissions API with more realistic behavior
      if (navigator.permissions) {
        const originalQuery = navigator.permissions.query;
        navigator.permissions.query = (parameters) => {
          if (parameters.name === 'notifications') {
            return Promise.resolve({ state: 'prompt', onchange: null });
          }
          return originalQuery(parameters);
        };
      }
      
      // 3. Add fake plugins that real browsers have
      const oldPlugins = navigator.plugins;
      Object.defineProperty(navigator, 'plugins', {
        get: () => [].slice.call(oldPlugins).concat([
          {
            name: 'Chrome PDF Plugin',
            filename: 'internal-pdf-viewer',
            description: 'Portable Document Format'
          },
          {
            name: 'Chrome PDF Viewer',
            filename: 'mhjfbmdgcfjbbpaeojofohoefgiehjai',
            description: 'Portable Document Format'
          },
          {
            name: 'Native Client',
            filename: 'internal-nacl-plugin',
            description: 'Native Client'
          }
        ]),
        enumerable: true
      });
      
      // 4. Languages with proper formatting and enumeration
      Object.defineProperty(navigator, 'languages', {
        get: () => ['en-US', 'en'],
        enumerable: true
      });
      
      // 5. Add detailed chrome object that matches real browsers
      if (!window.chrome) {
        window.chrome = {};
      }
      
      // Create a realistic chrome object structure
      window.chrome = {
        ...window.chrome,
        runtime: {
          ...(window.chrome.runtime || {}),
          connect: function() {},
          sendMessage: function() {}
        },
        loadTimes: function() {},
        csi: function() { return { startE: Date.now(), onloadT: Date.now(), pageT: Date.now(), tran: 15 }; },
        app: {
          isInstalled: false,
          getDetails: function() {},
          getIsInstalled: function() {}
        }
      };
      
      // 6. Add WebGL properties to make fingerprinting less reliable
      if (window.WebGLRenderingContext) {
        const getParameter = WebGLRenderingContext.prototype.getParameter;
        WebGLRenderingContext.prototype.getParameter = function(parameter) {
          // Add noise to WebGL fingerprinting parameters
          if (parameter === 37445) {
            return 'Google Inc. (Intel)'; // Random vendor
          }
          if (parameter === 37446) {
            return 'ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11 vs_5_0 ps_5_0, D3D11)'; // Random renderer
          }
          return getParameter.apply(this, arguments);
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
 * Helper function to add randomized human-like delays with natural variation
 */
async function randomDelay(min: number, max: number) {
  // Add slight randomization to make delays more natural and less predictable
  const baseDelay = Math.floor(Math.random() * (max - min + 1)) + min;
  
  // Sometimes add a small additional random variation (simulates human inconsistency)
  const extraVariation = Math.random() > 0.7 ? Math.floor(Math.random() * 200) : 0;
  const delay = baseDelay + extraVariation;
  
  console.log(`Adding human-like delay: ${delay}ms`);
  await new Promise(resolve => setTimeout(resolve, delay));
}

/**
 * Enhanced human-like typing function with realistic timing and occasional mistakes
 */
async function humanTypeInto(element: WebElement, text: string) {
  // Determine if we'll simulate a typing error (10% chance)
  const makeTypingError = Math.random() < 0.1;
  
  // Choose typing style - sometimes humans type in whole words, sometimes character by character
  // This makes the typing pattern less predictable and more realistic
  const typingStyle = Math.random();
  
  let chunks = [];
  
  if (typingStyle < 0.3) {
    // Type character by character (slow, careful typist)
    chunks = text.split('');
  } else if (typingStyle < 0.7) {
    // Type in small chunks of 2-4 characters (average typist)
    chunks = text.match(/.{1,4}|.+/g) || [];
  } else {
    // Type in word chunks (fast typist)
    chunks = text.split(' ').map(word => word + ' ');
  }
  
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    
    // Type current chunk with variable speed
    const typingVariation = Math.random() > 0.7 ? 1.5 : 1.0; // Sometimes type slower
    await element.sendKeys(chunk);
    
    // Variable delay between typing chunks - faster typists have shorter delays
    const minDelay = typingStyle < 0.3 ? 100 : typingStyle < 0.7 ? 60 : 30;
    const maxDelay = typingStyle < 0.3 ? 300 : typingStyle < 0.7 ? 200 : 150;
    await randomDelay(minDelay * typingVariation, maxDelay * typingVariation);
    
    // Simulate typing error and correction (only in middle of text, not at the end)
    if (makeTypingError && i < chunks.length - 2 && i > 0 && chunk.length > 0) {
      // Make an error by typing a random character
      const errorChar = String.fromCharCode(97 + Math.floor(Math.random() * 26)); // Random a-z
      await element.sendKeys(errorChar);
      await randomDelay(300, 700); // Pause to "notice" error
      
      // Delete the error using backspace
      await element.sendKeys(Key.BACK_SPACE);
      await randomDelay(200, 400); // Pause after correction
    }
  }
  
  // Sometimes add a pause at the end (human thinking before submitting)
  if (Math.random() > 0.7) {
    await randomDelay(500, 1200);
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
    const err = error as Error;
    if (err.message && err.message.includes('CAPTCHA')) {
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
    const err = error as Error;
    console.error('Error in Selenium similar websites search:', err.message || err);
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