import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import axios from "axios";
import * as cheerio from "cheerio";
import { insertWebsiteAnalysisSchema, insertCompetitorContentSchema, insertKeywordSchema } from "@shared/schema";
import { z } from "zod";
import natural from "natural";

// Mock search engine results when real APIs can't be accessed
const mockSearchEngines = async (domain: string) => {
  const results = [
    {
      title: "10 Essential SEO Strategies for E-commerce Websites",
      url: "https://competitor-seo.com/essential-strategies",
      domain: "competitor-seo.com",
      publishDate: "3 months ago",
      description: "This comprehensive guide covers advanced SEO techniques specifically tailored for e-commerce websites, focusing on product optimization and conversion strategies.",
      trafficLevel: "High traffic",
      keywords: ["e-commerce SEO", "product optimization", "conversion rate", "product schema", "category pages"]
    },
    {
      title: "How to Build a Content Strategy for Online Marketplaces",
      url: "https://digitalmarketing-pro.com/content-strategy",
      domain: "digitalmarketing-pro.com",
      publishDate: "1 month ago",
      description: "This article explains how to develop a content marketing plan specifically designed for marketplace businesses and multi-vendor platforms.",
      trafficLevel: "Medium traffic",
      keywords: ["content strategy", "online marketplace", "vendor marketing", "customer journey", "multi-vendor SEO"]
    },
    {
      title: "Complete Guide to Product Description Optimization",
      url: "https://ecommerce-tactics.com/product-descriptions",
      domain: "ecommerce-tactics.com",
      publishDate: "2 months ago",
      description: "Learn how to write compelling product descriptions that both convert customers and rank well in search engines, with practical examples and templates.",
      trafficLevel: "High traffic",
      keywords: ["product descriptions", "conversion copywriting", "SEO descriptions", "product content", "e-commerce writing"]
    }
  ];

  return results;
};

// Extract keywords from text using Natural
const extractKeywords = (text: string, count = 5): string[] => {
  const tokenizer = new natural.WordTokenizer();
  const tokens = tokenizer.tokenize(text.toLowerCase()) || [];
  
  // Remove common stopwords
  const stopwords = ["a", "about", "an", "and", "are", "as", "at", "be", "by", "for", "from", "how", "in", "is", "it", "of", "on", "or", "that", "the", "this", "to", "was", "what", "when", "where", "who", "will", "with"];
  const filteredTokens = tokens.filter(token => !stopwords.includes(token) && token.length > 2);
  
  // Count occurrences
  const wordFrequency: Record<string, number> = {};
  filteredTokens.forEach(token => {
    wordFrequency[token] = (wordFrequency[token] || 0) + 1;
  });
  
  // Sort by frequency
  const sortedWords = Object.entries(wordFrequency)
    .sort((a, b) => b[1] - a[1])
    .map(entry => entry[0]);
  
  return sortedWords.slice(0, count);
};

// Fetch and analyze website content
const analyzeWebsite = async (url: string) => {
  try {
    // Extract domain from URL
    const domain = new URL(url).hostname.replace('www.', '');
    
    // In a real implementation, this would call search APIs and use real data
    // For now, we'll use the mock data
    const competitorResults = await mockSearchEngines(domain);
    
    return competitorResults;
  } catch (error) {
    console.error("Error analyzing website:", error);
    throw error;
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // API endpoint to analyze a website
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { url } = req.body;
      
      // Validate URL format
      if (!url || typeof url !== 'string') {
        return res.status(400).json({ message: "Valid URL is required" });
      }
      
      try {
        new URL(url);
      } catch (e) {
        return res.status(400).json({ message: "Invalid URL format" });
      }
      
      // Create website analysis record
      const analysis = await storage.createAnalysis({
        url,
        userId: null // No user authentication in this demo
      });
      
      // Analyze website and get competitor content
      const competitorResults = await analyzeWebsite(url);
      
      // Store competitor content and keywords
      const storedResults = await Promise.all(
        competitorResults.map(async (result) => {
          const content = await storage.createCompetitorContent({
            analysisId: analysis.id,
            title: result.title,
            url: result.url,
            domain: result.domain,
            publishDate: result.publishDate,
            description: result.description,
            trafficLevel: result.trafficLevel,
          });
          
          // Store keywords for this content
          const storedKeywords = await Promise.all(
            result.keywords.map(async (keyword) => {
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
      
      // Return analysis results
      return res.status(200).json({ 
        analysis,
        competitorContent: storedResults,
        insights: {
          topContentType: "How-to Guides",
          avgContentLength: "1,850 words",
          keyCompetitors: "5 identified",
          contentGapScore: "68/100",
          keywordClusters: [
            { name: "Product Optimization", count: 24, color: "primary" },
            { name: "Marketplace Strategy", count: 18, color: "secondary" },
            { name: "User Experience", count: 15, color: "accent" },
            { name: "Mobile Optimization", count: 12, color: "success" },
            { name: "Conversion Techniques", count: 11, color: "warning" },
            { name: "Analytics Integration", count: 8, color: "error" }
          ]
        },
        recommendations: [
          {
            title: "Create Product Comparison Guides",
            description: "Competitors are gaining significant traffic with product comparison content. Consider creating comprehensive guides comparing products within your niche.",
            keywords: ["product comparison", "buying guides", "feature analysis"],
            color: "primary"
          },
          {
            title: "Develop How-to Content for Mobile Users",
            description: "Analysis shows a gap in mobile-optimized how-to content that competitors haven't fully addressed. Focus on creating mobile-friendly tutorials.",
            keywords: ["mobile optimization", "tutorial content", "responsive design"],
            color: "secondary"
          },
          {
            title: "Improve Product Description Format",
            description: "Top competitors use structured product descriptions with technical specifications highlighted separately from benefits. Consider reformatting your product content.",
            keywords: ["product content", "formatting", "specification tables"],
            color: "accent"
          }
        ]
      });
    } catch (error) {
      console.error("Error in /api/analyze:", error);
      return res.status(500).json({ message: "Error analyzing website" });
    }
  });

  return httpServer;
}
