import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

// Create schema for form validation
const formSchema = z.object({
  url: z.string()
    .url({ message: "Please enter a valid URL" })
    .refine(url => url.startsWith("http://") || url.startsWith("https://"), {
      message: "URL must start with http:// or https://",
    }),
  keywords: z.string().optional(),
});

interface SearchPanelProps {
  onAnalyze: (url: string, keywords?: string) => void;
  isLoading: boolean;
}

export default function SearchPanel({ onAnalyze, isLoading }: SearchPanelProps) {
  // Define form
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      url: "",
      keywords: "",
    },
  });

  // Submit handler
  function onSubmit(values: z.infer<typeof formSchema>) {
    onAnalyze(values.url, values.keywords || "");
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
          Discover Competitor Content Insights
        </CardTitle>
        <CardDescription>
          Enter a website URL to analyze competitor content and discover trending keywords
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Website URL</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="https://example.com" 
                      {...field} 
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter the URL of the website you want to analyze
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormField
              control={form.control}
              name="keywords"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Keyword Phrases (Optional)</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="boiler repair, heating systems, HVAC contractors" 
                      {...field} 
                      className="w-full"
                    />
                  </FormControl>
                  <FormDescription>
                    Enter keyword phrases to help search for more relevant competitors (comma separated)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <Button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 text-white"
            >
              {isLoading ? "Analyzing..." : "Analyze Competitors"}
            </Button>
          </form>
        </Form>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
            <div className="text-3xl font-bold mb-2">01</div>
            <h3 className="text-lg font-medium">Enter Website URL</h3>
            <p className="text-sm text-muted-foreground">
              Provide any website URL you want to analyze
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
            <div className="text-3xl font-bold mb-2">02</div>
            <h3 className="text-lg font-medium">Analyze Content</h3>
            <p className="text-sm text-muted-foreground">
              Our AI scans for top competitor content and keywords
            </p>
          </div>
          <div className="flex flex-col items-center text-center p-4 rounded-lg bg-muted/50">
            <div className="text-3xl font-bold mb-2">03</div>
            <h3 className="text-lg font-medium">Get Insights</h3>
            <p className="text-sm text-muted-foreground">
              Receive strategic content recommendations
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}