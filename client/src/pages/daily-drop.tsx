import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ContentCard } from "@/components/content/content-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { DailyDropWithContent, UserPreference, Topic } from "@shared/schema";
import { Calendar, Flame, Sparkles } from "lucide-react";

export default function DailyDrop() {
  const { user } = useAuth();

  const { data: dailyDrops, isLoading: dropsLoading } = useQuery<DailyDropWithContent[]>({
    queryKey: ["/api/users", user?.id, "daily-drops"],
    enabled: !!user,
  });

  const { data: userPreferences, isLoading: preferencesLoading } = useQuery<(UserPreference & { topic: Topic })[]>({
    queryKey: ["/api/users", user?.id, "preferences"],
    enabled: !!user,
  });

  const today = new Date().toLocaleDateString('en-US', { 
    weekday: 'long', 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });

  if (dropsLoading) {
    return (
      <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-8">
          {/* Sidebar Skeleton */}
          <div className="lg:col-span-3 mb-8 lg:mb-0">
            <Card className="sticky top-24">
              <CardContent className="p-6">
                <div className="flex items-center mb-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="ml-3">
                    <Skeleton className="h-5 w-24 mb-2" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full" />
                  <Skeleton className="h-20 w-full" />
                  <Skeleton className="h-12 w-full" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content Skeleton */}
          <div className="lg:col-span-9">
            <div className="mb-6">
              <Skeleton className="h-8 w-48 mb-2" />
              <Skeleton className="h-5 w-40" />
            </div>
            <div className="space-y-6">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="p-6">
                  <Skeleton className="h-40 w-full" />
                </Card>
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
      <div className="lg:grid lg:grid-cols-12 lg:gap-8">
        {/* Sidebar */}
        <div className="lg:col-span-3 mb-8 lg:mb-0">
          <Card className="sticky top-24">
            <CardContent className="p-6">
              <div className="flex items-center mb-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src="" alt={`${user?.firstName} ${user?.lastName}`} />
                  <AvatarFallback>
                    {user?.firstName?.[0]}{user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="ml-3">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-sm text-gray-500">Professional</p>
                </div>
              </div>
              
              <div className="space-y-4">
                {/* Today's Drop Stats */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Today's Drop</h4>
                  <Card className="bg-primary/5 border-primary/20">
                    <CardContent className="p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-primary">
                          {dailyDrops?.length || 0} items curated
                        </span>
                        <Sparkles className="h-4 w-4 text-primary" />
                      </div>
                    </CardContent>
                  </Card>
                </div>
                
                {/* User Interests */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Your Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {preferencesLoading ? (
                      <div className="flex flex-wrap gap-2">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-6 w-16 rounded-full" />
                        ))}
                      </div>
                    ) : (
                      userPreferences?.slice(0, 4).map((pref) => (
                        <Badge key={pref.id} variant="secondary" className="text-xs">
                          {pref.topic.name}
                        </Badge>
                      ))
                    )}
                  </div>
                </div>
                
                {/* Streak */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Streak</h4>
                  <div className="flex items-center">
                    <Flame className="h-4 w-4 text-orange-500 mr-2" />
                    <span className="text-sm text-gray-600">7 days</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Feed */}
        <div className="lg:col-span-9">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900 flex items-center">
              <Calendar className="mr-2 h-6 w-6" />
              Your Daily Drop
            </h1>
            <p className="text-gray-600 mt-1">{today}</p>
          </div>

          {dailyDrops && dailyDrops.length > 0 ? (
            <div className="space-y-6">
              {dailyDrops.map((drop) => (
                <ContentCard key={drop.id} drop={drop} />
              ))}
              
              {/* Load More Button */}
              <div className="text-center py-8">
                <Button className="bg-primary hover:bg-primary/90">
                  Load Tomorrow's Preview
                </Button>
              </div>
            </div>
          ) : (
            <Card className="text-center py-12">
              <CardContent>
                <Sparkles className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No content drops yet
                </h3>
                <p className="text-gray-600 mb-4">
                  We're working on curating your personalized content. Check back soon!
                </p>
                <Button variant="outline">
                  Refresh Feed
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </main>
  );
}
