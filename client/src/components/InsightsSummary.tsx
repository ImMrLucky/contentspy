import { InsightsSummary as InsightsSummaryType } from "@/lib/types";

interface InsightsSummaryProps {
  insights: InsightsSummaryType;
}

export default function InsightsSummary({ insights }: InsightsSummaryProps) {
  const getColorClass = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary-light';
      case 'secondary': return 'bg-secondary-light';
      case 'accent': return 'bg-accent-light';
      case 'success': return 'bg-success bg-opacity-10';
      case 'warning': return 'bg-warning bg-opacity-10';
      case 'error': return 'bg-destructive bg-opacity-10';
      default: return 'bg-gray-200';
    }
  };
  
  return (
    <section className="mb-10">
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Competitive Insights</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-primary bg-opacity-10 rounded-lg p-4">
            <div className="text-primary-dark font-medium">Top Content Type</div>
            <div className="text-2xl mt-1 font-medium">{insights.topContentType}</div>
            <div className="text-sm text-gray-600 mt-1">46% of top content</div>
          </div>
          
          <div className="bg-secondary bg-opacity-10 rounded-lg p-4">
            <div className="text-secondary-dark font-medium">Avg. Content Length</div>
            <div className="text-2xl mt-1 font-medium">{insights.avgContentLength}</div>
            <div className="text-sm text-gray-600 mt-1">Based on top 15 articles</div>
          </div>
          
          <div className="bg-accent bg-opacity-10 rounded-lg p-4">
            <div className="text-accent-dark font-medium">Key Competitors</div>
            <div className="text-2xl mt-1 font-medium">{insights.keyCompetitors}</div>
            <div className="text-sm text-gray-600 mt-1">With similar content focus</div>
          </div>
          
          <div className="bg-success bg-opacity-10 rounded-lg p-4">
            <div className="text-success font-medium">Content Gap Score</div>
            <div className="text-2xl mt-1 font-medium">{insights.contentGapScore}</div>
            <div className="text-sm text-gray-600 mt-1">Opportunity level: Medium</div>
          </div>
        </div>
        
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
          <h3 className="font-medium text-gray-800 mb-2">Top Keyword Clusters</h3>
          <div className="flex flex-wrap gap-y-3">
            {insights.keywordClusters.map((cluster, index) => (
              <div key={index} className="w-full md:w-1/2 lg:w-1/3">
                <div className="flex items-center">
                  <div className={`w-2 h-2 rounded-full ${getColorClass(cluster.color)} mr-2`}></div>
                  <span className="text-sm font-medium">{cluster.name}</span>
                  <span className="text-xs text-gray-500 ml-2">({cluster.count} articles)</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
