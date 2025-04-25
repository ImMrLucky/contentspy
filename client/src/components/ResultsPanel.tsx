import { CompetitorContent } from "@/lib/types";
import CompetitorContentItem from "./CompetitorContentItem";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Award, BookOpen, Search } from "lucide-react";

interface ResultsPanelProps {
  analyzedUrl: string;
  results: CompetitorContent[];
}

export default function ResultsPanel({ analyzedUrl, results }: ResultsPanelProps) {
  // Group results by domain
  const domainGroups = results.reduce((groups, result) => {
    const domain = result.domain;
    if (!groups[domain]) {
      groups[domain] = [];
    }
    groups[domain].push(result);
    return groups;
  }, {} as Record<string, CompetitorContent[]>);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <Award className="h-5 w-5 text-primary" />
          <CardTitle>Top Competitor Content</CardTitle>
        </div>
        <CardDescription>
          Top-performing content from competitors to {analyzedUrl.replace(/^https?:\/\//, '')}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full auto-cols-fr grid-flow-col mb-6">
            <TabsTrigger value="all" className="flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              <span>All Content ({results.length})</span>
            </TabsTrigger>
            <TabsTrigger value="byDomain" className="flex items-center gap-1">
              <Search className="h-4 w-4" />
              <span>By Domain ({Object.keys(domainGroups).length})</span>
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="all" className="w-full mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {results.map((result) => (
                <CompetitorContentItem key={result.id} content={result} />
              ))}
            </div>
          </TabsContent>
          
          <TabsContent value="byDomain" className="mt-0">
            <div className="space-y-6">
              {Object.entries(domainGroups).map(([domain, domainResults]) => (
                <div key={domain} className="space-y-3">
                  <h3 className="text-lg font-semibold">{domain}</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {domainResults.map((result) => (
                      <CompetitorContentItem key={result.id} content={result} />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}