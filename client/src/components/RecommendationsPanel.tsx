import { ContentRecommendation } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Tag } from "lucide-react";

interface RecommendationsPanelProps {
  recommendations: ContentRecommendation[];
}

export default function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  if (!recommendations || recommendations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            <CardTitle>Content Recommendations</CardTitle>
          </div>
          <CardDescription>
            Analysis in progress...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="py-6 text-center text-muted-foreground">
            Loading recommendations...
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Lightbulb className="h-5 w-5 text-primary" />
          <CardTitle>Content Recommendations</CardTitle>
        </div>
        <CardDescription>
          Strategic content recommendations based on competitor analysis
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {recommendations.map((recommendation, index) => (
            <Card key={index} className="border shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{recommendation.title || 'Content recommendation'}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {recommendation.description || 'Based on your competitor analysis, we recommend creating content on this topic.'}
                </p>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Suggested keywords:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendation.keywords && recommendation.keywords.length > 0 ? (
                    recommendation.keywords.map((keyword, kIndex) => (
                      <Badge key={kIndex} variant="secondary" className="text-xs font-normal">
                        {keyword}
                      </Badge>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground">No keywords available</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}