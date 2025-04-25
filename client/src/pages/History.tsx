import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CalendarIcon, SearchIcon } from "lucide-react";

export default function History() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Analysis History</h1>
        <p className="text-gray-600">View and revisit your previous content analysis results</p>
      </div>
      
      <div className="flex justify-center items-center p-12 border border-dashed border-gray-300 rounded-lg">
        <div className="text-center">
          <SearchIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-xl font-medium text-gray-800 mb-2">No analyses found</h3>
          <p className="text-gray-600 mb-4">You haven't analyzed any websites yet.</p>
          <Button className="bg-primary hover:bg-primary-dark">Start Your First Analysis</Button>
        </div>
      </div>
      
      {/* This section would be shown when there are history items
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader className="pb-2">
            <div className="flex justify-between">
              <CardTitle>example.com</CardTitle>
              <div className="text-sm text-gray-500 flex items-center">
                <CalendarIcon className="h-4 w-4 mr-1" />
                2 days ago
              </div>
            </div>
            <CardDescription>3 competitors identified</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mt-2">
              <div className="text-sm text-gray-600 mb-2">Top Competitor: competitor-seo.com</div>
              <div className="flex flex-wrap gap-1 mb-3">
                <span className="px-2 py-0.5 bg-primary bg-opacity-10 text-primary-dark text-xs rounded-full">e-commerce SEO</span>
                <span className="px-2 py-0.5 bg-primary bg-opacity-10 text-primary-dark text-xs rounded-full">product optimization</span>
              </div>
              <Button variant="outline" size="sm" className="w-full">View Details</Button>
            </div>
          </CardContent>
        </Card>
      </div>
      */}
    </div>
  );
}
