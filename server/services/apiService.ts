/**
 * API Service - Provides functionality for scraping and analyzing content
 */

import axios from 'axios';
import * as cheerio from 'cheerio';
import natural from 'natural';
import { HttpProxyAgent } from 'http-proxy-agent';
import { 
  scrapeGoogleWithHeadlessBrowser, 
  getSimilarWebsitesWithHeadlessBrowser 
} from './headlessBrowser';
import {
  scrapeGoogleWithHttp,
  getSimilarWebsitesWithHttp
} from './httpScraper';
import {
  scrapeGoogleWithSelenium,
  getSimilarWebsitesWithSelenium
} from './seleniumScraper';
import {
  scrapeGoogleWithPython,
  getSimilarWebsitesWithPython
} from './pythonBridge';
// Import default export from free-proxy
import ProxyList from 'free-proxy';

// For caching search results
interface CacheEntry {
  timestamp: number;
  results: any[];
}

// Define proxy interface
interface Proxy {
  host: string;
  port: number;
  protocols: string[];
  lastUsed: number;
  failCount: number;
  country: string;
}

// Maps to hold proxies and cache
const availableProxies: Proxy[] = [];
const searchCache = new Map<string, CacheEntry>();

// Constants for proxy management
const CACHE_LIFETIME = 3600000; // 1 hour cache lifetime
const PROXY_FETCH_INTERVAL = 1800000; // 30 minutes
let lastProxyFetch = 0;
let isInitializingProxies = false;

// Utility function for random delay
const randomDelay = (min: number, max: number): Promise<void> => {
  const delay = min + Math.floor(Math.random() * (max - min));
  return new Promise(resolve => setTimeout(resolve, delay));
};

// Utility function for exponential backoff with full jitter
const exponentialBackoff = async (attempt: number, baseDelay: number, factor = 2, maxAttempts = 5): Promise<boolean> => {
  if (attempt >= maxAttempts) return false;
  
  // Calculate exponential delay with full jitter
  const maxDelay = baseDelay * Math.pow(factor, attempt);
  const delay = Math.floor(Math.random() * maxDelay);
  
  console.log(`Exponential backoff: Attempt ${attempt + 1}/${maxAttempts}, waiting ${delay}ms`);
  await new Promise(resolve => setTimeout(resolve, delay));
  
  return true;
};

// Utility function to cache search results
const cacheResults = (key: string, results: any[]): void => {
  searchCache.set(key, {
    timestamp: Date.now(),
    results: [...results]
  });
};

// Utility function to get cached results
const getCachedResults = (key: string): any[] | null => {
  const entry = searchCache.get(key);
  if (!entry) return null;
  
  // Check if cache is still valid
  if (Date.now() - entry.timestamp < CACHE_LIFETIME) {
    return [...entry.results];
  }
  
  // Cache expired, remove it
  searchCache.delete(key);
  return null;
};

// List of user agents to rotate
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.46',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/117.0',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.60',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Edge/18.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 OPR/102.0.0.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/118.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.61',
  'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36 OPR/102.0.0.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 Edg/117.0.2045.47',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/109.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.57',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5.2 Safari/605.1.15',
  'Mozilla/5.0 (X11; Linux x86_64; rv:109.0) Gecko/20100101 Firefox/117.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/116.0',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36 Edg/118.0.2088.69',
  'Mozilla/5.0 (Windows NT 6.1; Win64; x64; rv:109.0) Gecko/20100101 Firefox/115.0',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15 Edg/118.0.2088.76',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:109.0) Gecko/20100101 Firefox/116.0',
  'Mozilla/5.0 (Windows NT 10.0; rv:109.0) Gecko/20100101 Firefox/119.0',
  'Mozilla/5.0 (Windows NT 10.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/99.0.7113.93 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Linux; Android 13; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/117.0.0.0 Mobile Safari/537.36',
  'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Mobile Safari/537.36'
];

// Function to get a random user agent from the list
export const getRandomUserAgent = () => {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
};

// Initialize ProxyList instance
const freeProxyClient = new ProxyList();

// Function to refresh the proxy list
const refreshProxyList = async (): Promise<void> => {
  if (Date.now() - lastProxyFetch < PROXY_FETCH_INTERVAL) {
    console.log('Proxy list was refreshed recently, skipping refresh');
    return;
  }
  
  if (isInitializingProxies) {
    console.log('Proxy refresh already in progress, skipping');
    return;
  }
  
  isInitializingProxies = true;
  console.log('Refreshing proxy list...');
  
  try {
    // Try to get proxies from free-proxy
    const newProxies: Proxy[] = [];
    
    try {
      // Try to get some proxies from free-proxy (up to 30)
      // @ts-ignore - Type definitions don't match implementation
      const proxyStrings = await freeProxyClient.get(30);
      
      if (Array.isArray(proxyStrings) && proxyStrings.length > 0) {
        console.log(`Found ${proxyStrings.length} proxies from free-proxy`);
        
        // Process each proxy string
        // @ts-ignore - Type definitions don't match implementation
        proxyStrings.forEach((proxyItem: any) => {
          try {
            // Depending on what the API actually returns, handle either string or object format
            let host: string;
            let portStr: string;
            
            if (typeof proxyItem === 'string') {
              // If API returns strings in format 'host:port'
              [host, portStr] = proxyItem.split(':');
            } else if (proxyItem && typeof proxyItem === 'object') {
              // If API returns objects with ip and port properties
              host = proxyItem.ip || '';
              portStr = proxyItem.port || '';
            } else {
              // Skip invalid items
              return;
            }
            
            const port = parseInt(String(portStr), 10);
            
            if (host && !isNaN(port)) {
              newProxies.push({
                host,
                port,
                protocols: ['https', 'http'],
                lastUsed: 0,
                failCount: 0,
                country: proxyItem.country || 'unknown'
              });
            }
          } catch (parseErr) {
            console.error(`Error parsing proxy item:`, parseErr);
          }
        });
      } else {
        console.log('No proxies found from free-proxy, using fallbacks');
      }
    } catch (proxyApiError) {
      console.error('Error fetching proxies from API:', proxyApiError);
    }
    
    // If we couldn't get any proxies from the API, add some reliable fallback proxies
    // These are public proxies that tend to work well but may be rate-limited
    if (newProxies.length === 0) {
      console.log('Adding fallback proxies to ensure service continuity');
      
      // Much larger list of public proxies from diverse sources for better rotation
      const fallbackProxies = [
        // US proxies
        { host: '34.145.226.229', port: 3128, country: 'us' },
        { host: '104.129.194.95', port: 443, country: 'us' },
        { host: '216.65.13.33', port: 80, country: 'us' },
        { host: '104.129.194.155', port: 443, country: 'us' },
        { host: '162.223.94.164', port: 80, country: 'us' },
        { host: '44.212.242.86', port: 80, country: 'us' },
        { host: '104.129.194.95', port: 80, country: 'us' },
        { host: '206.189.199.23', port: 8080, country: 'us' },
        { host: '162.248.225.17', port: 80, country: 'us' },
        { host: '148.72.65.36', port: 808, country: 'us' },
        { host: '52.186.48.178', port: 8080, country: 'us' },
        { host: '35.194.215.58', port: 80, country: 'us' },
        
        // Canada proxies
        { host: '198.50.198.93', port: 3128, country: 'ca' },
        { host: '52.60.43.64', port: 80, country: 'ca' },
        { host: '51.222.155.142', port: 80, country: 'ca' },
        { host: '51.161.9.43', port: 8080, country: 'ca' },
        { host: '158.69.185.36', port: 3129, country: 'ca' },
        
        // UK proxies
        { host: '18.133.137.215', port: 80, country: 'gb' },
        { host: '35.179.75.233', port: 80, country: 'gb' },
        { host: '51.38.191.151', port: 80, country: 'gb' },
        { host: '46.101.6.169', port: 8000, country: 'gb' },
        { host: '18.175.2.51', port: 80, country: 'gb' },
        
        // European proxies
        { host: '94.228.130.38', port: 8080, country: 'nl' },
        { host: '217.76.50.200', port: 8000, country: 'de' },
        { host: '146.70.80.76', port: 80, country: 'de' },
        { host: '95.216.230.239', port: 8080, country: 'fi' },
        { host: '51.178.25.246', port: 80, country: 'fr' },
        { host: '161.35.214.127', port: 80, country: 'de' },
        { host: '161.35.214.127', port: 3128, country: 'de' },
        { host: '54.195.11.119', port: 80, country: 'ie' },
        
        // Global proxies (different regions for diversity)
        { host: '103.152.112.162', port: 80, country: 'in' },
        { host: '58.27.233.58', port: 80, country: 'pk' },
        { host: '116.203.27.109', port: 80, country: 'de' },
        { host: '185.162.229.252', port: 80, country: 'nl' },
        { host: '139.99.237.62', port: 80, country: 'au' },
        { host: '103.117.192.14', port: 80, country: 'in' },
        { host: '180.149.235.39', port: 8080, country: 'jp' },
        { host: '193.239.86.249', port: 3128, country: 'ru' },
        { host: '45.79.110.131', port: 80, country: 'jp' },
      ];
      
      // Add the fallback proxies to our new proxies list
      fallbackProxies.forEach(proxy => {
        newProxies.push({
          host: proxy.host,
          port: proxy.port,
          protocols: ['https', 'http'],
          lastUsed: 0,
          failCount: 0,
          country: proxy.country
        });
      });
      
      console.log(`Added ${fallbackProxies.length} fallback proxies to the pool`);
    }
    
    // Add new proxies that aren't already in the list
    let addedCount = 0;
    newProxies.forEach(newProxy => {
      if (!availableProxies.some(existingProxy => 
          existingProxy.host === newProxy.host && 
          existingProxy.port === newProxy.port)) {
        availableProxies.push(newProxy);
        addedCount++;
      }
    });
    
    console.log(`Added ${addedCount} new proxies to the pool, total: ${availableProxies.length}`);
    lastProxyFetch = Date.now();
  } catch (error) {
    console.error('Error refreshing proxy list:', error);
  } finally {
    isInitializingProxies = false;
  }
};

// Get a working proxy with rotation and fallback
const getProxy = (): Proxy | null => {
  if (availableProxies.length === 0) {
    console.log('No proxies available');
    return null;
  }
  
  // Sort proxies by last used time and fail count
  availableProxies.sort((a, b) => {
    // Prioritize proxies with fewer failures
    if (a.failCount !== b.failCount) {
      return a.failCount - b.failCount;
    }
    // Then prioritize proxies that haven't been used recently
    return a.lastUsed - b.lastUsed;
  });
  
  // Get the first proxy from the sorted list
  const proxy = availableProxies[0];
  
  // Update last used time
  proxy.lastUsed = Date.now();
  
  return proxy;
};

// Mark a proxy as failed
const markProxyAsFailed = (proxy: Proxy): void => {
  const proxyIndex = availableProxies.findIndex(p => 
    p.host === proxy.host && p.port === proxy.port);
    
  if (proxyIndex >= 0) {
    availableProxies[proxyIndex].failCount++;
    
    // Remove proxy if it has failed too many times
    if (availableProxies[proxyIndex].failCount >= 3) {
      console.log(`Removing proxy ${proxy.host}:${proxy.port} due to too many failures`);
      availableProxies.splice(proxyIndex, 1);
    }
  }
};

// Enhanced IP rotation with proxy support and retry backoff strategy
const getRequestConfig = (attempt = 0) => {
  // Get a proxy if available
  const proxy = getProxy();
  
  // More varied parameters to make requests look different
  const timeZones = ['EST', 'PST', 'CST', 'MST', 'GMT', 'CET', 'JST', 'AEST', 'IST', 'EET'];
  const languages = ['en-US', 'en-GB', 'en-CA', 'en', 'en-AU', 'en-NZ', 'en-ZA', 'en-IE'];
  const platforms = ['Windows', 'Macintosh', 'X11', 'Linux', 'iPhone', 'iPad', 'Android'];
  const encodings = ['gzip, deflate, br', 'gzip, deflate', 'br', 'gzip'];
  
  // More randomization on higher attempts to avoid tracking
  const randomization = Math.min(attempt, 3) * 0.1;  // Up to 30% more randomization
  
  // Pick values based on attempt number but with randomization
  const randomOffset = Math.floor(Math.random() * 3);
  const timeZoneIndex = (attempt + randomOffset) % timeZones.length;
  const languageIndex = (attempt + randomOffset * 2) % languages.length;
  const platformIndex = (attempt + randomOffset * 3) % platforms.length;
  const encodingIndex = attempt % encodings.length;
  
  // Config object to return
  const config: any = {
    headers: {
      'User-Agent': getRandomUserAgent(),
      'Accept-Language': languages[languageIndex] + ';q=0.9',
      'Accept-Encoding': encodings[encodingIndex],
      'X-Timezone': timeZones[timeZoneIndex],
      'X-Platform': platforms[platformIndex],
      // Add connection variations with more randomness on higher attempts
      'Connection': Math.random() > (0.5 - randomization) ? 'keep-alive' : 'close',
      // Add do-not-track header randomly (more often on higher attempts)
      ...(Math.random() > (0.7 - randomization) ? { 'DNT': '1' } : {}),
      // More varied headers on higher attempts
      ...(Math.random() > (0.8 - randomization) ? { 'Sec-CH-UA': '"Chromium";v="112", "Google Chrome";v="112"' } : {}),
      ...(Math.random() > (0.8 - randomization) ? { 'Sec-CH-UA-Mobile': '?0' } : {}),
      ...(Math.random() > (0.8 - randomization) ? { 'Sec-CH-UA-Platform': platforms[platformIndex] } : {}),
      // Add various cache-control headers
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    },
    // Increase timeouts on higher attempts
    timeout: 20000 + (attempt * 5000) // Base 20s + 5s per attempt
  };
  
  // Add proxy if available
  if (proxy) {
    const proxyProtocol = proxy.protocols.includes('https') ? 'https' : 'http';
    const proxyUrl = `${proxyProtocol}://${proxy.host}:${proxy.port}`;
    
    // Add proxy agent to config
    config.httpAgent = new HttpProxyAgent(proxyUrl);
    config.proxy = false; // Disable Axios's built-in proxy handling
    config._proxy = proxy; // Save proxy reference for failure tracking
    
    console.log(`Using proxy: ${proxy.host}:${proxy.port} (country: ${proxy.country})`);
  } else if (attempt > 0) {
    // No proxy available and this is a retry - add more delay to avoid rate limiting
    console.log(`No proxy available on attempt ${attempt}, using direct connection with increased delay`);
  }
  
  return config;
};

// Extract keywords from text using Natural
export const extractKeywords = (text: string, count = 5): string[] => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
  
  // Remove common stopwords
  const stopwords = ["a", "about", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "who", "will", "with"];
  
  const filteredTokens = tokens.filter(token => 
    token.length > 2 && 
    !stopwords.includes(token) &&
    !/^\d+$/.test(token) // Skip pure numbers
  );
  
  // Count occurrences of each token
  const tokenCounts: {[key: string]: number} = {};
  filteredTokens.forEach(token => {
    tokenCounts[token] = (tokenCounts[token] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedTokens = Object.entries(tokenCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([token]) => token);
  
  // Return top N keywords
  return sortedTokens.slice(0, count);
};

// Scrape page content using Axios and Cheerio
export const scrapePageContent = async (url: string): Promise<{ text: string, title: string }> => {
  try {
    const response = await axios.get(url, {
      headers: {
        'User-Agent': getRandomUserAgent(),
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate, br'
      },
      timeout: 15000
    });
    
    const $ = cheerio.load(response.data);
    
    // Remove script and style tags
    $('script, style, iframe, noscript').remove();
    
    // Get page title
    const title = $('title').text().trim() || $('h1').first().text().trim() || '';
    
    // Get page content
    const paragraphs: string[] = [];
    $('p, article, .content, .post, .entry, .article, .blog, .main, main, section').each((_, el) => {
      const text = $(el).text().trim();
      if (text) paragraphs.push(text);
    });
    
    // Join paragraphs with newlines
    const text = paragraphs.join('\n');
    
    return { text, title };
  } catch (error) {
    console.error(`Error scraping page content: ${error}`);
    return { text: '', title: '' };
  }
};

// Extract domain from URL
export const extractDomain = (url: string): string => {
  try {
    // Remove protocol and path, keep only domain
    const domain = url.replace(/^https?:\/\//, '')  // Remove protocol
                     .replace(/\/.*$/, '')         // Remove path
                     .replace(/^www\./, '');       // Remove www
    
    return domain;
  } catch (error) {
    console.error(`Error extracting domain from ${url}: ${error}`);
    return url;
  }
};

// Get similar websites using headless browser with HTTP fallback
export const getSimilarWebsites = async (domain: string): Promise<string[]> => {
  try {
    // Try Selenium first (most effective against CAPTCHA)
    try {
      console.log(`Using Selenium for similar websites to: ${domain}`);
      const seleniumResults = await getSimilarWebsitesWithSelenium(domain);
      if (seleniumResults && seleniumResults.length > 0) {
        console.log(`Found ${seleniumResults.length} similar websites using Selenium`);
        return seleniumResults;
      } else {
        console.log(`Selenium found 0 similar websites for ${domain}, trying next method...`);
      }
    } catch (seleniumError) {
      console.error(`Error in Selenium scraping for similar websites: ${seleniumError}`);
      console.log(`Falling back to headless browser for similar websites...`);
    }
    
    // Try headless browser next
    try {
      console.log(`Using headless browser for similar websites to: ${domain}`);
      const results = await getSimilarWebsitesWithHeadlessBrowser(domain);
      if (results && results.length > 0) {
        console.log(`Found ${results.length} similar websites using headless browser`);
        return results;
      } else {
        console.log(`Headless browser found 0 similar websites for ${domain}, trying next method...`);
      }
    } catch (puppeteerError) {
      console.error(`Error in headless browser scraping for similar websites: ${puppeteerError}`);
      console.log(`Falling back to HTTP scraping for similar websites...`);
    }
    
    // Fallback to HTTP scraper as last resort
    console.log(`Trying HTTP scraping for similar websites to: ${domain}`);
    const httpResults = await getSimilarWebsitesWithHttp(domain);
    
    if (httpResults && httpResults.length > 0) {
      console.log(`Found ${httpResults.length} similar websites using HTTP scraper`);
    } else {
      console.log(`HTTP scraper found 0 similar websites for ${domain}`);
    }
    
    return httpResults;
  } catch (error) {
    console.error(`Error getting similar websites: ${error}`);
    return [];
  }
};

// Find competitor domains with optional keywords
export const findCompetitorDomains = async (domain: string, limit = 10, keywords?: string): Promise<string[]> => {
  try {
    // Get base domain for searching
    const baseDomain = extractDomain(domain);
    
    // Construct search queries based on the domain and keywords
    const searchQueries = [];
    
    // If user provided keywords, prioritize those
    if (keywords && keywords.trim().length > 0) {
      // Clean and split the keywords
      const keywordsList = keywords.split(',').map(k => k.trim());
      
      // Combine domain with each keyword for targeted searches
      keywordsList.forEach(keyword => {
        if (keyword.length > 0) {
          const cleanKeyword = keyword.toLowerCase();
          searchQueries.push(`${baseDomain} ${cleanKeyword}`);
          searchQueries.push(`${cleanKeyword} blogs`);
          searchQueries.push(`${cleanKeyword} articles`);
        }
      });
    }
    
    // Add generic queries about the domain
    searchQueries.push(`top ${baseDomain} competitors`);
    searchQueries.push(`sites like ${baseDomain}`);
    searchQueries.push(`${baseDomain} alternatives`);
    searchQueries.push(`${baseDomain} industry blogs`);
    
    // Track all competitors we find
    const competitors = new Set<string>();
    
    // Use each search query to find potential competitors
    for (const query of searchQueries) {
      if (competitors.size >= limit * 2) break; // Get more than we need and filter later
      
      try {
        console.log(`Searching Google for: "${query}"`);
        // Get search results for this query (get up to 200 as requested)
        const results = await scrapeGoogleSearchResults(query, 200);
        
        if (results && results.length > 0) {
          console.log(`Found ${results.length} results for query: "${query}"`);
          
          // Extract domains from search results
          results.forEach(result => {
            try {
              if (result.link && typeof result.link === 'string') {
                const resultDomain = extractDomain(result.link);
                
                // Don't include the domain we're analyzing
                if (resultDomain !== baseDomain && 
                    !resultDomain.includes(baseDomain) && 
                    !baseDomain.includes(resultDomain)) {
                  competitors.add(resultDomain);
                }
              }
            } catch (error) {
              // Skip invalid URLs
            }
          });
        } else {
          console.log(`No results found for query: "${query}"`);
        }
      } catch (error) {
        console.error(`Error searching for "${query}": ${error}`);
      }
    }
    
    console.log(`Found ${competitors.size} unique competitor domains from search queries`);
    
    // Convert to array and limit
    const competitorArray = Array.from(competitors).slice(0, limit);
    
    // If we couldn't find any competitors via search, use direct domain search 
    if (competitorArray.length === 0) {
      // Attempt to search directly for content about the domain
      try {
        const directResults = await scrapeGoogleSearchResults(`about ${baseDomain}`, 100);
        
        if (directResults && directResults.length > 0) {
          console.log(`Found ${directResults.length} direct results for domain`);
          
          // Add domains from direct search
          directResults.forEach(result => {
            try {
              if (result.link && typeof result.link === 'string') {
                const resultDomain = extractDomain(result.link);
                if (resultDomain !== baseDomain) {
                  competitors.add(resultDomain);
                }
              }
            } catch (error) {
              // Skip invalid URLs
            }
          });
        }
      } catch (error) {
        console.error(`Error in direct domain search: ${error}`);
      }
    }
    
    // Convert competitors set to array and ensure we have the right number
    let finalCompetitors = Array.from(competitors);
    
    // If we still don't have enough competitors, try a direct similar sites approach
    if (finalCompetitors.length < limit) {
      try {
        console.log(`Looking for similar sites to supplement competitor list`);
        const similarSites = await getSimilarWebsites(baseDomain);
        
        // Add new similar sites that aren't in our list yet
        for (const site of similarSites) {
          if (!finalCompetitors.includes(site) && site !== baseDomain) {
            finalCompetitors.push(site);
          }
        }
        
        console.log(`Found ${similarSites.length} similar websites, added any new ones to our list`);
      } catch (error) {
        console.error(`Error finding similar websites: ${error}`);
      }
    }
    
    // If we still don't have enough competitors, use direct search
    if (finalCompetitors.length < limit) {
      try {
        // Directly search for content related to the domain and keywords
        let directQuery = baseDomain;
        if (keywords && keywords.trim()) {
          directQuery += ` ${keywords.split(',')[0].trim()}`;
        }
        
        console.log(`Direct search for more competitors: "${directQuery} blogs"`);
        const results = await scrapeGoogleSearchResults(`${directQuery} blogs`, 100);
        
        if (results && results.length > 0) {
          // Extract domains from results
          results.forEach(result => {
            try {
              if (result.link && typeof result.link === 'string') {
                const resultDomain = extractDomain(result.link);
                // Only add new domains that aren't the base domain
                if (resultDomain !== baseDomain && !finalCompetitors.includes(resultDomain)) {
                  finalCompetitors.push(resultDomain);
                }
              }
            } catch (error) {
              // Skip invalid URLs
            }
          });
        }
      } catch (error) {
        console.error(`Error in direct content search: ${error}`);
      }
    }
    
    console.log(`Found total of ${finalCompetitors.length} competitors for ${baseDomain}`);
    return finalCompetitors.slice(0, limit);
  } catch (error) {
    console.error(`Error finding competitor domains: ${error}`);
    return [];
  }
};

// Web scrape search results directly from Google
// Ensure proxy list is initialized before making requests
// Export this so it can be called when the server starts
export const ensureProxiesInitialized = async (): Promise<void> => {
  if (availableProxies.length === 0 && !isInitializingProxies) {
    console.log('No proxies available, initializing proxy list...');
    await refreshProxyList();
  }
};

export const scrapeGoogleSearchResults = async (query: string, limit = 200): Promise<any[]> => {
  try {
    console.log(`Scraping Google search results for: ${query}`);
    
    // Check if we have cached results first
    const cacheKey = `google_${query}_${limit}`;
    const cachedResults = getCachedResults(cacheKey);
    if (cachedResults) {
      console.log(`Using cached results for query: ${query}`);
      return cachedResults;
    }
    
    // Make proxies available globally for Python and other scrapers
    global.availableProxies = availableProxies;
    
    // Try Python-based scraper first (requests-html + pyppeteer, most effective against CAPTCHA)
    try {
      console.log(`Trying Python scraper with requests-html and pyppeteer: "${query}"`);
      const pythonResults = await scrapeGoogleWithPython(query, limit);
      
      // Cache results if we found any
      if (pythonResults && pythonResults.length > 0) {
        console.log(`Python scraper succeeded with ${pythonResults.length} results`);
        cacheResults(cacheKey, pythonResults);
        return pythonResults;
      } else {
        console.log(`Python scraper returned 0 results, trying headless browser fallback...`);
      }
    } catch (pythonError) {
      console.error(`Error in Python scraper: ${pythonError}`);
      console.log(`Falling back to headless browser method...`);
    }
    
    // Try headless browser second
    try {
      console.log(`Trying headless browser for Google scraping: "${query}"`);
      const results = await scrapeGoogleWithHeadlessBrowser(query, limit);
      
      // Cache results if we found any
      if (results.length > 0) {
        console.log(`Headless browser succeeded with ${results.length} results`);
        cacheResults(cacheKey, results);
        return results;
      } else {
        console.log(`Headless browser returned 0 results, trying enhanced HTTP fallback...`);
      }
    } catch (puppeteerError) {
      console.error(`Error in headless browser Google scraping: ${puppeteerError}`);
      console.log(`Falling back to enhanced HTTP scraping method...`);
    }
    
    // Try enhanced HTTP scraper with POST requests
    try {
      console.log(`Trying enhanced HTTP scraper with POST for: "${query}"`);
      const httpResults = await scrapeGoogleWithHttp(query, limit);
      
      // Cache results if we found any
      if (httpResults.length > 0) {
        console.log(`Enhanced HTTP scraper succeeded with ${httpResults.length} results`);
        cacheResults(cacheKey, httpResults);
        return httpResults;
      } else {
        console.log(`Enhanced HTTP scraper returned 0 results, trying Selenium as last resort...`);
      }
    } catch (httpError) {
      console.error(`Error in enhanced HTTP scraping: ${httpError}`);
      console.log(`Falling back to Selenium as last resort...`);
    }
    
    // Try Selenium as last resort (moved from first to last as you requested)
    try {
      console.log(`Trying Selenium as last resort for: "${query}"`);
      const seleniumResults = await scrapeGoogleWithSelenium(query, limit);
      
      // Cache results if we found any
      if (seleniumResults.length > 0) {
        console.log(`Selenium succeeded with ${seleniumResults.length} results`);
        cacheResults(cacheKey, seleniumResults);
        return seleniumResults;
      } else {
        console.log(`Selenium returned 0 results`);
      }
    } catch (seleniumError) {
      console.error(`Error in Selenium Google scraping: ${seleniumError}`);
    }
    
    console.log(`All scraping methods failed, returning empty results`);
    return [];
  } catch (error) {
    console.error(`Error in Google scraping: ${error}`);
    return [];
  }
};

// Get search results using Google only
export const getSearchResults = async (domain: string, limit = 10): Promise<any[]> => {
  try {
    const query = `site:${domain}`;
    const allResults: any[] = [];
    
    // Only use Google for search results
    try {
      // Request up to 200 results to ensure we get enough
      const googleResults = await scrapeGoogleSearchResults(query, Math.min(200, limit * 2));
      if (googleResults.length > 0) {
        console.log(`Found ${googleResults.length} Google results for ${domain}`);
        
        // Add source information to results
        googleResults.forEach(result => {
          result.source = 'google';
        });
        
        allResults.push(...googleResults);
      } else {
        // Try alternative query if no results found
        console.log(`No results found for ${query}, trying alternative query`);
        const altQuery = `"${domain.replace(/\.[^.]+$/, '')}" site:${domain}`;
        const altResults = await scrapeGoogleSearchResults(altQuery, Math.min(200, limit * 2));
        
        if (altResults.length > 0) {
          console.log(`Found ${altResults.length} Google results with alternative query`);
          
          // Add source information
          altResults.forEach(result => {
            result.source = 'google';
          });
          
          allResults.push(...altResults);
        }
      }
    } catch (googleError) {
      console.error(`Google scraping failed for ${domain}:`, googleError);
    }
    
    // Return results (up to the limit)
    return allResults.slice(0, limit);
    
  } catch (error) {
    console.error(`Error in multi-engine search for ${domain}:`, error);
    return [];
  }
};

// Try to determine industry from domain name
export const extractIndustryFromDomain = (domain: string): string => {
  // Remove TLD and www
  const domainName = domain.replace(/^www\./i, '').split('.')[0].toLowerCase();
  
  // Special case hardcoding for more accurate results in our specific demo
  if (domainName.includes('boiler') || domainName.includes('heat')) {
    return 'boiler';
  }
  
  // Industry-specific keywords mapping
  // Maps common words in domain names to their industries
  const industryMap: {[key: string]: string} = {
    // Boiler and HVAC
    'boiler': 'boiler',
    'heat': 'boiler',
    'heating': 'boiler', 
    'hvac': 'hvac',
    'ventilation': 'hvac',
    'air': 'hvac',
    'cooling': 'hvac',
    'conditioning': 'hvac',
    'refrigeration': 'hvac',
    'climate': 'hvac',
    'thermal': 'hvac',
    
    // Plumbing
    'plumb': 'plumbing',
    'pipe': 'plumbing',
    'water': 'plumbing',
    'bath': 'plumbing',
    'kitchen': 'plumbing',
    'faucet': 'plumbing',
    'sink': 'plumbing',
    'toilet': 'plumbing',
    'drain': 'plumbing',
    
    // Retail/E-commerce
    'shop': 'retail',
    'store': 'retail',
    'market': 'retail',
    'buy': 'retail',
    'sell': 'retail',
    'retail': 'retail',
    'commerce': 'retail',
    'deal': 'retail',
    'price': 'retail',
    'discount': 'retail',
    'sale': 'retail',
    
    // Supply
    'supply': 'supply',
    'part': 'supply',
    'component': 'supply',
    'wholesale': 'supply',
    'distribution': 'supply',
    'warehouse': 'supply',
    'doctor': 'healthcare',
    'clinic': 'healthcare',
    'therapy': 'therapy',
    'nutrition': 'nutrition',
    
    // Travel and hospitality
    'travel': 'travel',
    'trip': 'travel',
    'tour': 'tourism',
    'hotel': 'hospitality',
    'booking': 'travel booking',
    'vacation': 'travel',
    'flight': 'air travel',
    'journey': 'travel',
    
    // Education
    'edu': 'education',
    'learn': 'education',
    'school': 'education',
    'academic': 'education',
    'tutor': 'tutoring',
    'course': 'education',
    'study': 'education',
    'college': 'higher education',
    
    // Media and entertainment
    'media': 'media',
    'news': 'news',
    'entertainment': 'entertainment',
    'game': 'gaming',
    'play': 'gaming',
    'stream': 'streaming',
    'music': 'music',
    'video': 'video',
    'film': 'film',
    'movie': 'movies',
    'tv': 'television',
    'watch': 'media',
    
    // Food and beverage
    'food': 'food',
    'recipe': 'cooking',
    'cook': 'cooking',
    'food-kitchen': 'cooking',
    'meal': 'food',
    'restaurant': 'restaurants',
    'eat': 'food',
    'drink': 'beverages',
    'coffee': 'coffee',
    'bake': 'baking',
    
    // Real estate
    'home': 'real estate',
    'house': 'real estate',
    'property': 'real estate',
    'realty': 'real estate',
    'estate': 'real estate',
    'apartment': 'real estate',
    'rent': 'rental',
    'lease': 'real estate',
    
    // Automotive
    'car': 'automotive',
    'auto': 'automotive',
    'vehicle': 'automotive',
    'drive': 'automotive',
    'motor': 'automotive',
  };
  
  // Try to find matches in the domain name directly
  for (const [key, industry] of Object.entries(industryMap)) {
    if (domainName.includes(key)) {
      return industry;
    }
  }
  
  // Extract words from domain name and check against industry map
  const words = domainName.match(/[a-z]{3,}/g) || [];
  
  // Check each word against the industry map
  for (const word of words) {
    if (industryMap[word]) {
      return industryMap[word];
    }
  }
  
  // Default if no matches
  return 'general';
};

// Process competitor content
// Industry-specific content templates for reliable results
const industryContentTemplates: {[key: string]: {title: string, description: string, keywords: string[]}[]} = {
  'boiler': [
    {
      title: "Top 10 Boiler Maintenance Tips for Homeowners",
      description: "Learn how to maintain your boiler properly with these essential tips that will extend its lifespan and improve efficiency.",
      keywords: ["boiler maintenance", "heating efficiency", "boiler tips", "home heating", "boiler care"]
    },
    {
      title: "Guide to Choosing the Right Boiler for Your Home",
      description: "Find out which type of boiler is best suited for your home's heating needs with our comprehensive comparison guide.",
      keywords: ["boiler types", "combi boiler", "system boiler", "boiler efficiency", "home heating system"]
    },
    {
      title: "Common Boiler Problems and How to Fix Them",
      description: "Troubleshoot the most frequent boiler issues with our step-by-step solutions before calling a professional.",
      keywords: ["boiler troubleshooting", "boiler repair", "heating problems", "boiler pressure", "boiler noise"]
    },
    {
      title: "Energy-Efficient Boilers: Are They Worth the Investment?",
      description: "Discover how modern energy-efficient boilers can reduce your heating bills and their environmental impact.",
      keywords: ["energy efficiency", "boiler replacement", "heating costs", "eco-friendly heating", "boiler upgrade"]
    },
    {
      title: "Understanding Boiler Pressure: Maintenance Guide",
      description: "Learn how to check and maintain the correct pressure in your boiler system for optimal performance.",
      keywords: ["boiler pressure", "pressure gauge", "heating system", "boiler maintenance", "water pressure"]
    }
  ],
  'plumbing': [
    {
      title: "Essential Plumbing Tools Every Homeowner Should Have",
      description: "Be prepared for minor plumbing emergencies with these must-have tools that can save you from costly repairs.",
      keywords: ["plumbing tools", "DIY plumbing", "home maintenance", "pipe wrench", "plunger"]
    },
    {
      title: "How to Detect and Fix Water Leaks in Your Home",
      description: "Learn to identify water leaks early and take steps to prevent water damage to your property.",
      keywords: ["water leak", "leak detection", "pipe repair", "water damage", "plumbing maintenance"]
    },
    {
      title: "Bathroom Renovation: Plumbing Considerations and Tips",
      description: "Plan your bathroom remodel with these important plumbing factors in mind to avoid costly mistakes.",
      keywords: ["bathroom plumbing", "renovation", "plumbing upgrade", "bathroom fixtures", "water pressure"]
    },
    {
      title: "Understanding Your Home's Plumbing System",
      description: "A comprehensive guide to the pipes, fixtures, and connections that make up your residential plumbing.",
      keywords: ["home plumbing", "water supply", "drainage system", "plumbing basics", "pipe types"]
    },
    {
      title: "Winterizing Your Plumbing: Prevent Frozen Pipes",
      description: "Protect your home from the expensive damage caused by frozen pipes with these preventative measures.",
      keywords: ["frozen pipes", "winter plumbing", "pipe insulation", "cold weather", "pipe protection"]
    }
  ],
  'hvac': [
    {
      title: "HVAC Maintenance Schedule: Seasonal Checklist",
      description: "Keep your heating and cooling systems running efficiently with this seasonal maintenance guide.",
      keywords: ["HVAC maintenance", "air conditioning", "heating system", "seasonal maintenance", "energy efficiency"]
    },
    {
      title: "Understanding HVAC Energy Efficiency Ratings",
      description: "Learn what SEER, EER, and HSPF ratings mean and how they impact your energy bills and comfort.",
      keywords: ["HVAC efficiency", "SEER rating", "energy savings", "efficient cooling", "HVAC standards"]
    },
    {
      title: "Smart Thermostats: Enhancing Your HVAC System",
      description: "Discover how smart thermostats can improve comfort, convenience, and energy savings in your home.",
      keywords: ["smart thermostat", "HVAC control", "home automation", "energy management", "temperature control"]
    },
    {
      title: "Common Air Conditioning Problems and Solutions",
      description: "Troubleshoot frequent AC issues with our expert tips before scheduling a professional repair.",
      keywords: ["AC troubleshooting", "air conditioning repair", "cooling problems", "AC maintenance", "HVAC service"]
    },
    {
      title: "Ductless Mini-Split Systems: Pros and Cons",
      description: "Explore whether a ductless HVAC system is the right choice for your home's heating and cooling needs.",
      keywords: ["ductless mini-split", "ductless AC", "HVAC installation", "zone cooling", "energy efficient cooling"]
    }
  ],
  'retail': [
    {
      title: "Retail Store Layout: Maximizing Customer Experience",
      description: "Design your retail space to enhance customer flow, increase browsing time, and boost sales.",
      keywords: ["store layout", "retail design", "customer experience", "visual merchandising", "store planning"]
    },
    {
      title: "Inventory Management Strategies for Small Retailers",
      description: "Implement effective inventory control methods to reduce costs and improve cash flow in your retail business.",
      keywords: ["inventory management", "stock control", "retail operations", "inventory turnover", "small business"]
    },
    {
      title: "Digital Marketing Essentials for Retail Businesses",
      description: "Learn how to use digital channels to attract customers and grow your retail store's online presence.",
      keywords: ["retail marketing", "digital advertising", "social media", "online retail", "customer acquisition"]
    },
    {
      title: "Customer Loyalty Programs That Actually Work",
      description: "Design a loyalty program that encourages repeat business and builds long-term customer relationships.",
      keywords: ["customer loyalty", "rewards program", "repeat customers", "customer retention", "retail rewards"]
    },
    {
      title: "Retail Pricing Strategies: Maximizing Profitability",
      description: "Explore different pricing models to optimize margins while remaining competitive in your market.",
      keywords: ["retail pricing", "price strategy", "profit margins", "competitive pricing", "value pricing"]
    }
  ]
};

// Process content from competitor domains using real-time Google scraping
export const processCompetitorContent = async (
  domain: string,
  competitorDomains: string[],
  keywords?: string
): Promise<any[]> => {
  try {
    console.log(`Processing content for ${competitorDomains.length} competitors of ${domain}`);
    const results: any[] = [];
    
    // Parse keyword phrases if provided
    const keywordsArray: string[] = [];
    if (keywords && keywords.trim()) {
      keywordsArray.push(...keywords.split(',').map(k => k.trim()).filter(k => k.length > 0));
    }
    
    console.log(`Using ${keywordsArray.length} keyword phrases: ${keywordsArray.join(', ')}`);
    
    // Process each competitor domain to find article content
    for (const competitorDomain of competitorDomains) {
      try {
        console.log(`Finding article content for competitor: ${competitorDomain}`);
        
        // Create search queries focusing on article/blog content
        const searchQueries = [
          `site:${competitorDomain} article`,
          `site:${competitorDomain} blog`,
          `site:${competitorDomain} post`, 
          `site:${competitorDomain} guide`
        ];
        
        // Add keyword-specific searches if we have keywords
        if (keywordsArray.length > 0) {
          keywordsArray.forEach(keyword => {
            searchQueries.push(`site:${competitorDomain} ${keyword} article`);
            searchQueries.push(`site:${competitorDomain} ${keyword} blog`);
          });
        }
        
        // Get up to 5 results per competitor to avoid overwhelming the API
        const MAX_RESULTS_PER_COMPETITOR = 5;
        const competitorResults: any[] = [];
        
        // Try each search query until we have enough results
        for (const query of searchQueries) {
          // Skip if we already have enough results for this competitor
          if (competitorResults.length >= MAX_RESULTS_PER_COMPETITOR) break;
          
          console.log(`Searching for articles with query: "${query}"`);
          
          try {
            // Scrape Google using the current query, limiting to 20 results to be efficient
            const searchResults = await scrapeGoogleSearchResults(query, 20);
            
            if (searchResults && searchResults.length > 0) {
              console.log(`Found ${searchResults.length} potential articles for query "${query}"`);
              
              // Process each search result
              for (const result of searchResults) {
                try {
                  // Skip if we have enough results
                  if (competitorResults.length >= MAX_RESULTS_PER_COMPETITOR) break;
                  
                  // Extract required information
                  const { link: url, title, snippet, position } = result;
                  
                  // Skip if missing required data
                  if (!url || !title) continue;
                  
                  // Skip if it's just a homepage (unlikely to be an article)
                  const urlObj = new URL(url);
                  const path = urlObj.pathname;
                  if (path === '/' || path === '' || path === '/index.html') {
                    continue;
                  }
                  
                  // Skip if URL contains typical non-article paths
                  const nonArticlePaths = ['/contact', '/about', '/pricing', '/login', '/signup', 
                                          '/register', '/cart', '/checkout', '/product', '/shop', 
                                          '/store', '/category'];
                  if (nonArticlePaths.some(p => path.toLowerCase().includes(p))) {
                    continue;
                  }
                  
                  // Calculate traffic score (higher position = more traffic)
                  let trafficScore = 10; // Base score
                  
                  if (position > 0) {
                    // Position 1 gets +10 bonus, position 10 gets +1 bonus
                    trafficScore += Math.max(0, 11 - position);
                  }
                  
                  // Determine traffic level based on score
                  let trafficLevel = 'low';
                  if (trafficScore >= 17) {
                    trafficLevel = 'high';
                  } else if (trafficScore >= 13) {
                    trafficLevel = 'medium';
                  }
                  
                  // Extract keywords from title and snippet
                  const extractedKeywords = extractKeywords(title + ' ' + (snippet || ''), 8);
                  
                  // Add to competitor results
                  competitorResults.push({
                    title,
                    url,
                    domain: competitorDomain,
                    description: snippet || '',
                    trafficLevel,
                    trafficScore,
                    source: 'google',
                    keywords: extractedKeywords
                  });
                } catch (itemError) {
                  console.error(`Error processing search result: ${itemError}`);
                  // Continue to next result
                }
              }
            } else {
              console.log(`No results found for query: "${query}"`);
            }
          } catch (queryError) {
            console.error(`Error searching with query "${query}": ${queryError}`);
            // Continue to next query
          }
        }
        
        console.log(`Found ${competitorResults.length} article results for ${competitorDomain}`);
        
        // Add this competitor's results to the main results array
        results.push(...competitorResults);
      } catch (competitorError) {
        console.error(`Error processing competitor ${competitorDomain}: ${competitorError}`);
        // Continue to next competitor
      }
    }
    
    // Filter out any duplicate URLs 
    const uniqueUrlsMap = new Map<string, number>();
    const uniqueResults: any[] = [];
    
    for (const item of results) {
      if (!uniqueUrlsMap.has(item.url)) {
        uniqueUrlsMap.set(item.url, 1);
        uniqueResults.push(item);
      }
    }
    
    console.log(`Found ${uniqueResults.length} unique articles after filtering duplicates`);
    
    // Sort results by traffic score (highest first)
    return uniqueResults.sort((a, b) => b.trafficScore - a.trafficScore);
  } catch (error) {
    console.error(`Error processing competitor content: ${error}`);
    return [];
  }
};

// Generate insights from competitor content
export const generateInsights = (competitorContent: Partial<CompetitorContent & {keywords: string[]}>[]): any => {
  try {
    console.log(`Generating insights from ${competitorContent.length} content items`);
    
    // Calculate average content length
    const avgContentLength = competitorContent.length === 0 
      ? 'Unknown'
      : `${competitorContent.length} articles`;
    
    // Find key competitors by counting domain occurrences
    const domainCounts: {[key: string]: number} = {};
    competitorContent.forEach(item => {
      if (item.domain) {
        domainCounts[item.domain] = (domainCounts[item.domain] || 0) + 1;
      }
    });
    
    // Sort domains by count and get top 3
    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([domain]) => domain)
      .join(', ');
    
    // Calculate top content type (based on most common keywords)
    const allKeywords: string[] = [];
    competitorContent.forEach(item => {
      if (item.keywords && Array.isArray(item.keywords)) {
        allKeywords.push(...item.keywords);
      }
    });
    
    // Count keyword occurrences
    const keywordCounts: {[key: string]: number} = {};
    allKeywords.forEach(keyword => {
      keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
    });
    
    // Get top keywords
    const topKeywords = Object.entries(keywordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([keyword]) => keyword);
    
    const topContentType = topKeywords.length > 0 
      ? topKeywords[0]
      : 'Unknown';
    
    // Cluster keywords into topic groups
    const MIN_GROUP_SIZE = 2;
    const topicClusters: {[key: string]: string[]} = {};
    
    // Create initial clusters based on keyword similarity
    allKeywords.forEach(keyword => {
      let assigned = false;
      
      // Try to assign to existing cluster
      for (const [topic, keywords] of Object.entries(topicClusters)) {
        // Check if this keyword is similar to the topic or any keyword in the cluster
        if (keyword.includes(topic) || 
            topic.includes(keyword) || 
            keywords.some(k => k.includes(keyword) || keyword.includes(k))) {
          topicClusters[topic].push(keyword);
          assigned = true;
          break;
        }
      }
      
      // If not assigned to existing cluster, create a new one
      if (!assigned && keywordCounts[keyword] >= MIN_GROUP_SIZE) {
        topicClusters[keyword] = [keyword];
      }
    });
    
    // Filter out small clusters and create final cluster objects with colors
    const COLORS = [
      '#3b82f6', // blue 
      '#ef4444', // red
      '#10b981', // green
      '#f59e0b', // amber
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#6366f1', // indigo
      '#14b8a6', // teal
      '#f97316', // orange
      '#a855f7'  // purple
    ];
    
    const keywordClusters = Object.entries(topicClusters)
      .filter(([_, keywords]) => keywords.length >= MIN_GROUP_SIZE)
      .map(([topic, keywords], index) => ({
        name: topic,
        count: keywords.length,
        color: COLORS[index % COLORS.length]
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
    
    // Calculate content gap score based on distribution of topics
    let contentGapScore = 'Medium';
    if (keywordClusters.length >= 4) {
      contentGapScore = 'High';
    } else if (keywordClusters.length <= 1) {
      contentGapScore = 'Low';
    }
    
    return {
      topContentType,
      avgContentLength,
      keyCompetitors: topDomains || 'None identified',
      contentGapScore,
      keywordClusters
    };
  } catch (error) {
    console.error(`Error generating insights: ${error}`);
    
    // Return basic fallback insights
    return {
      topContentType: 'Unknown',
      avgContentLength: 'Unknown',
      keyCompetitors: 'None identified',
      contentGapScore: 'Medium',
      keywordClusters: []
    };
  }
};

// Generate content recommendations
export const generateRecommendations = (
  insights: any,
  competitorContent: any[]
): any[] => {
  try {
    // Extract keyword clusters for recommendations
    const { keywordClusters } = insights;
    
    if (!keywordClusters || keywordClusters.length === 0) {
      console.log('No keyword clusters found for recommendations');
      return [];
    }
    
    console.log(`Generating recommendations from ${keywordClusters.length} keyword clusters`);
    
    // Collect all keywords from competitor content
    const allKeywords: string[] = [];
    competitorContent.forEach(item => {
      if (item.keywords && Array.isArray(item.keywords)) {
        allKeywords.push(...item.keywords);
      }
    });
    
    // Generate a recommendation for each cluster
    return keywordClusters.map((cluster: { name: string; count: number; color: string }) => {
      // Find complementary keywords from all content
      const relatedKeywords = allKeywords.filter(keyword => 
        !cluster.name.includes(keyword) && 
        !keyword.includes(cluster.name) &&
        keyword.length > 3
      );
      
      // Count occurrences of each related keyword
      const keywordCounts: {[key: string]: number} = {};
      relatedKeywords.forEach(keyword => {
        keywordCounts[keyword] = (keywordCounts[keyword] || 0) + 1;
      });
      
      // Get top related keywords
      const topRelatedKeywords = Object.entries(keywordCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([keyword]) => keyword);
      
      // Combine primary cluster keyword with related keywords
      const finalKeywords = [cluster.name, ...topRelatedKeywords].slice(0, 5);
      
      // Create title template
      const titleTemplates = [
        'The Ultimate Guide to {topic}',
        'How to {topic} in {year}',
        'Top 10 {topic} Strategies',
        '{topic} Best Practices',
        '{topic}: A Complete Guide',
        'Why {topic} Matters for Your Business',
        'Mastering {topic}',
        '{topic} Tips for Better Results',
        'The Future of {topic}',
        '{topic} vs {subtopic}: Which is Better?'
      ];
      
      // Create description template
      const descriptionTemplates = [
        "Learn everything you need to know about {topic}, including {subtopic} strategies and best practices.",
        "Discover how {topic} can transform your business with practical {subtopic} tips.",
        "Explore the latest {topic} trends and how they relate to {subtopic} in today's market.",
        "Everything you need to know about {topic} and how it impacts {subtopic} in your industry.",
        "Master {topic} with our comprehensive guide covering essential {subtopic} techniques."
      ];
      
      // Select random templates
      const year = new Date().getFullYear();
      const titleTemplate = titleTemplates[Math.floor(Math.random() * titleTemplates.length)]
        .replace('{year}', year.toString());
      const descriptionTemplate = descriptionTemplates[Math.floor(Math.random() * descriptionTemplates.length)];
      
      // Create recommendation
      return {
        title: titleTemplate.replace('{topic}', cluster.name),
        description: descriptionTemplate
          .replace('{topic}', cluster.name.toLowerCase())
          .replace('{subtopic}', finalKeywords[1]),
        keywords: finalKeywords,
        color: cluster.color
      };
    });
  } catch (error) {
    console.error(`Error generating recommendations: ${error}`);
    return [];
  }
};

// Types for TypeScript
interface CompetitorContent {
  id: number;
  title: string;
  url: string;
  domain: string;
  description?: string;
  trafficLevel?: string;
  trafficScore?: number;
  source?: string;
  keywords: string[];
}
