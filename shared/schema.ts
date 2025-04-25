import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const websiteAnalysis = pgTable("website_analysis", {
  id: serial("id").primaryKey(),
  url: text("url").notNull(),
  userId: integer("user_id").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertWebsiteAnalysisSchema = createInsertSchema(websiteAnalysis).pick({
  url: true,
  userId: true,
});

export const competitorContent = pgTable("competitor_content", {
  id: serial("id").primaryKey(),
  analysisId: integer("analysis_id").references(() => websiteAnalysis.id),
  title: text("title").notNull(),
  url: text("url").notNull(),
  domain: text("domain").notNull(),
  publishDate: text("publish_date"),
  description: text("description"),
  trafficLevel: text("traffic_level"),
});

export const insertCompetitorContentSchema = createInsertSchema(competitorContent).omit({
  id: true,
});

export const keywords = pgTable("keywords", {
  id: serial("id").primaryKey(),
  contentId: integer("content_id").references(() => competitorContent.id),
  keyword: text("keyword").notNull(),
});

export const insertKeywordSchema = createInsertSchema(keywords).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertWebsiteAnalysis = z.infer<typeof insertWebsiteAnalysisSchema>;
export type WebsiteAnalysis = typeof websiteAnalysis.$inferSelect;

export type InsertCompetitorContent = z.infer<typeof insertCompetitorContentSchema>;
export type CompetitorContent = typeof competitorContent.$inferSelect;

export type InsertKeyword = z.infer<typeof insertKeywordSchema>;
export type Keyword = typeof keywords.$inferSelect;
