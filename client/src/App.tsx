import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Navigation } from "@/components/layout/navigation";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import DailyDrop from "@/pages/daily-drop";
import SubmitContent from "@/pages/submit-content";
import AdminDashboard from "@/pages/admin-dashboard";
import RSSAdmin from "@/pages/rss-admin";
import SocialAdmin from "@/pages/social-admin";
import DatabaseAdmin from "@/pages/database-admin";
import Profile from "@/pages/profile";
import Settings from "@/pages/settings";
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";

function AuthenticatedApp() {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If user is not logged in, show routing for auth pages
  if (!user) {
    return (
      <Switch>
        <Route path="/login" component={Onboarding} />
        <Route path="/register" component={Onboarding} />
        <Route path="/auth/login" component={Onboarding} />
        <Route path="/auth/register" component={Onboarding} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/" component={LandingPage} />
        <Route component={LandingPage} />
      </Switch>
    );
  }

  // If user is not onboarded, show onboarding
  if (!user.isOnboarded) {
    return <Onboarding />;
  }

  // Authenticated user with full app access
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Switch>
        <Route path="/" component={DailyDrop} />
        <Route path="/daily-drop" component={DailyDrop} />
        <Route path="/submit" component={SubmitContent} />
        <Route path="/profile" component={Profile} />
        <Route path="/settings" component={Settings} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/rss-admin" component={RSSAdmin} />
        <Route path="/social-admin" component={SocialAdmin} />
        <Route path="/database-admin" component={DatabaseAdmin} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/login">
          {() => {
            setLocation("/");
            return null;
          }}
        </Route>
        <Route path="/register">
          {() => {
            setLocation("/");
            return null;
          }}
        </Route>
        <Route path="/auth/login">
          {() => {
            setLocation("/");
            return null;
          }}
        </Route>
        <Route path="/auth/register">
          {() => {
            setLocation("/");
            return null;
          }}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <AuthProvider>
          <Toaster />
          <AuthenticatedApp />
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
