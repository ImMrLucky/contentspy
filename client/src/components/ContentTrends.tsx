import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompetitorContent } from '@/lib/types';

interface ContentDistribution {
  name: string;
  count: number;
  color: string;
}

interface TrendData {
  name: string;
  value: number;
  color: string;
}

interface ContentTrendsProps {
  competitorContent: CompetitorContent[];
}

// Traffic value map for numerical representation
const trafficValueMap: Record<string, number> = {
  "20,000+ monthly visits": 20000,
  "10,000-20,000 monthly visits": 15000,
  "5,000-10,000 monthly visits": 7500,
  "2,000-5,000 monthly visits": 3500,
  "1,000-2,000 monthly visits": 1500,
  "500-1,000 monthly visits": 750,
  "Under 500 monthly visits": 250,
};

// Colors for visualization
const colors = ['#22c55e', '#84cc16', '#eab308', '#f97316', '#ef4444', '#8b5cf6', '#ec4899'];

export default function ContentTrends({ competitorContent }: ContentTrendsProps) {
  const [contentTypeDistribution, setContentTypeDistribution] = useState<ContentDistribution[]>([]);
  const [trafficDistribution, setTrafficDistribution] = useState<TrendData[]>([]);
  const [domainTrafficTrend, setDomainTrafficTrend] = useState<TrendData[]>([]);
  
  useEffect(() => {
    if (!competitorContent.length) return;
    
    // Process data for content type distribution
    const contentTypes = new Map<string, number>();
    
    // Check content titles and URLs to determine content type
    competitorContent.forEach(content => {
      const title = content.title.toLowerCase();
      const url = content.url.toLowerCase();
      
      if (title.includes('how to') || title.includes('guide') || url.includes('/guide/') || url.includes('/how-to/')) {
        contentTypes.set('How-to Guide', (contentTypes.get('How-to Guide') || 0) + 1);
      } else if (title.match(/(\d+).*(ways|tips|tricks|ideas|steps)/) || url.includes('/list/')) {
        contentTypes.set('List Post', (contentTypes.get('List Post') || 0) + 1);
      } else if (title.includes('case study') || url.includes('/case-study/') || url.includes('/success-story/')) {
        contentTypes.set('Case Study', (contentTypes.get('Case Study') || 0) + 1);
      } else if (title.includes('review') || title.includes('vs.') || title.includes('versus') || url.includes('/review/')) {
        contentTypes.set('Review', (contentTypes.get('Review') || 0) + 1);
      } else if (url.includes('/blog/') || url.includes('/article/')) {
        contentTypes.set('Blog Post', (contentTypes.get('Blog Post') || 0) + 1);
      } else {
        contentTypes.set('Other', (contentTypes.get('Other') || 0) + 1);
      }
    });
    
    // Convert to array for chart
    const contentTypeArray: ContentDistribution[] = Array.from(contentTypes.entries())
      .map(([name, count], index) => ({
        name,
        count,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.count - a.count);
    
    setContentTypeDistribution(contentTypeArray);
    
    // Process traffic distribution data
    const trafficLevels = new Map<string, number>();
    
    competitorContent.forEach(content => {
      const level = content.trafficLevel || "Unknown";
      trafficLevels.set(level, (trafficLevels.get(level) || 0) + 1);
    });
    
    const trafficData: TrendData[] = Array.from(trafficLevels.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => {
        // Sort by traffic level (high to low)
        const aValue = trafficValueMap[a.name] || 0;
        const bValue = trafficValueMap[b.name] || 0;
        return bValue - aValue;
      });
    
    setTrafficDistribution(trafficData);
    
    // Calculate domain traffic trends
    const domainTraffic = new Map<string, number>();
    
    competitorContent.forEach(content => {
      const domain = content.domain;
      const trafficEstimate = trafficValueMap[content.trafficLevel || "Under 500 monthly visits"] || 250;
      domainTraffic.set(domain, (domainTraffic.get(domain) || 0) + trafficEstimate);
    });
    
    const domainTrafficData: TrendData[] = Array.from(domainTraffic.entries())
      .map(([name, value], index) => ({
        name,
        value,
        color: colors[index % colors.length]
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 7); // Top 7 domains
    
    setDomainTrafficTrend(domainTrafficData);
    
  }, [competitorContent]);
  
  // Custom tooltip for the charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="text-sm font-medium">{label || payload[0].name}</p>
          <p className="text-xs">{`Count: ${payload[0].value}`}</p>
        </div>
      );
    }
    return null;
  };
  
  // Traffic tooltip with estimated visits
  const TrafficTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-background p-2 border rounded shadow-sm">
          <p className="text-sm font-medium">{label || payload[0].name}</p>
          <p className="text-xs">{`Estimated Traffic: ${payload[0].value.toLocaleString()} visits`}</p>
        </div>
      );
    }
    return null;
  };
  
  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Content Trends Analysis</CardTitle>
        <CardDescription>
          Visualize content trends and patterns across competitor sites.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="content-types">
          <TabsList className="mb-4">
            <TabsTrigger value="content-types">Content Types</TabsTrigger>
            <TabsTrigger value="traffic-distribution">Traffic Distribution</TabsTrigger>
            <TabsTrigger value="domain-traffic">Domain Traffic</TabsTrigger>
          </TabsList>
          
          <TabsContent value="content-types">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={contentTypeDistribution}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  <Bar dataKey="count" name="Content Count">
                    {contentTypeDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>The bar chart displays the distribution of different content types found across competitor websites. This indicates the most common content formats that drive traffic in your industry.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="traffic-distribution">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={trafficDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {trafficDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>The pie chart shows the distribution of content by traffic level. This helps identify what portion of competitor content receives high, medium, or low traffic volumes.</p>
            </div>
          </TabsContent>
          
          <TabsContent value="domain-traffic">
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={domainTrafficTrend}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip content={<TrafficTooltip />} />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="value"
                    name="Estimated Traffic"
                    stroke="#8884d8"
                    strokeWidth={2}
                    dot={{ r: 5 }}
                    activeDot={{ r: 8 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 text-sm text-muted-foreground">
              <p>The line chart displays estimated traffic trends across top competitor domains. This visualization helps identify which competitor domains are attracting the most visitors with their content strategy.</p>
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6 p-4 bg-muted/30 rounded-lg">
          <h4 className="font-medium mb-2">Traffic Trend Summary</h4>
          <p className="text-sm text-muted-foreground">
            {contentTypeDistribution.length > 0 ? (
              <>The most common content type is <strong>{contentTypeDistribution[0].name}</strong> 
              with {contentTypeDistribution[0].count} pieces of content. This suggests that this format 
              is effective in attracting visitors in your industry.</>
            ) : (
              <>Analyze more competitor content to generate traffic trend insights.</>
            )}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}