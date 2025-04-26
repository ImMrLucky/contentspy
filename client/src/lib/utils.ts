import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { 
  AnalysisResult, 
  CompetitorContent, 
  ContentRecommendation, 
  InsightsSummary 
} from "./types"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Convert analysis results to CSV format
 */
export function analysisToCSV(data: AnalysisResult): string {
  if (!data || !data.competitorContent || data.competitorContent.length === 0) {
    return "No data available for export"
  }

  // Create header row
  const headers = ["Title", "URL", "Domain", "Traffic Level", "Keywords", "Publish Date", "Description"]
  
  // Create data rows
  const rows = data.competitorContent.map(content => [
    `"${(content.title || "").replace(/"/g, '""')}"`,
    `"${(content.url || "").replace(/"/g, '""')}"`,
    `"${(content.domain || "").replace(/"/g, '""')}"`,
    `"${(content.trafficLevel || "").replace(/"/g, '""')}"`,
    `"${(content.keywords || []).join(", ").replace(/"/g, '""')}"`,
    `"${(content.publishDate || "").replace(/"/g, '""')}"`,
    `"${(content.description || "").replace(/"/g, '""')}"`
  ])
  
  // Combine header and rows
  return [headers.join(","), ...rows.map(row => row.join(","))].join("\n")
}

/**
 * Convert insights data to CSV format
 */
export function insightsToCSV(data: InsightsSummary): string {
  if (!data) {
    return "No insights data available for export"
  }
  
  let csvContent = "Insights Summary\n"
  csvContent += `Top Content Type,${data.topContentType}\n`
  csvContent += `Average Content Length,${data.avgContentLength}\n`
  csvContent += `Key Competitors,${data.keyCompetitors}\n`
  csvContent += `Content Gap Score,${data.contentGapScore}\n\n`
  
  csvContent += "Keyword Clusters\n"
  csvContent += "Keyword,Count\n"
  
  data.keywordClusters.forEach(cluster => {
    csvContent += `"${cluster.name}",${cluster.count}\n`
  })
  
  return csvContent
}

/**
 * Convert recommendations to CSV format
 */
export function recommendationsToCSV(data: ContentRecommendation[]): string {
  if (!data || data.length === 0) {
    return "No recommendations data available for export"
  }
  
  let csvContent = "Content Recommendations\n"
  csvContent += "Title,Description,Keywords\n"
  
  data.forEach(rec => {
    csvContent += `"${rec.title.replace(/"/g, '""')}",`
    csvContent += `"${rec.description.replace(/"/g, '""')}",`
    csvContent += `"${(rec.keywords || []).join(", ").replace(/"/g, '""')}"\n`
  })
  
  return csvContent
}

/**
 * Download content as a file
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement("a")
  const file = new Blob([content], { type: contentType })
  a.href = URL.createObjectURL(file)
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
}

/**
 * Export analysis results as CSV
 */
export function exportAnalysisAsCSV(data: AnalysisResult): void {
  if (!data) return
  
  const csvContent = analysisToCSV(data)
  const domain = extractDomainFromUrl(data.analysis.url)
  const fileName = `competitor-analysis-${domain}-${formatDateForFileName()}.csv`
  
  downloadFile(csvContent, fileName, "text/csv;charset=utf-8;")
}

/**
 * Export insights as CSV
 */
export function exportInsightsAsCSV(data: InsightsSummary, domainUrl: string): void {
  if (!data) return
  
  const csvContent = insightsToCSV(data)
  const domain = extractDomainFromUrl(domainUrl)
  const fileName = `insights-${domain}-${formatDateForFileName()}.csv`
  
  downloadFile(csvContent, fileName, "text/csv;charset=utf-8;")
}

/**
 * Export recommendations as CSV
 */
export function exportRecommendationsAsCSV(data: ContentRecommendation[], domainUrl: string): void {
  if (!data || data.length === 0) return
  
  const csvContent = recommendationsToCSV(data)
  const domain = extractDomainFromUrl(domainUrl)
  const fileName = `recommendations-${domain}-${formatDateForFileName()}.csv`
  
  downloadFile(csvContent, fileName, "text/csv;charset=utf-8;")
}

/**
 * Export analysis as JSON
 */
export function exportAnalysisAsJSON(data: AnalysisResult): void {
  if (!data) return
  
  const jsonContent = JSON.stringify(data, null, 2)
  const domain = extractDomainFromUrl(data.analysis.url)
  const fileName = `competitor-analysis-${domain}-${formatDateForFileName()}.json`
  
  downloadFile(jsonContent, fileName, "application/json")
}

/**
 * Helper function to extract domain from URL
 */
function extractDomainFromUrl(url: string): string {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.hostname.replace(/^www\./, '')
  } catch (e) {
    // If URL is invalid, return a timestamp
    return "domain-" + Date.now()
  }
}

/**
 * Format current date for file name
 */
function formatDateForFileName(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
}
