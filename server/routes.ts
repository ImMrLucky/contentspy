import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertWebsiteAnalysisSchema } from "@shared/schema";
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
      
      // First find competitor domains
      const competitorDomains = await findCompetitorDomains(domain, 10, keywords);
      // Then process content from those domains
      const competitorResults = await processCompetitorContent(domain, competitorDomains, keywords);
      
      // Store competitor content and keywords in database
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
      
      // Return analysis results
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
