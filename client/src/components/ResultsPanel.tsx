import { CompetitorContent } from "@/lib/types";
import CompetitorContentItem from "@/components/CompetitorContentItem";
import { Button } from "@/components/ui/button";
import { ChevronDown, Bookmark, Download } from "lucide-react";
import { useState } from "react";

interface ResultsPanelProps {
  analyzedUrl: string;
  results: CompetitorContent[];
}

export default function ResultsPanel({ analyzedUrl, results }: ResultsPanelProps) {
  const [displayLimit, setDisplayLimit] = useState(3);
  
  const handleLoadMore = () => {
    setDisplayLimit(prevLimit => prevLimit + 3);
  };
  
  if (!results || results.length === 0) return null;
  
  return (
    <section className="mb-10">
      <div className="bg-white rounded-lg shadow-card p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-medium text-gray-800">Analysis Results</h2>
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500">
              Analyzed: <span className="font-medium">{analyzedUrl}</span>
            </span>
            <span className="flex items-center text-sm text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-success mr-1">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              Just now
            </span>
          </div>
        </div>

        <div className="mb-4">
          <div className="p-4 bg-gray-50 rounded-md border border-gray-200">
            <h3 className="text-lg font-medium">Top Competitor Content</h3>
            <p className="text-sm text-gray-600 mt-1">
              We found {results.length} high-performing competitor articles related to your domain.
            </p>
          </div>
        </div>

        {results.slice(0, displayLimit).map((content, index) => (
          <CompetitorContentItem key={index} content={content} />
        ))}

        {displayLimit < results.length && (
          <div className="flex justify-center mt-6">
            <Button 
              variant="outline"
              className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium px-4 py-2 rounded-lg transition duration-200 flex items-center"
              onClick={handleLoadMore}
            >
              <ChevronDown className="mr-1 h-4 w-4" />
              <span>Load More Results</span>
            </Button>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-4">
        <Button 
          variant="ghost"
          className="hover:bg-gray-100 text-primary px-4 py-2 rounded-lg transition duration-200 flex items-center mr-2"
        >
          <Bookmark className="mr-1 h-4 w-4" />
          <span>Save Report</span>
        </Button>
        <Button 
          variant="ghost"
          className="hover:bg-gray-100 text-primary px-4 py-2 rounded-lg transition duration-200 flex items-center"
        >
          <Download className="mr-1 h-4 w-4" />
          <span>Export as CSV</span>
        </Button>
      </div>
    </section>
  );
}
