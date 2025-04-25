import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FileTextIcon, LineChartIcon, BarChart2Icon } from "lucide-react";

export default function Reports() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Content Analysis Reports</h1>
        <p className="text-gray-600">In-depth reports and analytics from your content analysis</p>
      </div>
      
      <Tabs defaultValue="saved" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="saved">Saved Reports</TabsTrigger>
          <TabsTrigger value="insights">Content Insights</TabsTrigger>
          <TabsTrigger value="trends">Keyword Trends</TabsTrigger>
        </TabsList>
        
        <TabsContent value="saved">
          <div className="flex justify-center items-center h-64 border border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <FileTextIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-800 mb-2">No saved reports</h3>
              <p className="text-gray-600">
                Save analysis results to access them here for future reference
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="insights">
          <div className="flex justify-center items-center h-64 border border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <LineChartIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-800 mb-2">No content insights</h3>
              <p className="text-gray-600">
                Analyze websites to generate content insights and benchmarks
              </p>
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="trends">
          <div className="flex justify-center items-center h-64 border border-dashed border-gray-300 rounded-lg">
            <div className="text-center">
              <BarChart2Icon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-xl font-medium text-gray-800 mb-2">No keyword trends</h3>
              <p className="text-gray-600">
                Track competitor keywords over time to identify emerging trends
              </p>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
