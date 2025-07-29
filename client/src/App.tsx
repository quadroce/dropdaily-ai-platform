import { Switch, Route } from "wouter";
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
import Onboarding from "@/pages/onboarding";
import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";

function AuthenticatedApp() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <LandingPage />;
  }

  if (!user.isOnboarded) {
    return <Onboarding />;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Switch>
        <Route path="/" component={DailyDrop} />
        <Route path="/daily-drop" component={DailyDrop} />
        <Route path="/submit" component={SubmitContent} />
        <Route path="/admin" component={AdminDashboard} />
        <Route path="/rss-admin" component={RSSAdmin} />
        <Route path="/onboarding" component={Onboarding} />
        <Route path="/auth/login" component={Onboarding} />
        <Route path="/auth/register" component={Onboarding} />
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
