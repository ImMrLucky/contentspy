import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { AnalysisResult } from "@/lib/types";

export function useContentAnalysis() {
  const [analyzedUrl, setAnalyzedUrl] = useState("");
  
  const analysisMutation = useMutation({
    mutationFn: async (url: string): Promise<AnalysisResult> => {
      const response = await apiRequest("POST", "/api/analyze", { url });
      const data = await response.json();
      return data;
    },
    onSuccess: (_, variables) => {
      setAnalyzedUrl(variables);
    },
  });
  
  const analyzeWebsite = (url: string) => {
    analysisMutation.mutate(url);
  };
  
  return {
    analyzeWebsite,
    isLoading: analysisMutation.isPending,
    error: analysisMutation.error,
    data: analysisMutation.data,
    analyzedUrl,
  };
}
