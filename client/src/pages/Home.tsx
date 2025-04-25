import { useState } from "react";
import SearchPanel from "@/components/SearchPanel";
import LoadingIndicator from "@/components/LoadingIndicator";
import ResultsPanel from "@/components/ResultsPanel";
import InsightsSummary from "@/components/InsightsSummary";
import RecommendationsPanel from "@/components/RecommendationsPanel";
import { useContentAnalysis } from "@/hooks/use-content-analysis";
import { useToast } from "@/hooks/use-toast";
import { AnalysisResult } from "@/lib/types";

export default function Home() {
  const [analyzedUrl, setAnalyzedUrl] = useState<string>("");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const { analyzeWebsite, isAnalyzing } = useContentAnalysis();
  const { toast } = useToast();

  const handleAnalyze = async (url: string) => {
    setAnalyzedUrl(url);
    try {
      const result = await analyzeWebsite.mutateAsync(url);
      setAnalysisResult(result);
    } catch (error: any) {
      console.error("Analysis error:", error);
      toast({
        title: "Analysis Error",
        description: error.message || "Failed to analyze website. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="container py-8 space-y-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Competitive Content Analysis
        </h1>
        <p className="text-center text-muted-foreground mb-8">
          Discover top competitor content and keywords to enhance your content strategy
        </p>
      </div>

      <SearchPanel onAnalyze={handleAnalyze} isLoading={isAnalyzing} />
      
      {isAnalyzing && <LoadingIndicator isLoading={isAnalyzing} />}
      
      {analysisResult && !isAnalyzing && (
        <div className="space-y-8">
          <ResultsPanel 
            analyzedUrl={analyzedUrl}
            results={analysisResult.competitorContent} 
          />
          
          <InsightsSummary 
            insights={analysisResult.insights} 
          />
          
          <RecommendationsPanel 
            recommendations={analysisResult.recommendations} 
          />
        </div>
      )}
    </div>
  );
}
