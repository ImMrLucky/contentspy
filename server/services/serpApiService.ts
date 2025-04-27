/**
 * SerpAPI Service
 * 
 * This service provides reliable Google search functionality using the SerpAPI
 * to bypass CAPTCHA and rate limiting issues.
 */

// API key is available in the environment
const SERPAPI_KEY = process.env.SERPAPI_KEY;

/**
 * Get Google search results using SerpAPI
 */
export const searchWithSerpApi = async (query: string, limit = 100): Promise<any[]> => {
  try {
    console.log(`Using SerpAPI to search: "${query}" (limit: ${limit})`);
    
    // Build the SerpAPI URL with parameters
    const url = new URL('https://serpapi.com/search');
    url.searchParams.append('api_key', SERPAPI_KEY as string);
    url.searchParams.append('engine', 'google');
    url.searchParams.append('q', query);
    url.searchParams.append('num', String(Math.min(limit, 100))); // Max 100 results per page
    url.searchParams.append('google_domain', 'google.com');
    url.searchParams.append('gl', 'us'); // US market
    url.searchParams.append('hl', 'en'); // English language
    
    // Make the API request
    const response = await fetch(url.toString());
    
    if (!response.ok) {
      throw new Error(`SerpAPI returned status: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Process and format results
    const results: any[] = [];
    
    // Extract organic results
    if (data.organic_results && Array.isArray(data.organic_results)) {
      data.organic_results.forEach((result: any, index: number) => {
        results.push({
          position: index + 1,
          title: result.title || '',
          link: result.link || '',
          snippet: result.snippet || '',
          source: 'serpapi-google',
          trafficScore: 90 - index // Assign traffic scores based on ranking
        });
      });
    }
    
    console.log(`SerpAPI returned ${results.length} results for "${query}"`);
    return results.slice(0, limit);
  } catch (error) {
    console.error(`Error in SerpAPI search: ${error}`);
    return [];
  }
};

/**
 * Find competitor content using SerpAPI
 */
export const findCompetitorContentWithSerpApi = async (domain: string, keywords?: string): Promise<any[]> => {
  try {
    // Default to searching for articles on the domain
    const query = keywords 
      ? `${domain} ${keywords}`
      : `site:${domain} article OR blog`;
    
    return await searchWithSerpApi(query, 200);
  } catch (error) {
    console.error(`Error finding competitor content with SerpAPI: ${error}`);
    return [];
  }
};

/**
 * Find similar websites using SerpAPI
 */
export const findSimilarWebsitesWithSerpApi = async (domain: string, limit = 10): Promise<string[]> => {
  try {
    const queries = [
      `sites like ${domain}`,
      `competitors of ${domain}`,
      `${domain} alternatives`,
      `similar to ${domain}`
    ];
    
    const allResults: any[] = [];
    
    // Run all queries in parallel
    const searchPromises = queries.map(query => searchWithSerpApi(query, 20));
    const searchResults = await Promise.all(searchPromises);
    
    // Combine results
    searchResults.forEach(results => {
      allResults.push(...results);
    });
    
    // Extract domains from results
    const domains = allResults.map(result => {
      try {
        const url = new URL(result.link);
        return url.hostname.replace(/^www\./, '');
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean) // Remove nulls
    .filter(d => d !== domain) // Filter out the original domain
    .filter((d, i, self) => self.indexOf(d) === i); // Unique domains only
    
    return domains.slice(0, limit);
  } catch (error) {
    console.error(`Error finding similar websites with SerpAPI: ${error}`);
    return [];
  }
};