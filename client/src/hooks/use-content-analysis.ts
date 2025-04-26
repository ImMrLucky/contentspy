import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AnalysisResult } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface AnalyzeRequest {
  url: string;
  keywords?: string;
}

export function useContentAnalysis() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Create mutation for analyzing a website
  const analyzeWebsite = useMutation({
    mutationFn: async (request: AnalyzeRequest): Promise<AnalysisResult> => {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
      });

      return response.json();
    },
    onSuccess: () => {
      // Invalidate relevant queries when a new analysis is completed
      queryClient.invalidateQueries({ queryKey: ["/api/history"] });
      
      toast({
        title: "Analysis completed",
        description: "The website analysis has been completed successfully.",
      });
    },
    onError: (error) => {
      console.error("Analysis error:", error);
      
      toast({
        title: "Analysis failed",
        description: "There was an error analyzing the website. Please try again.",
        variant: "destructive",
      });
    },
  });

  return {
    analyzeWebsite,
    isAnalyzing: analyzeWebsite.isPending,
  };
}
