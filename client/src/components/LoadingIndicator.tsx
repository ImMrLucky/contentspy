import { Card, CardContent } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface LoadingIndicatorProps {
  isLoading: boolean;
}

export default function LoadingIndicator({ isLoading }: LoadingIndicatorProps) {
  if (!isLoading) return null;
  
  return (
    <Card className="w-full bg-muted/20">
      <CardContent className="flex flex-col items-center justify-center p-6 space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <div className="text-center">
          <h3 className="text-lg font-medium">Analyzing competitor content</h3>
          <p className="text-sm text-muted-foreground">
            This may take a minute as we analyze multiple sources
          </p>
        </div>
        
        <div className="w-full max-w-md bg-muted rounded-full h-2 mt-4 overflow-hidden">
          <div className="h-full bg-gradient-to-r from-primary to-secondary animate-pulse rounded-full"></div>
        </div>
      </CardContent>
    </Card>
  );
}