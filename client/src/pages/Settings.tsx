import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export default function Settings() {
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [resultCount, setResultCount] = useState([10]);
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Settings</h1>
        <p className="text-gray-600">Configure your ContentCompete experience</p>
      </div>
      
      <Tabs defaultValue="preferences" className="w-full">
        <TabsList className="mb-8">
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="account">Account</TabsTrigger>
          <TabsTrigger value="api">API Keys</TabsTrigger>
        </TabsList>
        
        <TabsContent value="preferences">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Analysis Settings</h3>
                  <p className="text-sm text-gray-500">Configure how content analysis is performed</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="search-depth" className="text-sm font-medium">
                        Maximum Results
                      </Label>
                      <span className="text-sm text-gray-500">{resultCount[0]}</span>
                    </div>
                    <Slider 
                      id="search-depth" 
                      min={5} 
                      max={50} 
                      step={5} 
                      value={resultCount} 
                      onValueChange={setResultCount} 
                    />
                    <p className="text-xs text-gray-500">
                      Number of competitor results to retrieve per analysis
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="search-engine" className="text-sm font-medium">
                      Primary Search Engine
                    </Label>
                    <Select defaultValue="all">
                      <SelectTrigger id="search-engine">
                        <SelectValue placeholder="Select a search engine" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Engines</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="bing">Bing</SelectItem>
                        <SelectItem value="duckduckgo">DuckDuckGo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Notification Preferences</h3>
                  <p className="text-sm text-gray-500">Control when and how you receive notifications</p>
                </div>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Email Notifications</Label>
                      <p className="text-xs text-gray-500">Receive email updates when analysis completes</p>
                    </div>
                    <Switch 
                      checked={emailNotifications} 
                      onCheckedChange={setEmailNotifications} 
                    />
                  </div>
                </div>
                
                <Button className="bg-primary hover:bg-primary-dark">Save Preferences</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="account">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">Account Information</h3>
                  <p className="text-sm text-gray-500">Update your account details</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="full-name">Full Name</Label>
                    <Input id="full-name" placeholder="Your name" />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input id="email" type="email" placeholder="your@email.com" />
                  </div>
                </div>
                
                <Button className="bg-primary hover:bg-primary-dark">Update Account</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="api">
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-6">
                <div className="space-y-2">
                  <h3 className="text-xl font-medium">API Configuration</h3>
                  <p className="text-sm text-gray-500">Manage third-party API keys for enhanced analysis</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="google-api">Google Search API Key</Label>
                    <Input id="google-api" placeholder="Enter API key" type="password" />
                    <p className="text-xs text-gray-500">
                      Required for Google search integration
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="bing-api">Bing Search API Key</Label>
                    <Input id="bing-api" placeholder="Enter API key" type="password" />
                    <p className="text-xs text-gray-500">
                      Required for Bing search integration
                    </p>
                  </div>
                </div>
                
                <Button className="bg-primary hover:bg-primary-dark">Save API Keys</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
