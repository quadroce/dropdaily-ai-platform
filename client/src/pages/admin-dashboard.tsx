import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModerationTable } from "@/components/admin/moderation-table";
import type { UserSubmissionWithUser } from "@shared/schema";
import {
  Eye,
  Clock,
  Users,
  Bot,
  Play,
  Database,
  Shield,
  CheckCircle,
  AlertTriangle,
  Activity,
  RefreshCw,
  Zap
} from "lucide-react";

interface SystemStats {
  totalContent: number;
  pendingSubmissions: number;
  activeUsers: number;
  dailyMatches: number;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const { data: stats, isLoading: statsLoading } = useQuery<SystemStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: submissions, isLoading: submissionsLoading } = useQuery<UserSubmissionWithUser[]>({
    queryKey: ["/api/admin/submissions", statusFilter],
    queryFn: () => {
      const url = statusFilter === "all" 
        ? "/api/admin/submissions"
        : `/api/admin/submissions?status=${statusFilter}`;
      return fetch(url).then(res => res.json());
    },
  });

  const ingestMutation = useMutation({
    mutationFn: () => apiRequest("POST", "/api/admin/ingest/youtube"),
    onSuccess: () => {
      toast({
        title: "Content ingestion started",
        description: "YouTube content ingestion has been triggered.",
      });
    },
    onError: (error) => {
      toast({
        title: "Ingestion failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const generateDropsMutation = useMutation({
    mutationFn: () => apiRequest("POST", `/api/admin/generate-drops/${user?.id}`),
    onSuccess: () => {
      toast({
        title: "Daily drops generated",
        description: "New daily drops have been generated for your account.",
      });
    },
  });

  const handleStatusFilter = (value: string) => {
    setStatusFilter(value);
  };

  if (user?.role !== 'admin') {
    return (
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <Card className="text-center py-12">
          <CardContent>
            <Shield className="mx-auto h-12 w-12 text-red-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Access Denied</h3>
            <p className="text-gray-600">You don't have permission to access the admin dashboard.</p>
          </CardContent>
        </Card>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
          <p className="text-gray-600 mt-1">Manage content, moderate submissions, and monitor system health</p>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Eye className="h-6 w-6 text-primary" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Total Content</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? "..." : stats?.totalContent.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Pending Review</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? "..." : stats?.pendingSubmissions}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">Active Users</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? "..." : stats?.activeUsers.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Bot className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">AI Matches/Day</dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {statsLoading ? "..." : stats?.dailyMatches.toLocaleString()}
                    </dd>
                  </dl>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Content Moderation */}
        <Card>
          <CardHeader className="border-b border-slate-200">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Content Moderation Queue</CardTitle>
                <CardDescription>Review and moderate user-submitted content</CardDescription>
              </div>
              <div className="flex items-center space-x-3">
                <Select value={statusFilter} onValueChange={handleStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  Bulk Actions
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {submissionsLoading ? (
              <div className="p-6 text-center">
                <RefreshCw className="mx-auto h-8 w-8 text-gray-400 animate-spin mb-2" />
                <p className="text-gray-500">Loading submissions...</p>
              </div>
            ) : submissions && submissions.length > 0 ? (
              <ModerationTable submissions={submissions} />
            ) : (
              <div className="p-6 text-center text-gray-500">
                <Clock className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                <p>No submissions found</p>
                <p className="text-sm">
                  {statusFilter === "all" 
                    ? "No content submissions yet" 
                    : `No ${statusFilter} submissions`
                  }
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* System Health & Actions */}
        <div className="grid md:grid-cols-2 gap-6">
          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                System Health
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Play className="h-5 w-5 text-red-500 mr-3" />
                    <span className="text-sm font-medium">YouTube API</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Healthy
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Bot className="h-5 w-5 text-blue-500 mr-3" />
                    <span className="text-sm font-medium">OpenAI Embeddings</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                    <Badge variant="outline" className="text-green-600 border-green-300">
                      Healthy
                    </Badge>
                  </div>
                </div>
                
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Database className="h-5 w-5 text-purple-500 mr-3" />
                    <span className="text-sm font-medium">pgvector Search</span>
                  </div>
                  <div className="flex items-center">
                    <div className="h-2 w-2 bg-yellow-500 rounded-full mr-2"></div>
                    <Badge variant="outline" className="text-yellow-600 border-yellow-300">
                      Slow
                    </Badge>
                  </div>
                </div>
              </div>
              
              <Separator className="my-4" />
              
              <div className="space-y-3">
                <Button 
                  className="w-full" 
                  variant="outline"
                  onClick={() => queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] })}
                >
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Run System Check
                </Button>
                
                <Button 
                  className="w-full"
                  onClick={() => ingestMutation.mutate()}
                  disabled={ingestMutation.isPending}
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {ingestMutation.isPending ? "Ingesting..." : "Trigger Content Ingestion"}
                </Button>
                
                <Button 
                  className="w-full"
                  variant="outline"
                  onClick={() => generateDropsMutation.mutate()}
                  disabled={generateDropsMutation.isPending}
                >
                  <Bot className="mr-2 h-4 w-4" />
                  {generateDropsMutation.isPending ? "Generating..." : "Generate Test Drops"}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="border-b border-slate-200">
              <CardTitle className="flex items-center">
                <Activity className="mr-2 h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-green-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Content ingestion completed: 47 new items</p>
                    <p className="text-xs text-gray-500">2 minutes ago</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-blue-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">New user submission approved</p>
                    <p className="text-xs text-gray-500">15 minutes ago</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-purple-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">Daily drops sent: {stats?.activeUsers || 0} emails delivered</p>
                    <p className="text-xs text-gray-500">6 hours ago</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-orange-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">System maintenance completed</p>
                    <p className="text-xs text-gray-500">Yesterday</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3">
                  <div className="h-2 w-2 bg-gray-500 rounded-full mt-2"></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900">User feedback analysis completed</p>
                    <p className="text-xs text-gray-500">2 days ago</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  );
}
