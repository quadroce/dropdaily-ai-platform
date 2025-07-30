import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User } from "lucide-react";
import { ForgotPasswordForm } from "./forgot-password-form";

interface SimpleAuthFormProps {
  onSuccess: () => void;
}

export function SimpleAuthForm({ onSuccess }: SimpleAuthFormProps) {
  const { login, register } = useAuth();
  const { toast } = useToast();
  const [isLogin, setIsLogin] = useState(true);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const [errors, setErrors] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
  });

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const validateForm = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
    };

    if (!isLogin) {
      if (!formData.firstName.trim()) {
        newErrors.firstName = "First name is required";
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = "Last name is required";
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
    }

    if (!formData.password.trim()) {
      newErrors.password = "Password is required";
    } else if (!isLogin && formData.password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
    }

    setErrors(newErrors);
    return !Object.values(newErrors).some(error => error !== "");
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field as keyof typeof errors]) {
      setErrors(prev => ({ ...prev, [field]: "" }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        await login(formData.email, formData.password);
      } else {
        await register({
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          password: formData.password,
        });
      }
      onSuccess();
    } catch (error) {
      toast({
        title: isLogin ? "Login failed" : "Registration failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Show forgot password form if requested
  if (showForgotPassword) {
    return (
      <ForgotPasswordForm onBack={() => setShowForgotPassword(false)} />
    );
  }

  return (
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
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">First Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
                  <Input
                    id="firstName"
                    className="pl-10"
                    placeholder="First name"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    autoComplete="given-name"
                  />
                </div>
                {errors.firstName && (
                  <p className="text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="Last name"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange("lastName", e.target.value)}
                  autoComplete="family-name"
                />
                {errors.lastName && (
                  <p className="text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="email"
                type="email"
                className="pl-10"
                placeholder="Enter your email"
                value={formData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                autoComplete="email"
              />
            </div>
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400 pointer-events-none" />
              <Input
                id="password"
                type="password"
                className="pl-10"
                placeholder={isLogin ? "Enter your password" : "Create a password (min. 6 characters)"}
                value={formData.password}
                onChange={(e) => handleInputChange("password", e.target.value)}
                autoComplete={isLogin ? "current-password" : "new-password"}
              />
            </div>
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? "Loading..." : (isLogin ? "Sign In" : "Create Account")}
          </Button>
          
          {isLogin && (
            <div className="text-center">
              <Button
                type="button"
                variant="link"
                className="text-sm p-0 h-auto"
                onClick={() => setShowForgotPassword(true)}
              >
                Password dimenticata?
              </Button>
            </div>
          )}
        </form>

        <Separator />

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => {
              setIsLogin(!isLogin);
              setFormData({ firstName: "", lastName: "", email: "", password: "" });
              setErrors({ firstName: "", lastName: "", email: "", password: "" });
            }}
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
  );
}