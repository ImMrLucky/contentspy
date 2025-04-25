import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Check, Link } from "lucide-react";

interface SearchPanelProps {
  onAnalyze: (url: string) => void;
}

export default function SearchPanel({ onAnalyze }: SearchPanelProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const { toast } = useToast();

  const validateUrl = (url: string): boolean => {
    try {
      new URL(url);
      return true;
    } catch (e) {
      return false;
    }
  };

  const handleAnalyze = () => {
    if (!url.trim()) {
      setError("Please enter a URL");
      return;
    }

    if (!validateUrl(url)) {
      setError("Please enter a valid URL");
      return;
    }

    setError("");
    onAnalyze(url);
  };

  return (
    <section className="mb-10">
      <div className="bg-white rounded-lg shadow-card p-6 max-w-4xl mx-auto">
        <h2 className="text-2xl font-medium text-gray-800 mb-6">Competitive Content Analysis</h2>
        <p className="text-gray-600 mb-6">
          Enter your website URL to discover your competitors' top-performing content and keyword strategies.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-grow relative">
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
              <Link size={20} />
            </div>
            <Input
              type="url"
              placeholder="https://yourdomain.com"
              className="w-full py-3 pl-10 pr-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary transition duration-200 outline-none"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyUp={(e) => e.key === "Enter" && handleAnalyze()}
            />
            {error && <div className="text-destructive text-sm mt-1">{error}</div>}
          </div>
          
          <Button 
            className="bg-primary hover:bg-primary-dark text-white px-6 py-3 rounded-lg transition duration-200 flex items-center justify-center shadow-md min-w-[120px]"
            onClick={handleAnalyze}
          >
            Analyze
          </Button>
        </div>
        
        <div className="mt-4 flex flex-wrap gap-2">
          <div className="flex items-center text-xs text-gray-500">
            <Check className="text-sm mr-1" size={14} />
            <span>Google Search</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Check className="text-sm mr-1" size={14} />
            <span>Bing Search</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Check className="text-sm mr-1" size={14} />
            <span>DuckDuckGo</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Check className="text-sm mr-1" size={14} />
            <span>Competitor Analysis</span>
          </div>
          <div className="flex items-center text-xs text-gray-500">
            <Check className="text-sm mr-1" size={14} />
            <span>Keyword Extraction</span>
          </div>
        </div>
      </div>
    </section>
  );
}
