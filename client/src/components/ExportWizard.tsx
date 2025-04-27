import React, { useState } from 'react';
import { AnalysisResult } from '@/lib/types';
import { exportCombinedCSV } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Wand2, FileSpreadsheet } from 'lucide-react';

interface ExportWizardProps {
  results: AnalysisResult;
}

export default function ExportWizard({ results }: ExportWizardProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [exportStarted, setExportStarted] = useState(false);

  if (!results) return null;

  const handleExportCSV = () => {
    setExportStarted(true);
    setTimeout(() => {
      exportCombinedCSV(results);
      setTimeout(() => {
        setExportStarted(false);
      }, 1000);
    }, 300);
  };

  const domain = results?.analysis?.url ? 
    new URL(results.analysis.url).hostname.replace(/^www\./, '') : 
    'unknown-domain';

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 text-white shadow-md">
          <Wand2 className="h-4 w-4" />
          <span>Export Wizard</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            Magical Export Wizard
          </DialogTitle>
          <DialogDescription>
            Generate a comprehensive CSV report with all your analysis data
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-4">
          <div className="border rounded-lg p-4 bg-slate-50">
            <h4 className="text-lg font-semibold mb-2">Content Analysis Report</h4>
            <p className="text-sm text-slate-500 mb-4">Analysis for: {domain}</p>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium text-slate-700 mb-2">Key Insights:</h5>
              <ul className="text-sm space-y-1">
                <li>• Top Content Type: <span className="font-medium">{results.insights?.topContentType || 'N/A'}</span></li>
                <li>• Average Content Length: <span className="font-medium">{results.insights?.avgContentLength || 'N/A'}</span></li>
                <li>• Key Competitors: <span className="font-medium">{results.insights?.keyCompetitors || 'N/A'}</span></li>
                <li>• Content Gap Score: <span className="font-medium">{results.insights?.contentGapScore || 'N/A'}</span></li>
              </ul>
            </div>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium text-slate-700 mb-2">Keyword Clusters:</h5>
              <div className="flex flex-wrap gap-2">
                {results.insights?.keywordClusters && results.insights.keywordClusters.length > 0 ? (
                  <>
                    {results.insights.keywordClusters.slice(0, 4).map((cluster, idx) => (
                      <Badge key={idx} variant="outline" className="bg-white">
                        {cluster.name} ({cluster.count})
                      </Badge>
                    ))}
                    {results.insights.keywordClusters.length > 4 && (
                      <Badge variant="outline" className="bg-white">
                        +{results.insights.keywordClusters.length - 4} more
                      </Badge>
                    )}
                  </>
                ) : (
                  <Badge variant="outline" className="bg-white">No keyword clusters found</Badge>
                )}
              </div>
            </div>
            
            <div className="mb-4">
              <h5 className="text-sm font-medium text-slate-700 mb-2">Report Includes:</h5>
              <ul className="text-sm space-y-1">
                <li>• All {results.competitorContent?.length || 0} competitor articles with full details</li>
                <li>• Complete keyword analysis and traffic metrics</li>
                <li>• {results.recommendations?.length || 0} content strategy recommendations</li>
                <li>• Content gap analysis and competitor insights</li>
              </ul>
            </div>

            <div className="mt-5">
              <Button 
                onClick={handleExportCSV}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white shadow-md"
                disabled={exportStarted}
              >
                {exportStarted ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Generating...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="h-4 w-4" />
                    Download Complete CSV Report
                  </span>
                )}
              </Button>
            </div>
          </div>
          
          <p className="text-xs text-slate-500 text-center">
            Export includes all insights, recommendations, and competitor content in a single CSV file.
            <br/>Compatible with Excel, Google Sheets, and other spreadsheet applications.
          </p>
        </div>
        
        <DialogFooter className="flex-col sm:flex-row sm:justify-end items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setIsOpen(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}