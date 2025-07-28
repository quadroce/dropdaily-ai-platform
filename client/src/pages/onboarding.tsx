import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { TopicSelector } from "@/components/onboarding/topic-selector";
import type { Topic } from "@shared/schema";
import { Droplet, Mail, Lock, User, Brain, CheckCircle, ArrowRight } from "lucide-react";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

type RegisterForm = z.infer<typeof registerSchema>;
type LoginForm = z.infer<typeof loginSchema>;

type OnboardingStep = 'auth' | 'topics' | 'complete';

export default function Onboarding() {
  const { user, login, register, updateUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState<OnboardingStep>('auth');
  const [isLogin, setIsLogin] = useState(true);
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);

  const registerForm = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    mode: "onTouched",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    },
  });

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    mode: "onTouched",
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const { data: topics } = useQuery<Topic[]>({
    queryKey: ["/api/topics"],
    enabled: step === 'topics',
  });

  const savePreferencesMutation = useMutation({
    mutationFn: (topicIds: string[]) =>
      apiRequest("POST", `/api/users/${user?.id}/preferences`, { topicIds }),
    onSuccess: () => {
      updateUser({ isOnboarded: true });
      setStep('complete');
      toast({
        title: "Welcome to DropDaily!",
        description: "Your preferences have been saved. We're generating your first daily drop.",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to save preferences",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onRegister = async (data: RegisterForm) => {
    try {
      await register(data);
      setStep('topics');
    } catch (error) {
      toast({
        title: "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    }
  };

  const onLogin = async (data: LoginForm) => {
    try {
      await login(data.email, data.password);
      // If user is already onboarded, they'll be redirected by the App component
      if (user && !user.isOnboarded) {
        setStep('topics');
      }
    } catch (error) {
      toast({
        title: "Login failed",
        description: error instanceof Error ? error.message : "Please check your credentials",
        variant: "destructive",
      });
    }
  };

  const handleTopicsContinue = () => {
    if (selectedTopics.length === 0) {
      toast({
        title: "Please select topics",
        description: "Choose at least one topic to personalize your content feed.",
        variant: "destructive",
      });
      return;
    }
    savePreferencesMutation.mutate(selectedTopics);
  };

  const getStepProgress = () => {
    switch (step) {
      case 'auth': return 33;
      case 'topics': return 66;
      case 'complete': return 100;
      default: return 0;
    }
  };

  // If user is already authenticated and onboarded, don't show onboarding
  if (user?.isOnboarded) {
    return null;
  }

  // If user is authenticated but not onboarded, skip to topics
  useEffect(() => {
    if (user && !user.isOnboarded && step === 'auth') {
      setStep('topics');
    }
  }, [user, step]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="flex items-center justify-center mb-6">
            <Droplet className="h-8 w-8 text-primary mr-2" />
            <span className="text-2xl font-bold text-gray-900">DropDaily</span>
          </div>
          
          {step !== 'complete' && (
            <>
              <h2 className="text-3xl font-bold text-gray-900">
                {step === 'auth' ? 'Welcome to DropDaily' : 'Personalize Your Feed'}
              </h2>
              <p className="mt-2 text-gray-600">
                {step === 'auth' 
                  ? 'AI-powered content discovery for busy professionals'
                  : 'Tell us what interests you to get started'
                }
              </p>
            </>
          )}
        </div>

        {/* Progress Bar */}
        {step !== 'complete' && (
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Step {step === 'auth' ? '1' : '2'} of 2
                </span>
                <span className="text-sm text-gray-500">{getStepProgress()}% complete</span>
              </div>
              <Progress value={getStepProgress()} className="h-2" />
            </CardContent>
          </Card>
        )}

        {/* Authentication Step */}
        {step === 'auth' && (
          <Card>
            <CardHeader>
              <CardTitle className="text-center">
                {isLogin ? 'Sign In' : 'Create Account'}
              </CardTitle>
              <CardDescription className="text-center">
                {isLogin 
                  ? 'Welcome back! Sign in to your account.'
                  : 'Create your account to get started with personalized content.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {isLogin ? (
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                    <FormField
                      control={loginForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                type="email"
                                className="pl-10"
                                placeholder="Enter your email"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                              <Input
                                type="password"
                                className="pl-10"
                                placeholder="Enter your password"
                                {...field}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Sign In
                    </Button>
                  </form>
                </Form>
              ) : (
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(onRegister)} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>First Name</FormLabel>
                            <FormControl>
                              <div className="relative">
                                <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                                <Input
                                  className="pl-10"
                                  placeholder="First name"
                                  value={field.value || ""}
                                  onChange={(e) => field.onChange(e.target.value)}
                                  onBlur={field.onBlur}
                                  name={field.name}
                                  autoComplete="given-name"
                                />
                              </div>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={registerForm.control}
                        name="lastName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Last Name</FormLabel>
                            <FormControl>
                              <Input
                                placeholder="Last name"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                                name={field.name}
                                autoComplete="family-name"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <FormField
                      control={registerForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                              <Input
                                type="email"
                                className="pl-10"
                                placeholder="Enter your email"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                                name={field.name}
                                autoComplete="email"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={registerForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                              <Input
                                type="password"
                                className="pl-10"
                                placeholder="Create a password (min. 6 characters)"
                                value={field.value || ""}
                                onChange={(e) => field.onChange(e.target.value)}
                                onBlur={field.onBlur}
                                name={field.name}
                                autoComplete="new-password"
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <Button type="submit" className="w-full">
                      Create Account
                    </Button>
                  </form>
                </Form>
              )}

              <Separator />

              <div className="text-center">
                <Button
                  variant="ghost"
                  onClick={() => setIsLogin(!isLogin)}
                  className="text-sm"
                >
                  {isLogin 
                    ? "Don't have an account? Sign up" 
                    : "Already have an account? Sign in"
                  }
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Topics Selection Step */}
        {step === 'topics' && topics && (
          <Card>
            <CardContent className="p-6">
              <TopicSelector
                topics={topics}
                selectedTopics={selectedTopics}
                onSelectionChange={setSelectedTopics}
                onContinue={handleTopicsContinue}
                onBack={() => setStep('auth')}
                isLoading={savePreferencesMutation.isPending}
              />
            </CardContent>
          </Card>
        )}

        {/* Completion Step */}
        {step === 'complete' && (
          <Card>
            <CardContent className="p-8 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Welcome to DropDaily! 🎉
              </h2>
              <p className="text-gray-600 mb-6">
                Your account is set up and we're already curating your first daily drop based on your interests. 
                You'll start receiving personalized content recommendations shortly.
              </p>
              
              <div className="bg-blue-50 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-blue-800 mb-2">What happens next?</h3>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Our AI is analyzing content that matches your interests</li>
                  <li>• You'll receive your first daily drop within 24 hours</li>
                  <li>• Check your email for daily content recommendations</li>
                  <li>• Your feed will get smarter as you interact with content</li>
                </ul>
              </div>

              <Button 
                className="w-full sm:w-auto" 
                onClick={() => window.location.reload()}
              >
                <ArrowRight className="mr-2 h-4 w-4" />
                Go to Your Feed
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
