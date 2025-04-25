import { useState } from "react";
import SearchPanel from "@/components/SearchPanel";
import LoadingIndicator from "@/components/LoadingIndicator";
import ResultsPanel from "@/components/ResultsPanel";
import InsightsSummary from "@/components/InsightsSummary";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import { useContentAnalysis } from "@/hooks/use-content-analysis";
import { useToast } from "@/hooks/use-toast";

export default function Home() {
  const { 
    analyzeWebsite, 
    isLoading, 
    error, 
    data, 
    analyzedUrl 
  } = useContentAnalysis();
  
  const { toast } = useToast();

  const handleAnalyze = (url: string) => {
    analyzeWebsite(url);
  };

  // Show toast on error
  if (error) {
    toast({
      title: "Analysis Error",
      description: error.message || "Failed to analyze website. Please try again.",
      variant: "destructive",
    });
  }

  return (
    <>
      <SearchPanel onAnalyze={handleAnalyze} />
      
      <LoadingIndicator isLoading={isLoading} />
      
      {data && (
        <>
          <ResultsPanel 
            analyzedUrl={analyzedUrl}
            results={data.competitorContent} 
          />
          
          <InsightsSummary 
            insights={data.insights} 
          />
          
          <RecommendationsPanel 
            recommendations={data.recommendations} 
          />
        </>
      )}
    </>
  );
}
