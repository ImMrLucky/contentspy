import { InsightsSummary as InsightsSummaryType } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Users, TrendingUp, PieChart } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface InsightsSummaryProps {
  insights: InsightsSummaryType;
}

export default function InsightsSummary({ insights }: InsightsSummaryProps) {
  if (!insights) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            <CardTitle>Content Insights</CardTitle>
          </div>
          <CardDescription>
            Analysis in progress...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            Loading insights data...
          </div>
        </CardContent>
      </Card>
    );
  }

  const {
    topContentType = 'N/A',
    avgContentLength = 'N/A',
    keyCompetitors = 'N/A',
    contentGapScore = '0',
    keywordClusters = []
  } = insights;

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          <CardTitle>Content Insights</CardTitle>
        </div>
        <CardDescription>
          Key insights and metrics from competitor content analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  Top Content Type
                </div>
                <div className="text-lg font-semibold">{topContentType}</div>
              </div>
              
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <PieChart className="h-4 w-4 mr-1" />
                  Content Gap Score
                </div>
                <div className="text-lg font-semibold">{contentGapScore}</div>
              </div>
              
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <Users className="h-4 w-4 mr-1" />
                  Key Competitors
                </div>
                <div className="text-lg font-semibold">{keyCompetitors}</div>
              </div>
              
              <div className="flex flex-col space-y-2 p-4 rounded-lg bg-muted/50">
                <div className="flex items-center text-sm font-medium text-muted-foreground">
                  <FileText className="h-4 w-4 mr-1" />
                  Avg. Content Length
                </div>
                <div className="text-lg font-semibold">{avgContentLength}</div>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-muted-foreground">Keyword Clusters</h3>
            <div className="flex flex-wrap gap-2">
              {keywordClusters.map((cluster, index) => (
                <div key={index} className="flex items-center">
                  <Badge 
                    variant="outline" 
                    className={`px-3 py-1 bg-${cluster.color}/10 hover:bg-${cluster.color}/20 text-${cluster.color}-foreground border-${cluster.color}/30`}
                  >
                    <span className="mr-1 text-sm font-medium">{cluster.name}</span>
                    <span className="rounded-full bg-muted px-1.5 text-xs">{cluster.count}</span>
                  </Badge>
                </div>
              ))}
            </div>
            
            <div className="mt-4">
              <h3 className="text-sm font-medium text-muted-foreground mb-2">Content Gap Analysis</h3>
              <p className="text-sm text-muted-foreground">
                Based on the analysis, your competitors are focusing on {topContentType.toLowerCase()} 
                with an average length of {avgContentLength}. The content gap score of {contentGapScore} 
                indicates {parseInt(contentGapScore) > 70 ? 
                  "significant opportunities to create unique content." : 
                  parseInt(contentGapScore) > 50 ? 
                    "moderate opportunities to differentiate your content." : 
                    "that you should focus on quality over quantity."}
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}