import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import { 
  processCompetitorContent, 
  findCompetitorDomains, 
  extractDomain, 
  getSearchResults 
} from '../../server/services/apiService.js';
import { storage } from '../../server/storage.js';
import { insertWebsiteAnalysisSchema } from '../../shared/schema.js';

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
    // Parse and validate request body
    const parseResult = insertWebsiteAnalysisSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ message: "Invalid request body" });
    }
    
    const { url, keywords } = parseResult.data;
    
    // Extract domain from URL
    const domain = extractDomain(url);
    
    // Split keywords into array
    const keywordArray = keywords ? keywords.split(/,|\n/).map(k => k.trim()) : [];
    
    // Create initial analysis record
    const analysis = await storage.createAnalysis({
      url,
      keywords: keywordArray.join(', '),
      status: "Pending",
      userId: 1, // Default user ID for now
    });
    
    // Send initial response with analysis ID
    res.status(202).json({
      message: "Analysis started",
      analysisId: analysis.id
    });
    
    // Continue processing in the background
    (async () => {
      try {
        console.log(`Starting background processing for ${domain}`);
        
        // Update analysis status
        analysis.status = "Processing";
        
        // Find competitor domains
        console.log(`Finding competitor domains for ${domain}`);
        const competitorDomains = await findCompetitorDomains(domain, 5, keywords);
        
        // Get content from competitors
        console.log(`Finding competitor content for domains: ${competitorDomains.join(', ')}`);
        let competitorResults = await processCompetitorContent(domain, competitorDomains, keywordArray);
        
        // If we didn't get any results, try scraping the main domain for content
        if (competitorResults.length === 0) {
          try {
            console.log(`No competitor content found, scraping content from ${domain} directly`);
            const mainDomainContent = await getSearchResults(domain, 5);
            
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
        
        console.log('Analysis completed successfully');
        
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
    
    return res.status(200).json({
      analysis,
      competitorContent: contentWithKeywords,
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