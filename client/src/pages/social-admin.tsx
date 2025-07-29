import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Play, 
  RefreshCw, 
  Zap, 
  Youtube, 
  Twitter,
  MessageSquare,
  TrendingUp,
  Users,
  ExternalLink
} from "lucide-react";

interface SocialMediaStats {
  twitter: number;
  youtube: number;
  reddit: number;
  total: number;
}

export default function SocialAdmin() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState<string | null>(null);

  // Social media ingestion mutation - all platforms
  const socialMediaMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ingest/social-media", {}),
    onSuccess: (data) => {
      toast({
        title: "Social Media Ingestion Complete",
        description: data.message || "Content ingested from all social platforms",
      });
      setLoading(null);
    },
    onError: (error) => {
      toast({
        title: "Ingestion Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(null);
    },
  });

  // Twitter specific ingestion
  const twitterMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ingest/twitter", {}),
    onSuccess: (data) => {
      toast({
        title: "Twitter Ingestion Complete",
        description: data.message || "Twitter content ingested successfully",
      });
      setLoading(null);
    },
    onError: (error) => {
      toast({
        title: "Twitter Ingestion Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(null);
    },
  });

  // YouTube specific ingestion
  const youtubeMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ingest/youtube", {}),
    onSuccess: (data) => {
      toast({
        title: "YouTube Ingestion Complete",
        description: data.message || "YouTube content ingested successfully",
      });
      setLoading(null);
    },
    onError: (error) => {
      toast({
        title: "YouTube Ingestion Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(null);
    },
  });

  // Reddit specific ingestion
  const redditMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ingest/reddit", {}),
    onSuccess: (data) => {
      toast({
        title: "Reddit Ingestion Complete",
        description: data.message || "Reddit content ingested successfully",
      });
      setLoading(null);
    },
    onError: (error) => {
      toast({
        title: "Reddit Ingestion Failed",
        description: error.message,
        variant: "destructive",
      });
      setLoading(null);
    },
  });

  const handleSocialMediaIngestion = () => {
    setLoading("social-media");
    socialMediaMutation.mutate();
  };

  const handleTwitterIngestion = () => {
    setLoading("twitter");
    twitterMutation.mutate();
  };

  const handleYouTubeIngestion = () => {
    setLoading("youtube");
    youtubeMutation.mutate();
  };

  const handleRedditIngestion = () => {
    setLoading("reddit");
    redditMutation.mutate();
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Social Media Content Ingestion</h1>
          <p className="text-muted-foreground mt-2">
            Manage content ingestion from X (Twitter), YouTube, and Reddit
          </p>
        </div>
        <div className="flex items-center space-x-2">
          <Button onClick={refreshData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Master Control */}
      <Card className="border-2 border-primary/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            All Platforms Ingestion
          </CardTitle>
          <CardDescription>
            Ingest content from all social media platforms simultaneously
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground">
            This will fetch content from:
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>X (Twitter):</strong> Top tech influencers and thought leaders</li>
              <li><strong>YouTube:</strong> Tech channels and educational content</li>
              <li><strong>Reddit:</strong> Programming, tech, and startup communities</li>
            </ul>
          </div>
          <Button 
            onClick={handleSocialMediaIngestion}
            disabled={loading === "social-media"}
            className="w-full"
            size="lg"
          >
            {loading === "social-media" ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            Run Complete Social Media Ingestion
          </Button>
        </CardContent>
      </Card>

      {/* Platform Specific Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Twitter */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Twitter className="h-5 w-5 text-blue-500" />
              X (Twitter)
            </CardTitle>
            <CardDescription>
              Tech influencers and industry leaders
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sources:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>@elonmusk, @sundarpichai</li>
                <li>@sama, @pmarca, @naval</li>
                <li>@VitalikButerin, @dhh</li>
                <li>And 15+ more tech leaders</li>
              </ul>
            </div>
            <Button 
              onClick={handleTwitterIngestion}
              disabled={loading === "twitter"}
              className="w-full"
              variant="outline"
            >
              {loading === "twitter" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Twitter className="h-4 w-4 mr-2" />
              )}
              Ingest Twitter
            </Button>
          </CardContent>
        </Card>

        {/* YouTube */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Youtube className="h-5 w-5 text-red-500" />
              YouTube
            </CardTitle>
            <CardDescription>
              Tech channels and educational videos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sources:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>TechCrunch, The Verge</li>
                <li>Marques Brownlee, Linus Tech Tips</li>
                <li>Two Minute Papers, Fireship</li>
                <li>And 10+ more tech channels</li>
              </ul>
            </div>
            <Button 
              onClick={handleYouTubeIngestion}
              disabled={loading === "youtube"}
              className="w-full"
              variant="outline"
            >
              {loading === "youtube" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Youtube className="h-4 w-4 mr-2" />
              )}
              Ingest YouTube
            </Button>
          </CardContent>
        </Card>

        {/* Reddit */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-orange-500" />
              Reddit
            </CardTitle>
            <CardDescription>
              Programming and tech communities
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              Sources:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>r/programming, r/webdev</li>
                <li>r/MachineLearning, r/artificial</li>
                <li>r/startups, r/entrepreneurs</li>
                <li>And 15+ more subreddits</li>
              </ul>
            </div>
            <Button 
              onClick={handleRedditIngestion}
              disabled={loading === "reddit"}
              className="w-full"
              variant="outline"
            >
              {loading === "reddit" ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4 mr-2" />
              )}
              Ingest Reddit
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Info Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Social Media Content Strategy
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Twitter className="h-4 w-4 text-blue-500" />
                Twitter/X Strategy
              </h4>
              <p className="text-sm text-muted-foreground">
                Real-time tech insights from industry leaders, breaking news, and trending discussions. 
                Perfect for staying current with the latest developments.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <Youtube className="h-4 w-4 text-red-500" />
                YouTube Strategy
              </h4>
              <p className="text-sm text-muted-foreground">
                In-depth tutorials, tech reviews, and educational content. 
                Provides comprehensive learning materials for professionals.
              </p>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-orange-500" />
                Reddit Strategy
              </h4>
              <p className="text-sm text-muted-foreground">
                Community discussions, problem-solving, and real developer experiences. 
                Great for practical insights and peer learning.
              </p>
            </div>
          </div>
          
          <Separator />
          
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>🔄 Content is automatically classified using AI</span>
            <span>📈 Engagement metrics help determine content quality</span>
            <span>🎯 Smart deduplication prevents content overlap</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}