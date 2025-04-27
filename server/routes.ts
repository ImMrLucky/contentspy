import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  generateInsights,
  generateRecommendations,
  extractDomain,
  ensureProxiesInitialized
} from "./services/apiService";

import { 
  scrapeGoogleWithPuppeteer,
  findSimilarDomainsWithPuppeteer, 
  getDomainContentWithPuppeteer,
  cleanupPuppeteerResources
} from "./services/puppeteerScraper";

import {
  scrapeGoogle,
  getDomainContent,
  findSimilarDomains 
} from "./services/enhancedScraper";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Initialize proxy rotation system in the background
  setTimeout(() => {
    ensureProxiesInitialized()
      .then(() => console.log('Proxy rotation system initialized successfully'))
      .catch(err => console.error('Failed to initialize proxy rotation system:', err));
  }, 2000); // Slight delay after server startup

  // API endpoint to analyze a website
  app.post("/api/analyze", async (req: Request, res: Response) => {
    console.log("Received analyze request");
    try {
      const { url, keywords } = req.body;
      console.log(`Analyzing URL: ${url}`);
      if (keywords) {
        console.log(`Using keywords: ${keywords}`);
      }
      
      // Validate URL format
      if (!url || typeof url !== 'string') {
        console.log("Invalid URL: not a string or empty");
        return res.status(400).json({ message: "Valid URL is required" });
      }
      
      try {
        new URL(url);
      } catch (e: any) {
        console.log(`Invalid URL format: ${e.message || "Unknown error"}`);
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Create website analysis record
      const analysis = await storage.createAnalysis({
        url,
        userId: null // No user authentication in this demo
      });
      
      // Extract domain from URL
      const domain = extractDomain(url);
      
      // First return a loading response to avoid timeout
      const loadingResponse = {
        analysis,
        competitorContent: [],
        insights: {
          topContentType: "Analyzing...",
          avgContentLength: "Calculating...",
          keyCompetitors: "Identifying...",
          contentGapScore: "50",
          keywordClusters: [
            { name: "Loading", count: 0, color: "blue" }
          ]
        },
        recommendations: [
          {
            title: "Analysis in progress...",
            description: "We're analyzing your competitors to generate recommendations. Results will appear shortly.",
            keywords: ["analyzing"],
            color: "blue"
          }
        ]
      };

      // Send preliminary response immediately
      res.status(200).json(loadingResponse);

      // Continue processing in the background
      (async () => {
        try {
          // Parse keywords
          const keywordArray = keywords ? keywords.split(',').map(k => k.trim()).filter(k => k) : [];
          
          // First try puppeteer scraping, then fall back to HTTP-based scraping
          console.log(`Finding competitor domains for ${domain}`);
          let competitorDomains: string[];
          
          try {
            // Try puppeteer first
            try {
              competitorDomains = await findSimilarDomainsWithPuppeteer(domain, keywordArray, 5);
              console.log(`Found ${competitorDomains.length} competitor domains from puppeteer scraping`);
            } catch (error) {
              // Fall back to HTTP-based scraping
              console.log("Puppeteer scraping failed, falling back to HTTP scraping");
              competitorDomains = await findSimilarDomains(domain, keywordArray, 5);
              console.log(`Found ${competitorDomains.length} competitor domains from HTTP scraping`);
            }
          } catch (error) {
            console.error("Error finding competitor domains:", error);
            competitorDomains = [];
          }
          
          // If no competitor domains found, try one more time with generic approach
          if (!competitorDomains || competitorDomains.length === 0) {
            console.log("No competitors found, trying generic search");
            try {
              competitorDomains = await findSimilarDomains(domain, [], 5);
              console.log(`Found ${competitorDomains.length} competitor domains from generic search`);
            } catch (error) {
              console.error("Error in generic competitor domain search:", error);
              competitorDomains = [];
            }
          }
          
          // Process content from competitor domains
          console.log(`Getting content from ${competitorDomains.length} competitor domains`);
          const competitorResults: any[] = [];
          
          // Process each competitor domain using both methods
          for (const competitorDomain of competitorDomains) {
            try {
              let domainContent;
              
              // Try puppeteer first, then fall back to HTTP scraping
              try {
                // Get up to 3 content items per competitor with puppeteer
                domainContent = await getDomainContentWithPuppeteer(competitorDomain, keywordArray, 3);
              } catch (error) {
                console.log(`Puppeteer failed for ${competitorDomain}, using HTTP scraper`);
                // Fall back to HTTP scraping
                domainContent = await getDomainContent(competitorDomain, keywordArray, 3);
              }
              
              if (domainContent && domainContent.length > 0) {
                competitorResults.push(...domainContent);
              }
            } catch (error) {
              console.error(`Error getting content for ${competitorDomain}:`, error);
            }
          }
          
          // If we didn't get any results, try scraping the main domain for content
          if (competitorResults.length === 0) {
            try {
              console.log(`No competitor content found, scraping content from ${domain} directly`);
              let mainDomainContent;
              
              // Try puppeteer first, then fall back to HTTP scraping
              try {
                mainDomainContent = await getDomainContentWithPuppeteer(domain, keywordArray, 5);
              } catch (error) {
                console.log(`Puppeteer failed for ${domain}, using HTTP scraper`);
                mainDomainContent = await getDomainContent(domain, keywordArray, 5);
              }
              
              if (mainDomainContent && mainDomainContent.length > 0) {
                competitorResults.push(...mainDomainContent);
              }
            } catch (error) {
              console.error(`Error getting content for ${domain}:`, error);
            }
          }
          
          console.log(`Got ${competitorResults.length} competitor content items`);
          
          // Store competitor content and keywords in database
          const storedResults = await Promise.all(
            competitorResults.map(async (result) => {
              const content = await storage.createCompetitorContent({
                analysisId: analysis.id,
                title: result.title || "",
                url: result.link || "",
                domain: result.domain || "",
                publishDate: result.publishDate,
                description: result.snippet || "",
                trafficLevel: result.trafficLevel || "Medium",
              });
              
              // Store keywords for this content
              const storedKeywords = await Promise.all(
                (result.keywords || []).map(async (keyword: string) => {
                  return storage.createKeyword({
                    contentId: content.id,
                    keyword,
                  });
                })
              );
              
              return {
                ...content,
                keywords: storedKeywords.map(k => k.keyword)
              };
            })
          );
          
          console.log(`Stored ${storedResults.length} competitor content items`);
          
          // Generate insights from the competitor content
          const insights = generateInsights(competitorResults);
          
          // Generate content recommendations based on insights
          const recommendations = generateRecommendations(competitorResults, insights);
          
          console.log('Analysis completed successfully');
          
          // We don't return a response here since we already sent a preliminary one
          // The client will need to poll for the complete results or use websockets
          
        } catch (error) {
          console.error("Error in background processing:", error);
        }
      })();
      
    } catch (error) {
      console.error("Error in /api/analyze:", error);
      return res.status(500).json({ message: "Error analyzing website" });
    }
  });
  
  // API endpoint to get analysis results
  app.get("/api/analysis/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const analysisId = parseInt(id, 10);
      
      if (isNaN(analysisId)) {
        return res.status(400).json({ message: "Invalid analysis ID" });
      }
      
      // Get the analysis
      const analysis = await storage.getAnalysis(analysisId);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      
      // Get competitor content for this analysis
      const competitorContent = await storage.getCompetitorContentByAnalysisId(analysisId);
      
      // Get keywords for each content item
      const contentWithKeywords = await Promise.all(
        competitorContent.map(async (content) => {
          const keywords = await storage.getKeywordsByContentId(content.id);
          return {
            ...content,
            keywords: keywords.map(k => k.keyword)
          };
        })
      );
      
      // Generate insights and recommendations
      const insights = generateInsights(contentWithKeywords);
      const recommendations = generateRecommendations(contentWithKeywords, insights);
      
      return res.status(200).json({
        analysis,
        competitorContent: contentWithKeywords,
        insights,
        recommendations
      });
    } catch (error) {
      console.error("Error in /api/analysis/:id:", error);
      return res.status(500).json({ message: "Error getting analysis results" });
    }
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
  });

  return httpServer;
}