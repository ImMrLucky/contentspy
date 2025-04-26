import { CompetitorContent } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, BarChart } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitorContentItemProps {
  content: CompetitorContent;
}

export default function CompetitorContentItem({ content }: CompetitorContentItemProps) {
  // Traffic level progress value
  const getTrafficProgressValue = (trafficLevel: string = "") => {
    if (trafficLevel.includes("100,000+")) return 100;
    if (trafficLevel.includes("50,000-100,000")) return 80;
    if (trafficLevel.includes("10,000-50,000")) return 60;
    if (trafficLevel.includes("5,000-10,000")) return 40;
    if (trafficLevel.includes("1,000-5,000")) return 20;
    return 10;
  };

  // Traffic indicator color
  const getTrafficColor = (trafficLevel: string = "") => {
    if (trafficLevel.includes("100,000+")) return "text-success";
    if (trafficLevel.includes("50,000-100,000")) return "text-success";
    if (trafficLevel.includes("10,000-50,000")) return "text-warning";
    if (trafficLevel.includes("5,000-10,000")) return "text-orange-500";
    return "text-muted-foreground";
  };

  return (
    <Card className="h-full flex flex-col hover:shadow-md transition-shadow duration-200 overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-semibold line-clamp-2">
            {content.title}
          </CardTitle>
          <a 
            href={content.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 text-muted-foreground hover:text-primary shrink-0"
          >
            <ExternalLink size={16} />
          </a>
        </div>
        <CardDescription className="flex items-center text-xs">
          <span className="font-medium text-foreground/90">{content.domain}</span>
          {content.publishDate && (
            <>
              <span className="mx-1 text-muted-foreground">•</span>
              <span className="flex items-center">
                <Calendar size={12} className="mr-1 text-muted-foreground" />
                {content.publishDate}
              </span>
            </>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-3 flex-grow">
        <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
          {content.description}
        </p>
        
        {content.trafficLevel && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center text-xs">
                <BarChart size={14} className={`mr-1 ${getTrafficColor(content.trafficLevel)}`} />
                <span className={`font-medium ${getTrafficColor(content.trafficLevel)}`}>
                  Traffic Estimate
                </span>
              </div>
              <span className={`text-xs font-semibold ${getTrafficColor(content.trafficLevel)}`}>
                {content.trafficLevel}
              </span>
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="relative h-1.5 w-full overflow-hidden rounded-full bg-secondary">
                    <div 
                      className={`h-full absolute top-0 left-0 bg-primary ${content.trafficLevel.includes("100,000") ? "bg-gradient-to-r from-green-400 to-emerald-600" : ""}`}
                      style={{ width: `${getTrafficProgressValue(content.trafficLevel)}%` }}
                    />
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estimated monthly traffic based on search visibility and ranking position</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-1 flex flex-wrap gap-1">
        {content.keywords.map((keyword, index) => (
          <Badge key={index} variant="secondary" className="text-xs">
            {keyword}
          </Badge>
        ))}
      </CardFooter>
    </Card>
  );
}