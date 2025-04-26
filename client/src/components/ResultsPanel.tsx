import { AnalysisResult, CompetitorContent } from "@/lib/types";
import CompetitorContentItem from "./CompetitorContentItem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, BookOpen, Search, BarChart2 } from "lucide-react";
import ExportButtons from "./ExportButtons";
import TrafficVisualizer from "./TrafficVisualizer";

interface ResultsPanelProps {
  analyzedUrl: string;
  results: CompetitorContent[];
  fullResults?: AnalysisResult;
}

export default function ResultsPanel({ analyzedUrl, results, fullResults }: ResultsPanelProps) {
  // Group results by domain
  const domainGroups = results.reduce((groups, result) => {
    const domain = result.domain;
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(result);
    return groups;
  }, {} as Record<string, CompetitorContent[]>);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Award className="h-5 w-5 text-primary" />
            <CardTitle>Top Competitor Content</CardTitle>
          </div>
          {fullResults && (
            <ExportButtons results={fullResults} />
          )}
        </div>
        <CardDescription>
          Top-performing content from competitors to {analyzedUrl.replace(/^https?:\/\//, '')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>All Content ({results.length})</span>
            </TabsTrigger>
            <TabsTrigger value="byDomain" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span>By Domain ({Object.keys(domainGroups).length})</span>
            </TabsTrigger>
            <TabsTrigger value="trafficVisuals" className="flex items-center gap-1">
              <BarChart2 className="h-4 w-4" />
              <span>Traffic Insights</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="w-full mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result) => (
                <CompetitorContentItem key={result.id} content={result} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="byDomain" className="mt-0">
            <div className="space-y-6">
              {Object.entries(domainGroups).map(([domain, domainResults]) => (
                <div key={domain} className="space-y-3">
                  <h3 className="text-lg font-semibold">{domain}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {domainResults.map((result) => (
                      <CompetitorContentItem key={result.id} content={result} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="trafficVisuals" className="mt-0">
            {fullResults && (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Traffic Insights & Visualizations</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Interactive visualizations to analyze competitor content traffic patterns and trends.
                </p>
                
                <Tabs defaultValue="heatmap" className="w-full">
                  <TabsList className="w-full grid grid-cols-2 mb-6">
                    <TabsTrigger value="heatmap" className="flex items-center gap-1">
                      <BarChart2 className="h-4 w-4" />
                      <span>Traffic Heatmap</span>
                    </TabsTrigger>
                    <TabsTrigger value="trends" className="flex items-center gap-1">
                      <BarChart2 className="h-4 w-4" />
                      <span>Content Trends</span>
                    </TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="heatmap" className="mt-0">
                    <TrafficHeatmap competitorContent={fullResults.competitorContent} />
                  </TabsContent>
                  
                  <TabsContent value="trends" className="mt-0">
                    <ContentTrends competitorContent={fullResults.competitorContent} />
                  </TabsContent>
                </Tabs>
                
                <div className="mt-6 p-4 bg-muted/20 rounded-lg text-sm text-muted-foreground">
                  <h4 className="font-medium mb-2 text-foreground">How to use this visualization:</h4>
                  <ul className="list-disc pl-5 space-y-2">
                    <li><strong>Traffic Heatmap</strong>: Visualize content traffic levels across competitor domains. Darker cells indicate higher traffic content.</li>
                    <li><strong>Content Trends</strong>: Analyze distribution of content types and traffic patterns to identify industry trends.</li>
                    <li>Use filters and toggles to focus on specific traffic segments or content categories.</li>
                    <li>Click on heatmap cells to view detailed content information and keywords.</li>
                  </ul>
                </div>
              </div>
            )}
            
            {!fullResults && (
              <div className="text-center py-10 text-muted-foreground">
                Traffic visualization is only available with full analysis results.
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}