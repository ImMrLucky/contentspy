import { Progress } from "@/components/ui/progress";
import { useEffect, useState } from "react";

interface LoadingIndicatorProps {
  isLoading: boolean;
}

export default function LoadingIndicator({ isLoading }: LoadingIndicatorProps) {
  const [progress, setProgress] = useState(0);
  
  useEffect(() => {
    if (!isLoading) {
      setProgress(0);
      return;
    }
    
    // Simulate progress
    const interval = setInterval(() => {
      setProgress(prev => {
        // Make progress slower as it approaches 100%
        const increment = Math.random() * (100 - prev) / 10;
        const newValue = prev + increment;
        return newValue > 95 ? 95 : newValue; // Cap at 95% until complete
      });
    }, 300);
    
    return () => clearInterval(interval);
  }, [isLoading]);
  
  // When loading completes, quickly finish to 100%
  useEffect(() => {
    if (!isLoading && progress > 0) {
      setProgress(100);
    }
  }, [isLoading, progress]);
  
  if (!isLoading && progress === 0) return null;
  
  return (
    <div className="mb-10">
      <div className="flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-t-4 border-primary border-solid rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-600">Analyzing competitors and extracting content...</p>
        <div className="mt-4 w-64">
          <Progress value={progress} className="h-2" />
        </div>
        <div className="mt-2 text-sm text-gray-500">This may take a few moments</div>
      </div>
    </div>
  );
}
