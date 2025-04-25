import { CompetitorContent } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, LineChart, Calendar, InfoIcon } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface CompetitorContentItemProps {
  content: CompetitorContent;
}

export default function CompetitorContentItem({ content }: CompetitorContentItemProps) {
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
          <div className="flex items-center mt-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-xs">
                    <LineChart size={14} className="mr-1 text-muted-foreground" />
                    <span className={`
                      ${content.trafficLevel === "High traffic" ? "text-success" : ""}
                      ${content.trafficLevel === "Medium traffic" ? "text-warning" : ""}
                      ${content.trafficLevel === "Low traffic" ? "text-muted-foreground" : ""}
                      font-medium
                    `}>
                      {content.trafficLevel}
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Estimated traffic based on search visibility</p>
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