import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Settings as SettingsIcon, User, Bell, Shield, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface TopicPreference {
  topic: {
    id: string;
    name: string;
  };
  weight: number;
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [dailyDigest, setDailyDigest] = useState(true);

  const { data: preferences } = useQuery<TopicPreference[]>({
    queryKey: ['/api/users', user?.id, 'preferences'],
    enabled: !!user?.id
  });

  const resetPreferencesMutation = useMutation({
    mutationFn: () => apiRequest(`/api/users/${user?.id}/preferences`, {
      method: 'DELETE'
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/users', user?.id, 'preferences'] });
      toast({
        title: "Preferences Reset",
        description: "Your content preferences have been reset successfully.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to reset preferences.",
        variant: "destructive",
      });
    },
  });

  if (!user) {
    return <div>Loading...</div>;
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Account Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Account Settings
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input id="username" value={user.username} disabled />
              <p className="text-xs text-gray-500">Username cannot be changed</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={user.email} disabled />
              <p className="text-xs text-gray-500">Email cannot be changed</p>
            </div>

            <div className="space-y-2">
              <Label>Account Role</Label>
              <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                {user.role}
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Notification Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Email Notifications</Label>
                <p className="text-xs text-gray-500">
                  Receive email updates about new content
                </p>
              </div>
              <Switch
                checked={emailNotifications}
                onCheckedChange={setEmailNotifications}
              />
            </div>

            <Separator />

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Daily Digest</Label>
                <p className="text-xs text-gray-500">
                  Get a summary of your daily drops
                </p>
              </div>
              <Switch
                checked={dailyDigest}
                onCheckedChange={setDailyDigest}
              />
            </div>

            <Button className="w-full mt-4" variant="outline">
              Save Notification Settings
            </Button>
          </CardContent>
        </Card>

        {/* Content Preferences */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <SettingsIcon className="h-5 w-5" />
              Content Preferences
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {preferences && preferences.length > 0 ? (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  Current preferences ({preferences.length} topics):
                </p>
                <div className="flex flex-wrap gap-2">
                  {preferences.map((pref) => (
                    <Badge key={pref.topic.id} variant="outline">
                      {pref.topic.name}
                      <span className="ml-2 text-xs text-gray-500">
                        {Math.round(pref.weight * 100)}%
                      </span>
                    </Badge>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">
                    Update Preferences
                  </Button>
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => resetPreferencesMutation.mutate()}
                    disabled={resetPreferencesMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-1" />
                    Reset All
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500 mb-4">No preferences configured</p>
                <Button variant="outline">
                  Set Up Preferences
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="lg:col-span-2 border-red-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <Shield className="h-5 w-5" />
              Danger Zone
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-red-50 p-4 rounded-lg">
              <h4 className="font-medium text-red-800 mb-2">Account Actions</h4>
              <p className="text-sm text-red-700 mb-4">
                These actions cannot be undone. Please be careful.
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="destructive" 
                  size="sm"
                  onClick={logout}
                >
                  Sign Out
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}