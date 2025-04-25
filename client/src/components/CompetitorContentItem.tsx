import { CompetitorContent } from "@/lib/types";
import { TrendingUp } from "lucide-react";

interface CompetitorContentItemProps {
  content: CompetitorContent;
}

export default function CompetitorContentItem({ content }: CompetitorContentItemProps) {
  // Determine traffic level badge color
  const getTrafficLevelClass = () => {
    if (content.trafficLevel?.includes("High")) return "text-accent";
    if (content.trafficLevel?.includes("Medium")) return "text-warning";
    return "text-gray-500";
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm mb-4 transition-shadow hover:shadow-card-hover">
      <div className="p-4 border-b border-gray-200">
        <div className="flex justify-between">
          <h3 className="text-lg font-medium text-primary-dark">
            <a href={content.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
              {content.title}
            </a>
          </h3>
          {content.trafficLevel && (
            <div className={`flex items-center ${getTrafficLevelClass()}`}>
              <TrendingUp className="h-4 w-4 mr-1" />
              <span className="text-sm">{content.trafficLevel}</span>
            </div>
          )}
        </div>
        <div className="mt-1 text-sm text-gray-500">
          <span className="font-medium">{content.domain}</span>
          {content.publishDate && ` • Published ${content.publishDate}`}
        </div>
        {content.description && <p className="mt-2 text-gray-700">{content.description}</p>}
      </div>
      
      <div className="px-4 py-3 bg-gray-50">
        <div className="flex items-center mb-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-600 mr-2">
            <line x1="5" y1="12" x2="19" y2="12"></line>
            <line x1="5" y1="5" x2="19" y2="5"></line>
            <line x1="5" y1="19" x2="19" y2="19"></line>
          </svg>
          <h4 className="text-sm font-medium text-gray-700">Top Keywords</h4>
        </div>
        <div className="flex flex-wrap gap-2">
          {content.keywords.map((keyword, index) => (
            <span key={index} className="px-2 py-1 bg-primary bg-opacity-10 text-primary-dark text-xs rounded-full">
              {keyword}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
