import {
  users,
  type User,
  type InsertUser,
  websiteAnalysis,
  type WebsiteAnalysis,
  type InsertWebsiteAnalysis,
  competitorContent,
  type CompetitorContent,
  type InsertCompetitorContent,
  keywords,
  type Keyword,
  type InsertKeyword
} from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  createAnalysis(analysis: InsertWebsiteAnalysis): Promise<WebsiteAnalysis>;
  getAnalysis(id: number): Promise<WebsiteAnalysis | undefined>;
  getAnalysisByUrl(url: string): Promise<WebsiteAnalysis | undefined>;
  getAnalysisByUserId(userId: number): Promise<WebsiteAnalysis[]>;
  
  createCompetitorContent(content: InsertCompetitorContent): Promise<CompetitorContent>;
  getCompetitorContentByAnalysisId(analysisId: number): Promise<CompetitorContent[]>;
  
  createKeyword(keyword: InsertKeyword): Promise<Keyword>;
  getKeywordsByContentId(contentId: number): Promise<Keyword[]>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private analyses: Map<number, WebsiteAnalysis>;
  private contents: Map<number, CompetitorContent>;
  private keywordsList: Map<number, Keyword>;
  
  private currentUserId: number;
  private currentAnalysisId: number;
  private currentContentId: number;
  private currentKeywordId: number;

  constructor() {
    this.users = new Map();
    this.analyses = new Map();
    this.contents = new Map();
    this.keywordsList = new Map();
    
    this.currentUserId = 1;
    this.currentAnalysisId = 1;
    this.currentContentId = 1;
    this.currentKeywordId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async createAnalysis(analysis: InsertWebsiteAnalysis): Promise<WebsiteAnalysis> {
    const id = this.currentAnalysisId++;
    const createdAt = new Date();
    // Ensure userId is either a number or null, not undefined
    const userId = analysis.userId === undefined ? null : analysis.userId;
    const newAnalysis: WebsiteAnalysis = { ...analysis, id, createdAt, userId };
    this.analyses.set(id, newAnalysis);
    return newAnalysis;
  }
  
  async getAnalysis(id: number): Promise<WebsiteAnalysis | undefined> {
    return this.analyses.get(id);
  }
  
  async getAnalysisByUrl(url: string): Promise<WebsiteAnalysis | undefined> {
    return Array.from(this.analyses.values()).find(
      (analysis) => analysis.url === url,
    );
  }
  
  async getAnalysisByUserId(userId: number): Promise<WebsiteAnalysis[]> {
    return Array.from(this.analyses.values()).filter(
      (analysis) => analysis.userId === userId,
    );
  }
  
  async createCompetitorContent(content: InsertCompetitorContent): Promise<CompetitorContent> {
    const id = this.currentContentId++;
    // Ensure analysisId is either a number or null, not undefined
    const analysisId = content.analysisId === undefined ? null : content.analysisId;
    const newContent: CompetitorContent = { 
      ...content, 
      id, 
      analysisId,
      // Ensure nullable fields have default values
      publishDate: content.publishDate || null,
      description: content.description || null,
      trafficLevel: content.trafficLevel || null
    };
    this.contents.set(id, newContent);
    return newContent;
  }
  
  async getCompetitorContentByAnalysisId(analysisId: number): Promise<CompetitorContent[]> {
    return Array.from(this.contents.values()).filter(
      (content) => content.analysisId === analysisId,
    );
  }
  
  async createKeyword(keyword: InsertKeyword): Promise<Keyword> {
    const id = this.currentKeywordId++;
    // Ensure contentId is either a number or null, not undefined
    const contentId = keyword.contentId === undefined ? null : keyword.contentId;
    const newKeyword: Keyword = { ...keyword, id, contentId };
    this.keywordsList.set(id, newKeyword);
    return newKeyword;
  }
  
  async getKeywordsByContentId(contentId: number): Promise<Keyword[]> {
    return Array.from(this.keywordsList.values()).filter(
      (keyword) => keyword.contentId === contentId,
    );
  }
}

export const storage = new MemStorage();
