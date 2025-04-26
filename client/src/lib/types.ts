// Analysis types 
export interface WebsiteAnalysis {
  id: number;
  url: string;
  userId: number | null;
  createdAt: Date;
}

export interface Keyword {
  id: number;
  contentId: number;
  keyword: string;
}

export interface CompetitorContent {
  id: number;
  analysisId: number;
  title: string;
  url: string;
  domain: string;
  publishDate?: string;
  description?: string;
  trafficLevel?: string;
  trafficScore?: number;  // Numeric score for traffic volume (higher = more traffic)
  source?: string;        // The search engine source (google, bing, yahoo, duckduckgo)
  keywords: string[];
}

export interface KeywordCluster {
  name: string;
  count: number;
  color: string;
}

export interface InsightsSummary {
  topContentType: string;
  avgContentLength: string;
  keyCompetitors: string;
  contentGapScore: string;
  keywordClusters: KeywordCluster[];
}

export interface ContentRecommendation {
  title: string;
  description: string;
  keywords: string[];
  color: string;
}

export interface AnalysisResult {
  analysis: WebsiteAnalysis;
  competitorContent: CompetitorContent[];
  insights: InsightsSummary;
  recommendations: ContentRecommendation[];
}
