import { ContentRecommendation } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Tag } from "lucide-react";

interface RecommendationsPanelProps {
  recommendations: ContentRecommendation[];
}

export default function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
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
            <Card key={index} className={`border-${recommendation.color}/30 bg-${recommendation.color}/5 hover:bg-${recommendation.color}/10 transition-colors duration-200`}>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">{recommendation.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground mb-4">
                  {recommendation.description}
                </p>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <Tag size={14} className="text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Suggested keywords:</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {recommendation.keywords.map((keyword, kIndex) => (
                    <Badge key={kIndex} variant="secondary" className="text-xs font-normal">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}