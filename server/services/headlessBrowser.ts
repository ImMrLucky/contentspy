/**
 * Headless Browser Services (Placeholder File)
 * 
 * This file serves as a compatibility placeholder for environments with Chrome.
 * Currently, it just re-exports functionality from the HTTP scraper module
 * since the Replit environment doesn't support Chrome for Puppeteer.
 */

import { scrapeGoogleWithHttp, getSimilarWebsitesWithHttp } from './httpScraper';

// Re-export the HTTP scraper functions with puppeteer naming conventions 
// for compatibility with existing code
export const scrapeGoogleWithHeadlessBrowser = scrapeGoogleWithHttp;
export const getSimilarWebsitesWithHeadlessBrowser = getSimilarWebsitesWithHttp;