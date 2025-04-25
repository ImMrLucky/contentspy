import { ContentRecommendation } from "@/lib/types";

interface RecommendationsPanelProps {
  recommendations: ContentRecommendation[];
}

export default function RecommendationsPanel({ recommendations }: RecommendationsPanelProps) {
  const getBorderClass = (color: string) => {
    switch (color) {
      case 'primary': return 'border-primary';
      case 'secondary': return 'border-secondary';
      case 'accent': return 'border-accent';
      case 'success': return 'border-success';
      case 'warning': return 'border-warning';
      case 'error': return 'border-destructive';
      default: return 'border-gray-300';
    }
  };
  
  const getKeywordClass = (color: string) => {
    switch (color) {
      case 'primary': return 'bg-primary bg-opacity-10 text-primary-dark';
      case 'secondary': return 'bg-secondary bg-opacity-10 text-secondary-dark';
      case 'accent': return 'bg-accent bg-opacity-10 text-accent-dark';
      case 'success': return 'bg-success bg-opacity-10 text-success';
      case 'warning': return 'bg-warning bg-opacity-10 text-warning';
      case 'error': return 'bg-destructive bg-opacity-10 text-destructive';
      default: return 'bg-gray-100 text-gray-700';
    }
  };
  
  return (
    <section className="mb-10">
      <div className="bg-white rounded-lg shadow-card p-6">
        <h2 className="text-xl font-medium text-gray-800 mb-4">Content Recommendations</h2>
        
        <div className="space-y-4">
          {recommendations.map((recommendation, index) => (
            <div 
              key={index} 
              className={`p-4 border-l-4 ${getBorderClass(recommendation.color)} bg-gray-50 rounded-r-lg`}
            >
              <h3 className="font-medium">{recommendation.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{recommendation.description}</p>
              <div className="mt-2 flex flex-wrap gap-2">
                {recommendation.keywords.map((keyword, keywordIndex) => (
                  <span 
                    key={keywordIndex}
                    className={`px-2 py-1 ${getKeywordClass(recommendation.color)} text-xs rounded-full`}
                  >
                    {keyword}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
