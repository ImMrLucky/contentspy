import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { 
  generateInsights,
  generateRecommendations,
  extractDomain
} from '../../server/services/apiService.js';
import { storage } from '../../server/storage.js';
import { scrapeGoogle, getDomainContent, findSimilarDomains } from '../../server/services/enhancedScraper.js';

const app = express();

// Middleware
app.use(express.json());
app.use(cors());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'ok' });
});

// API endpoint to analyze a website
app.post('/api/analyze', async (req, res) => {
  try {
    console.log("Netlify function: Received analyze request");
    
    // Check for valid request body
    if (!req.body || !req.body.url) {
      return res.status(400).json({ message: "Valid URL is required" });
    }
    
    const { url, keywords } = req.body;
    
    // Extract domain from URL
    const domain = extractDomain(url);
    console.log(`Netlify function: Analyzing domain ${domain}`);
    
    // Split keywords into array
    const keywordArray = keywords ? keywords.split(/,|\n/).map(k => k.trim()).filter(Boolean) : [];
    
    // Create initial analysis record
    const analysis = await storage.createAnalysis({
      url,
      userId: null // No user authentication in this demo
    });
    
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
        console.log(`Netlify function: Starting background processing for ${domain}`);
        
        // Find competitor domains using HTTP-based scraping
        console.log(`Netlify function: Finding competitor domains for ${domain}`);
        let competitorDomains;
        
        try {
          competitorDomains = await findSimilarDomains(domain, keywordArray, 5);
          console.log(`Netlify function: Found ${competitorDomains.length} competitor domains`);
        } catch (error) {
          console.error("Netlify function: Error finding competitor domains:", error);
          competitorDomains = [];
        }
        
        // If no competitor domains found, try one more time with generic approach
        if (!competitorDomains || competitorDomains.length === 0) {
          console.log("Netlify function: No competitors found, trying generic search");
          try {
            competitorDomains = await findSimilarDomains(domain, [], 5);
            console.log(`Netlify function: Found ${competitorDomains.length} competitor domains from generic search`);
          } catch (error) {
            console.error("Netlify function: Error in generic competitor domain search:", error);
            competitorDomains = [];
          }
        }
        
        // Process content from competitor domains
        console.log(`Netlify function: Getting content from ${competitorDomains.length} competitor domains`);
        const competitorResults = [];
        
        // Process each competitor domain using HTTP-based scraping
        for (const competitorDomain of competitorDomains) {
          try {
            // Get up to 3 content items per competitor
            const domainContent = await getDomainContent(competitorDomain, keywordArray, 3);
            
            if (domainContent && domainContent.length > 0) {
              competitorResults.push(...domainContent);
            }
          } catch (error) {
            console.error(`Netlify function: Error getting content for ${competitorDomain}:`, error);
          }
        }
        
        // If we didn't get any results, try scraping the main domain for content
        if (competitorResults.length === 0) {
          try {
            console.log(`Netlify function: No competitor content found, scraping content from ${domain} directly`);
            const mainDomainContent = await getDomainContent(domain, keywordArray, 5);
            
            if (mainDomainContent && mainDomainContent.length > 0) {
              competitorResults.push(...mainDomainContent);
            }
          } catch (error) {
            console.error(`Netlify function: Error getting content for ${domain}:`, error);
          }
        }
        
        console.log(`Netlify function: Got ${competitorResults.length} competitor content items`);
        
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
              (result.keywords || []).map(async (keyword) => {
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
        
        // Generate insights from the competitor content
        const insights = generateInsights(competitorResults);
        
        // Generate content recommendations based on insights
        const recommendations = generateRecommendations(competitorResults, insights);
        
        console.log('Netlify function: Analysis completed successfully');
        
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
app.get("/api/analysis/:id", async (req, res) => {
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
app.use((err, _req, res, _next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

// Export the serverless function
export const handler = serverless(app);