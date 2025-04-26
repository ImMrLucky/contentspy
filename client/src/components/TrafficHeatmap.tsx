import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Button } from "@/components/ui/button";
import { CompetitorContent } from '@/lib/types';

// Define traffic heatmap cell interface
interface HeatmapCell {
  domain: string;
  content: string;
  url: string;
  trafficLevel: string;
  trafficValue: number;
  trafficScore?: number;  // New numeric score that includes source boost
  source?: string;        // Search engine source
  colorIntensity: string;
  keywords: string[];
}

const trafficValueMap: Record<string, number> = {
  "20,000+ monthly visits": 7,
  "10,000-20,000 monthly visits": 6,
  "5,000-10,000 monthly visits": 5,
  "2,000-5,000 monthly visits": 4,
  "1,000-2,000 monthly visits": 3,
  "500-1,000 monthly visits": 2,
  "Under 500 monthly visits": 1,
};

interface TrafficHeatmapProps {
  competitorContent: CompetitorContent[];
}

export default function TrafficHeatmap({ competitorContent }: TrafficHeatmapProps) {
  const [viewMode, setViewMode] = useState<string>("all");
  const [threshold, setThreshold] = useState<number[]>([1]); // Traffic threshold filter
  const [heatmapData, setHeatmapData] = useState<HeatmapCell[]>([]);
  const [domains, setDomains] = useState<string[]>([]);
  const [selectedCell, setSelectedCell] = useState<HeatmapCell | null>(null);
  
  // Group and process data for heatmap visualization
  useEffect(() => {
    // Extract all domains
    const uniqueDomains = Array.from(new Set(competitorContent.map(content => content.domain)));
    setDomains(uniqueDomains);
    
    // Create heatmap data cells
    const newHeatmapData: HeatmapCell[] = competitorContent.map(content => {
      // Calculate traffic value (1-7)
      const trafficValue = trafficValueMap[content.trafficLevel || "Under 500 monthly visits"] || 1;
      
      // Determine color intensity
      const colorIntensity = getColorIntensity(trafficValue);
      
      return {
        domain: content.domain,
        content: content.title,
        url: content.url,
        trafficLevel: content.trafficLevel || "Unknown",
        trafficValue,
        trafficScore: content.trafficScore, // Include the new trafficScore property
        source: content.source || "unknown", // Include the source search engine
        colorIntensity,
        keywords: content.keywords || [],
      };
    });
    
    setHeatmapData(newHeatmapData);
  }, [competitorContent]);
  
  // Filter data based on view mode, threshold, and source
  const filteredData = heatmapData.filter(cell => {
    // First check if it meets traffic threshold
    const meetsThreshold = cell.trafficValue >= threshold[0];
    
    // Then check if it meets traffic level filter
    let meetsTrafficLevel = true;
    if (viewMode === "high") {
      meetsTrafficLevel = cell.trafficValue >= 5;
    } else if (viewMode === "medium") {
      meetsTrafficLevel = cell.trafficValue >= 3 && cell.trafficValue < 5;
    } else if (viewMode === "low") {
      meetsTrafficLevel = cell.trafficValue < 3;
    }
    
    // Return true only if it meets all filters (no source filter needed as all results are from Google)
    return meetsThreshold && meetsTrafficLevel;
  });
  
  // Get color intensity based on traffic value (1-7)
  function getColorIntensity(value: number): string {
    // Create color gradient from cool to warm
    switch (value) {
      case 7:
        return "bg-red-500";
      case 6:
        return "bg-red-400";
      case 5:
        return "bg-orange-400";
      case 4:
        return "bg-amber-400";
      case 3:
        return "bg-yellow-300";
      case 2:
        return "bg-lime-300";
      case 1:
      default:
        return "bg-green-200";
    }
  }
  
  // Group data by domain for better visualization
  const dataByDomain: Record<string, HeatmapCell[]> = {};
  filteredData.forEach(cell => {
    if (!dataByDomain[cell.domain]) {
      dataByDomain[cell.domain] = [];
    }
    dataByDomain[cell.domain].push(cell);
  });
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Content Traffic Heatmap</span>
          <ToggleGroup type="single" value={viewMode} onValueChange={value => value && setViewMode(value)}>
            <ToggleGroupItem value="all" aria-label="All traffic">All</ToggleGroupItem>
            <ToggleGroupItem value="high" aria-label="High traffic">High</ToggleGroupItem>
            <ToggleGroupItem value="medium" aria-label="Medium traffic">Medium</ToggleGroupItem>
            <ToggleGroupItem value="low" aria-label="Low traffic">Low</ToggleGroupItem>
          </ToggleGroup>
        </CardTitle>
        <CardDescription>
          Visualize competitor content traffic patterns. Each cell represents a content piece with color indicating traffic level.
        </CardDescription>
        <div className="mt-4 px-3">
          <div className="flex justify-between text-sm text-muted-foreground mb-2">
            <span>Low Traffic</span>
            <span>High Traffic</span>
          </div>
          <Slider
            defaultValue={[1]}
            value={threshold}
            onValueChange={setThreshold}
            max={7}
            min={1}
            step={1}
            className="mb-4"
          />
          
          {/* All results now come from Google only */}
          <div className="mt-3 mb-2">
            <h4 className="text-sm font-medium mb-2">Search Engine Source</h4>
            <div className="flex items-center gap-2">
              <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-xs">Google</span>
              <span className="text-xs text-muted-foreground">Only using Google for best results</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <div className="flex flex-col space-y-6">
            {Object.keys(dataByDomain).length > 0 ? (
              Object.entries(dataByDomain).map(([domain, cells]) => (
                <div key={domain} className="flex flex-col">
                  <div className="font-semibold text-sm mb-2">{domain}</div>
                  <div className="flex flex-wrap gap-2">
                    {cells.map((cell, idx) => (
                      <TooltipProvider key={`${domain}-${idx}`}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div
                              className={`${cell.colorIntensity} rounded-md h-14 w-14 cursor-pointer transition-all hover:scale-105 flex flex-col items-center justify-center text-xs text-center text-white font-medium shadow relative`}
                              onClick={() => setSelectedCell(cell)}
                            >
                              {cell.trafficValue}
                              {/* All results come from Google now */}
                              <span className="absolute -top-1 -right-1 bg-blue-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center">G</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="max-w-[300px]">
                            <p className="font-semibold">{cell.content}</p>
                            <p className="text-xs mt-1">{cell.trafficLevel}</p>
                            <p className="text-xs mt-1 opacity-75">Source: Google</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center text-muted-foreground py-8">
                No content matches the selected traffic level filters.
              </div>
            )}
          </div>
        </div>
        
        {selectedCell && (
          <div className="mt-6 p-4 border rounded-lg">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-semibold">{selectedCell.content}</h3>
                <div className="flex items-center gap-2">
                  <p className="text-sm text-muted-foreground">{selectedCell.domain} • {selectedCell.trafficLevel}</p>
                  
                  {/* Source badge - always Google */}
                  <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                    Google
                  </span>
                </div>
                
                <div className="mt-2 flex flex-wrap gap-1">
                  {selectedCell.keywords.map((keyword, idx) => (
                    <span key={idx} className="text-xs px-2 py-1 bg-muted rounded-full">{keyword}</span>
                  ))}
                </div>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => window.open(selectedCell.url, '_blank')}
              >
                View Content
              </Button>
            </div>
          </div>
        )}
        
        <div className="mt-6 flex flex-col space-y-4">
          {/* Traffic color legend */}
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-3 h-3 bg-green-200 rounded mr-1"></div>
                <span className="text-xs">Low</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-yellow-300 rounded mr-1"></div>
                <span className="text-xs">Medium</span>
              </div>
              <div className="flex items-center">
                <div className="w-3 h-3 bg-red-500 rounded mr-1"></div>
                <span className="text-xs">High</span>
              </div>
            </div>
            
            <div className="text-xs text-muted-foreground">
              Showing {filteredData.length} of {heatmapData.length} content pieces
            </div>
          </div>
          
          {/* Search engine source legend */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t">
            <span className="text-xs font-medium">Source:</span>
            <div className="flex items-center">
              <span className="bg-blue-500 text-white text-[9px] rounded-full w-4 h-4 flex items-center justify-center mr-1">G</span>
              <span className="text-xs">Google</span>
            </div>
            <span className="text-xs text-muted-foreground ml-2">200 results per search</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}