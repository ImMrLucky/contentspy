import { Link } from "wouter";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AlertCircle, ChevronLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="container flex items-center justify-center min-h-[80vh]">
      <Card className="w-full max-w-md mx-4">
        <CardHeader>
          <div className="flex items-center gap-2">
            <AlertCircle className="h-6 w-6 text-destructive" />
            <CardTitle>404 - Page Not Found</CardTitle>
          </div>
          <CardDescription>
            Sorry, the page you're looking for doesn't exist or has been moved.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You might want to check the URL or navigate back to the homepage
            to continue exploring our content analysis tools.
          </p>
        </CardContent>
        <CardFooter>
          <Link href="/">
            <Button className="flex items-center gap-1">
              <ChevronLeft className="h-4 w-4" />
              <span>Back to Home</span>
            </Button>
          </Link>
        </CardFooter>
      </Card>
    </div>
  );
}
