import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import {
  processCompetitorContent,
  generateInsights,
  generateRecommendations,
  extractDomain,
  ensureProxiesInitialized,
  findCompetitorDomains
} from "./services/apiService";

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
      
      // Process competitor content using real APIs
      console.log(`Starting competitor content analysis for ${domain}`);
      
      // Create industry-specific fallback domains (used when scraping fails)
      const industryDomains = {
        'insurance': ['statefarm.com', 'geico.com', 'progressive.com', 'allstate.com', 'libertymutual.com'],
        'finance': ['bankofamerica.com', 'chase.com', 'wellsfargo.com', 'capitalone.com', 'discover.com'],
        'health': ['mayoclinic.org', 'webmd.com', 'healthline.com', 'medlineplus.gov', 'nih.gov'],
        'tech': ['microsoft.com', 'apple.com', 'google.com', 'samsung.com', 'dell.com'],
        'ecommerce': ['amazon.com', 'walmart.com', 'target.com', 'bestbuy.com', 'etsy.com'],
        'general': ['blog.hubspot.com', 'forbes.com', 'entrepreneur.com', 'businessinsider.com', 'medium.com']
      };
      
      // Determine industry from domain/keywords
      let industry = 'general';
      const lowerDomain = domain.toLowerCase();
      const lowerKeywords = keywords?.toLowerCase() || '';
      
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
      
      // Try to find competitor domains
      let competitorDomains;
      try {
        competitorDomains = await findCompetitorDomains(domain, 5, keywords);
        console.log(`Found ${competitorDomains.length} competitor domains from search`);
      } catch (error) {
        console.error("Error finding competitor domains:", error);
        competitorDomains = [];
      }
      
      // If no competitor domains found, use fallbacks
      if (!competitorDomains || competitorDomains.length === 0) {
        console.log(`No competitor domains found via search, using ${industry} industry fallbacks`);
        competitorDomains = industryDomains[industry] || industryDomains.general;
      }
      
      // Process content from competitor domains
      const competitorResults = await processCompetitorContent(domain, competitorDomains, keywords);
      
      // Store competitor content in database
      const storedResults = await Promise.all(
        competitorResults.map(async (result) => {
          const content = await storage.createCompetitorContent({
            analysisId: analysis.id,
            title: result.title || "",
            url: result.url || "",
            domain: result.domain || "",
            publishDate: result.publishDate,
            description: result.description,
            trafficLevel: result.trafficLevel,
          });
          
          // Store keywords
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
      
      // Return the full analysis results
      return res.status(200).json({
        analysis,
        competitorContent: storedResults,
        insights,
        recommendations
      });
    } catch (error) {
      console.error("Error in /api/analyze:", error);
      return res.status(500).json({ message: "Error analyzing website" });
    }
  });

  // Error handling middleware
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ message: "Internal server error" });
  });

  return httpServer;
}