import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { 
  Play, 
  BarChart3, 
  Rss, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  RefreshCw,
  Mail,
  Database
} from "lucide-react";

interface FeedConfig {
  name: string;
  url: string;
  tags: string[];
}

interface IngestionStats {
  totalFeeds: number;
  activeFeeds: number;
  totalContent: number;
  recentContent: number;
  lastIngestion?: string;
}

export default function RSSAdmin() {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  // Get RSS feeds configuration
  const { data: feeds, isLoading: feedsLoading } = useQuery<FeedConfig[]>({
    queryKey: ["/api/admin/rss/feeds"],
  });

  // Get ingestion statistics
  const { data: stats, isLoading: statsLoading } = useQuery<IngestionStats>({
    queryKey: ["/api/admin/rss/stats"],
  });

  // Manual ingestion mutation
  const ingestMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/rss/ingest", {}),
    onSuccess: () => {
      toast({
        title: "RSS Ingestion Started",
        description: "Content ingestion has been triggered successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rss/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Ingestion Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  // Daily drops generation mutation
  const dailyDropsMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/rss/daily-drops", {}),
    onSuccess: () => {
      toast({
        title: "Daily Drops Generated",
        description: "Daily drops have been generated and emails sent.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/rss/stats"] });
    },
    onError: (error) => {
      toast({
        title: "Daily Drops Failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleRunIngestion = () => {
    setLoading("ingestion");
    ingestMutation.mutate();
  };

  const handleRunDailyDrops = () => {
    setLoading("daily-drops");
    dailyDropsMutation.mutate();
  };

  const refreshData = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/admin/rss/feeds"] });
    queryClient.invalidateQueries({ queryKey: ["/api/admin/rss/stats"] });
  };

  if (feedsLoading || statsLoading) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">RSS Ingestion Dashboard</h1>
          <p className="text-muted-foreground">
            Manage RSS content ingestion and daily drop generation
          </p>
        </div>
        <Button variant="outline" onClick={refreshData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Feeds</CardTitle>
            <Rss className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalFeeds || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.activeFeeds || 0} active
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Content</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContent || 0}</div>
            <p className="text-xs text-muted-foreground">
              All ingested articles
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Recent Content</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.recentContent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last Ingestion</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-sm font-bold">
              {stats?.lastIngestion 
                ? new Date(stats.lastIngestion).toLocaleDateString()
                : "Never"
              }
            </div>
            <p className="text-xs text-muted-foreground">
              Most recent run
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* RSS Ingestion */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Rss className="h-5 w-5" />
              RSS Content Ingestion
            </CardTitle>
            <CardDescription>
              Manually trigger content ingestion from RSS feeds
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This process will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Fetch content from all active RSS feeds</li>
                <li>Generate AI embeddings for classification</li>
                <li>Match content to user topics</li>
                <li>Store new articles in the database</li>
              </ul>
            </div>
            <Button 
              onClick={handleRunIngestion}
              disabled={ingestMutation.isPending}
              className="w-full"
            >
              {ingestMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Run RSS Ingestion
            </Button>
          </CardContent>
        </Card>

        {/* Daily Drops */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Daily Drop Generation
            </CardTitle>
            <CardDescription>
              Generate and send personalized daily drops to users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-muted-foreground">
              This process will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Analyze user preferences and interests</li>
                <li>Match users with relevant content</li>
                <li>Generate personalized email summaries</li>
                <li>Send daily drop emails to all users</li>
              </ul>
            </div>
            <Button 
              onClick={handleRunDailyDrops}
              disabled={dailyDropsMutation.isPending}
              className="w-full"
            >
              {dailyDropsMutation.isPending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Mail className="h-4 w-4 mr-2" />
              )}
              Generate Daily Drops
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* RSS Feeds Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            RSS Feeds Configuration
          </CardTitle>
          <CardDescription>
            Currently configured RSS feeds for content ingestion
          </CardDescription>
        </CardHeader>
        <CardContent>
          {feeds && feeds.length > 0 ? (
            <div className="space-y-4">
              {feeds.map((feed, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{feed.name}</h3>
                      <Badge variant="secondary">
                        <Rss className="h-3 w-3 mr-1" />
                        RSS
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">{feed.url}</p>
                    <div className="flex gap-1">
                      {feed.tags.map((tag, tagIndex) => (
                        <Badge key={tagIndex} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <div className="text-right">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2" />
              <p>No RSS feeds configured</p>
              <p className="text-sm">Check feeds.json configuration file</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Schedule Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Automated Schedule
          </CardTitle>
          <CardDescription>
            Automated ingestion and delivery schedule
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Rss className="h-8 w-8 text-blue-500" />
              <div>
                <h4 className="font-medium">Content Ingestion</h4>
                <p className="text-sm text-muted-foreground">Daily at 3:00 AM UTC</p>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 border rounded-lg">
              <Mail className="h-8 w-8 text-green-500" />
              <div>
                <h4 className="font-medium">Daily Drop Delivery</h4>
                <p className="text-sm text-muted-foreground">Daily at 7:00 AM UTC</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}