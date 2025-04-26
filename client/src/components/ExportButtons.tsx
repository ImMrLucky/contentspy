import React from 'react';
import { AnalysisResult } from '@/lib/types';
import { 
  exportAnalysisAsCSV, 
  exportAnalysisAsJSON, 
  exportInsightsAsCSV, 
  exportRecommendationsAsCSV,
  exportCombinedCSV
} from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import ExportWizard from './ExportWizard';

interface ExportButtonsProps {
  results: AnalysisResult;
}

export default function ExportButtons({ results }: ExportButtonsProps) {
  if (!results) return null;

  const handleExportAllAsCSV = () => {
    exportAnalysisAsCSV(results);
  };

  const handleExportInsightsAsCSV = () => {
    exportInsightsAsCSV(results.insights, results.analysis.url);
  };

  const handleExportRecommendationsAsCSV = () => {
    exportRecommendationsAsCSV(results.recommendations, results.analysis.url);
  };

  const handleExportAllAsJSON = () => {
    exportAnalysisAsJSON(results);
  };

  const handleExportComprehensiveCSV = () => {
    exportCombinedCSV(results);
  };

  return (
    <div className="flex items-center gap-2">
      <ExportWizard results={results} />
      
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" className="flex items-center gap-1">
            <Download className="h-4 w-4" />
            <span>Export</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel>Export Options</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportComprehensiveCSV}>
            Export Comprehensive CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportAllAsCSV}>
            Export Content as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportInsightsAsCSV}>
            Export Insights as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={handleExportRecommendationsAsCSV}>
            Export Recommendations as CSV
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleExportAllAsJSON}>
            Export All as JSON
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}