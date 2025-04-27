#!/usr/bin/env python3
"""
Python-based Advanced Web Scraper for Google

This module provides robust scraping capabilities using requests-html
to bypass CAPTCHA and scraping protection mechanisms.
"""

import json
import random
import time
import sys
import os
from datetime import datetime
from urllib.parse import urlparse, quote_plus

# Try importing with error handling for better debugging
try:
    from requests_html import HTMLSession
except ImportError as e:
    print(f"Error importing requests_html: {e}")
    # Provide fallback functionality or exit gracefully
    HTMLSession = None

# Global session to reuse
session = HTMLSession() if HTMLSession else None

# List of user agents to rotate through
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/117.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/118.0.0.0 Edge/118.0.2088.57",
    "Mozilla/5.0 (iPad; CPU OS 16_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1"
]

# Google domains to rotate through
GOOGLE_DOMAINS = [
    "https://www.google.com",
    "https://www.google.co.uk",
    "https://www.google.co.in",
    "https://www.google.ca",
    "https://www.google.com.au"
]

def get_random_user_agent():
    """Return a random user agent from the list"""
    return random.choice(USER_AGENTS)

def get_random_google_domain():
    """Return a random Google domain"""
    return random.choice(GOOGLE_DOMAINS)

def add_natural_delay():
    """Add a random delay to simulate human behavior"""
    # Generates a more natural random delay pattern
    base_delay = random.uniform(1.5, 4.0) 
    extra_delay = random.choice([0, 0, 0, 0, random.uniform(1.0, 3.0)])  # Occasionally add extra time
    delay = base_delay + extra_delay
    time.sleep(delay)
    return delay

def extract_domain(url):
    """Extract domain from URL"""
    try:
        parsed_url = urlparse(url)
        domain = parsed_url.netloc
        # Remove www. prefix if present
        if domain.startswith('www.'):
            domain = domain[4:]
        return domain
    except:
        return ""

def generate_realistic_headers(user_agent=None):
    """Generate headers that look like a real browser"""
    if not user_agent:
        user_agent = get_random_user_agent()
    
    # Get current date for cookie
    now = datetime.now()
    consent_date = f"{now.year}{now.month:02d}{now.day:02d}"
    
    # Determine language - slight variation
    languages = [
        "en-US,en;q=0.9",
        "en-GB,en;q=0.8,en-US;q=0.7",
        "en-US,en;q=0.8,fr;q=0.5", 
        "en-CA,en;q=0.9,fr-CA;q=0.8",
        "en-US,en;q=0.9,es;q=0.4"
    ]
    language = random.choice(languages)
    
    # Generate a random cookie consent
    cookie_consent = f"CONSENT=YES+cb.{consent_date}-{random.randint(1,20)}-p0.en+FX+{random.randint(100,999)};"
    
    # Generate more realistic headers
    headers = {
        "User-Agent": user_agent,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": language,
        "Accept-Encoding": "gzip, deflate, br",
        "Connection": random.choice(["keep-alive", "close"]),
        "Cookie": cookie_consent,
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
        "Sec-Fetch-User": "?1",
        "DNT": random.choice(["1", "0"]),
        "Cache-Control": random.choice(["max-age=0", "no-cache"])
    }
    
    # Platform-specific headers
    if "Windows" in user_agent:
        headers["sec-ch-ua-platform"] = "Windows"
    elif "Macintosh" in user_agent:
        headers["sec-ch-ua-platform"] = "macOS" 
    elif "Linux" in user_agent:
        headers["sec-ch-ua-platform"] = "Linux"
    elif "Android" in user_agent:
        headers["sec-ch-ua-platform"] = "Android"
        headers["sec-ch-ua-mobile"] = "?1"
    elif "iPhone" in user_agent or "iPad" in user_agent:
        headers["sec-ch-ua-platform"] = "iOS"
        headers["sec-ch-ua-mobile"] = "?1"
    
    # Chrome/Firefox/Safari specific headers
    if "Chrome" in user_agent:
        chrome_version = user_agent.split("Chrome/")[1].split(" ")[0]
        headers["sec-ch-ua"] = f'"Google Chrome";v="{chrome_version.split(".")[0]}", "Chromium";v="{chrome_version.split(".")[0]}"'
    elif "Firefox" in user_agent:
        firefox_version = user_agent.split("Firefox/")[1].split(" ")[0]
        headers["sec-ch-ua"] = f'"Firefox";v="{firefox_version.split(".")[0]}"'
    elif "Safari" in user_agent and "Chrome" not in user_agent:
        headers["sec-ch-ua"] = '"Safari"'
        
    return headers

def scrape_google_with_requests_html(query, limit=200):
    """
    Scrape Google search results using requests-html with POST requests
    to bypass some scraping protection
    """
    if session is None:
        print("Error: requests_html module could not be imported properly")
        return []
        
    print(f"Starting Python requests-html scraping for query: {query}")
    
    all_results = []
    max_pages = min(limit // 10 + (1 if limit % 10 > 0 else 0), 20)
    
    try:
        for page_num in range(max_pages):
            if len(all_results) >= limit:
                break
                
            # Calculate start position for Google search pagination
            start = page_num * 10
            print(f"Scraping page {page_num + 1} (results {start + 1}-{start + 10})")
            
            # Get a random Google domain and user agent
            google_domain = get_random_google_domain()
            user_agent = get_random_user_agent()
            
            # Create URL with randomized parameters
            search_params = {
                'q': query,
                'start': str(start),
                'num': '10',
                'hl': 'en',
                'gl': 'us'
            }
            
            # Add some randomized parameters
            if random.random() > 0.5:
                search_params['filter'] = '0'
            if random.random() > 0.5:
                search_params['pws'] = '0'
            if random.random() > 0.7:
                search_params['nfpr'] = '1'
            
            # URL for GET fallback if POST fails
            url = f"{google_domain}/search"
            
            # Prepare headers
            headers = generate_realistic_headers(user_agent)
            
            # Use session for cookies persistence
            try:
                # Use refined GET request with anti-detection measures
                print(f"Making GET request to {url}")
                
                # Add a referer to look more legitimate
                if page_num > 0:
                    headers["Referer"] = f"{google_domain}/search?q={quote_plus(query)}&start={start-10}"
                else:
                    headers["Referer"] = f"{google_domain}/"
                
                # Prepare the URL with search parameters
                url_with_params = f"{url}?" + "&".join([f"{k}={quote_plus(v) if k == 'q' else v}" for k, v in search_params.items()])
                
                # Make the GET request
                response = session.get(
                    url_with_params,
                    headers=headers,
                    timeout=30
                )
                
                # Check for CAPTCHA or block
                if response.status_code == 429 or "captcha" in response.text.lower() or "unusual traffic" in response.text.lower():
                    print("GET blocked (CAPTCHA or rate limit). Trying with different domain and headers...")
                    
                    # Retry with different parameters and headers
                    headers = generate_realistic_headers()  # Fresh headers
                    
                    # Different Google domain for the retry
                    new_google_domain = get_random_google_domain()
                    url = f"{new_google_domain}/search"
                    url_with_params = f"{url}?" + "&".join([f"{k}={quote_plus(v) if k == 'q' else v}" for k, v in search_params.items()])
                    
                    # Add slight delay before retry
                    time.sleep(2)
                    response = session.get(url_with_params, headers=headers, timeout=30)
                    
                # Check if we got a valid response
                if response.status_code != 200:
                    print(f"Error: Status code {response.status_code}")
                    continue
                
                # Parse the results
                page_results = []
                
                # Find all search result containers
                for element in response.html.find('div.g, .Gx5Zad, .tF2Cxc, .yuRUbf, div[data-hveid]'):
                    try:
                        # Find title and link elements
                        title_el = element.find('h3', first=True)
                        link_el = element.find('a', first=True)
                        snippet_el = element.find('.VwiC3b, .lEBKkf, div[data-snc], .st', first=True)
                        
                        if title_el and link_el:
                            title = title_el.text.strip()
                            link = link_el.attrs.get('href', '')
                            snippet = snippet_el.text.strip() if snippet_el else ''
                            
                            # Only add valid results
                            if title and link and link.startswith('http'):
                                page_results.append({
                                    'title': title,
                                    'link': link,
                                    'snippet': snippet,
                                    'position': len(page_results) + 1,
                                    'source': 'google-python-post'
                                })
                    except Exception as e:
                        # Skip problematic results
                        print(f"Error parsing result: {e}")
                        continue
                
                print(f"Found {len(page_results)} results on page {page_num + 1}")
                
                # Add unique results to our collection
                for result in page_results:
                    if not any(r['link'] == result['link'] for r in all_results):
                        all_results.append(result)
                    
                    if len(all_results) >= limit:
                        break
                
                # Check if we should proceed to the next page
                if len(page_results) == 0:
                    print("No results found on this page, stopping pagination")
                    break
                
                # Check if there's a next page button
                next_button = response.html.find('a#pnnext, a.pn', first=True)
                if not next_button:
                    print("No more results pages found")
                    break
                
                # Add a delay between pages
                delay = add_natural_delay()
                print(f"Waiting {delay:.2f}s before next page...")
                
            except Exception as e:
                print(f"Error scraping page {page_num + 1}: {str(e)}")
                continue
        
        print(f"Python requests-html scraping complete, found {len(all_results)} results")
        return all_results[:limit]
        
    except Exception as e:
        print(f"Error in Python scraping: {str(e)}")
        return []

def get_similar_websites_with_python(domain):
    """Find similar websites using Python-based scraping"""
    if session is None:
        print("Error: requests_html module could not be imported properly")
        return []
        
    print(f"Finding similar websites for domain: {domain} using Python")
    domain_name = domain.replace('www.', '')
    
    all_competitors = []
    
    # Create a list of search queries to find competitors
    competitor_queries = [
        f"competitors of {domain_name}",
        f"sites like {domain_name}",
        f"alternatives to {domain_name}",
        f"companies similar to {domain_name}"
    ]
    
    try:
        # Try each competitor query
        for query in competitor_queries:
            if len(all_competitors) >= 15:
                break
                
            print(f"Searching for: {query}")
            
            try:
                # Get a random Google domain and user agent
                google_domain = get_random_google_domain()
                user_agent = get_random_user_agent()
                headers = generate_realistic_headers(user_agent)
                
                # Create search parameters
                search_params = {
                    'q': query,
                    'num': '30',
                    'hl': 'en',
                    'gl': 'us'
                }
                
                # Use GET with anti-detection measures
                url = f"{google_domain}/search"
                try:
                    # Build the search URL with parameters
                    query_url = f"{url}?" + "&".join([f"{k}={quote_plus(v) if k == 'q' else v}" for k, v in search_params.items()])
                    
                    # Add a referer to look more legitimate
                    headers["Referer"] = f"{google_domain}/"
                    
                    # Make GET request
                    print(f"Making GET request to find competitors: {query_url}")
                    response = session.get(query_url, headers=headers, timeout=30)
                    
                    if response.status_code != 200 or "captcha" in response.text.lower():
                        # Try with different domain and headers
                        print("First GET attempt blocked, trying with different domain and headers...")
                        headers = generate_realistic_headers()  # Fresh headers
                        new_google_domain = get_random_google_domain()
                        query_url = f"{new_google_domain}/search?q={quote_plus(query)}&num=30&hl=en&gl=us"
                        
                        # Add slight delay before retry
                        time.sleep(2)
                        response = session.get(query_url, headers=headers, timeout=30)
                
                except Exception as e:
                    # Try again with simplified parameters
                    print(f"Error making request: {str(e)}, trying simplified approach")
                    query_url = f"{url}?q={quote_plus(query)}&num=30&hl=en&gl=us"
                    headers = generate_realistic_headers()  # Fresh headers
                    response = session.get(query_url, headers=headers, timeout=30)
                
                # Check for valid response
                if response.status_code != 200:
                    print(f"Error: Status code {response.status_code}")
                    continue
                
                # Find all links
                competitors = []
                
                for link in response.html.absolute_links:
                    try:
                        # Skip Google's own links and the domain we're analyzing
                        if "google.com" in link or domain_name in link:
                            continue
                            
                        # Extract domain
                        competitor_domain = extract_domain(link)
                        
                        # Skip if already in results or empty
                        if not competitor_domain or competitor_domain in competitors:
                            continue
                            
                        competitors.append(competitor_domain)
                    except Exception:
                        continue
                
                print(f"Found {len(competitors)} possible competitors from query: {query}")
                
                # Add unique competitors to our list
                for comp in competitors:
                    if comp not in all_competitors and comp != domain_name:
                        all_competitors.append(comp)
                        
                # Add a delay between queries
                delay = random.uniform(3, 8)
                time.sleep(delay)
                
            except Exception as e:
                print(f"Error searching for {query}: {str(e)}")
                continue
                
        print(f"Found a total of {len(all_competitors)} competitor domains for {domain}")
        return all_competitors[:15]
        
    except Exception as e:
        print(f"Error in getting similar websites: {str(e)}")
        return []

def main():
    """Command-line interface for testing"""
    if len(sys.argv) < 3:
        print("Usage: python pythonScraper.py <function> <query> [limit]")
        print("Functions: search, similar")
        sys.exit(1)
    
    function = sys.argv[1]
    query = sys.argv[2]
    limit = int(sys.argv[3]) if len(sys.argv) > 3 else 200
    
    if function == "search":
        # Test requests-html scraper
        results = scrape_google_with_requests_html(query, limit)
        print(json.dumps(results, indent=2))
    elif function == "similar":
        results = get_similar_websites_with_python(query)
        print(json.dumps(results, indent=2))
    else:
        print(f"Unknown function: {function}")
        sys.exit(1)

if __name__ == "__main__":
    main()