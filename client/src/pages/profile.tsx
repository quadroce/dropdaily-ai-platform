import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, Calendar, Star, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface TopicPreference {
  topic: {
    id: string;
    name: string;
  };
  weight: number;
}

interface Bookmark {
  id: string;
  contentId: string;
}

export default function Profile() {
  const { user } = useAuth();

  const { data: preferences } = useQuery<TopicPreference[]>({
    queryKey: ['/api/users', user?.id, 'preferences'],
    enabled: !!user?.id
  });

  const { data: bookmarks } = useQuery<Bookmark[]>({
    queryKey: ['/api/bookmarks'],
    enabled: !!user?.id
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Info Card */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">Name</label>
              <p className="text-lg font-semibold">{user.firstName} {user.lastName}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Email</label>
              <p className="text-sm text-gray-900">{user.email}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Role</label>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Member Since</label>
              <p className="text-sm text-gray-900 flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(user.createdAt).toLocaleDateString()}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Preferences Card */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Star className="h-5 w-5" />
              Content Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            {preferences && preferences.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Your personalized topics for daily content curation:</p>
                <div className="flex flex-wrap gap-2">
                  {preferences.map((pref, index) => (
                    <Badge key={`${pref.topic.id}-${index}`} variant="outline" className="text-sm">
                      {pref.topic.name}
                      <span className="ml-2 text-xs text-gray-500">
                        ({Math.round(pref.weight * 100)}%)
                      </span>
                    </Badge>
                  ))}
                </div>
                <Button variant="outline" size="sm" className="mt-4">
                  Update Preferences
                </Button>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No preferences set</p>
                <Button variant="outline" size="sm" className="mt-2">
                  Set Your Preferences
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Activity Stats */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Activity Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {bookmarks?.length || 0}
                </div>
                <p className="text-sm text-gray-500">Bookmarked Articles</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {preferences?.length || 0}
                </div>
                <p className="text-sm text-gray-500">Active Preferences</p>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-primary">
                  {user.isOnboarded ? 'Complete' : 'Pending'}
                </div>
                <p className="text-sm text-gray-500">Onboarding Status</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}