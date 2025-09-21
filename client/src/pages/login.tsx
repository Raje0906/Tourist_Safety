import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import AnimatedBackground from "@/components/animated-background";
import { Shield, LogIn } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });
  const { toast } = useToast();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      // Simulate Google OAuth for demo purposes
      // In production, implement actual Google OAuth flow
      const mockGoogleUser = {
        email: `tourist${Math.floor(Math.random() * 1000)}@gmail.com`,
        name: `Tourist User ${Math.floor(Math.random() * 100)}`,
        googleId: `google_${Math.random().toString(36).substr(2, 9)}`,
      };

      const response = await apiRequest("POST", "/api/auth/google", mockGoogleUser);
      const { user } = await response.json();

      localStorage.setItem("user", JSON.stringify(user));
      setLocation("/registration");
      
      toast({
        title: "Login Successful",
        description: "Welcome! Please complete your registration.",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Google authentication failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/admin", adminCredentials);
      const { user } = await response.json();

      localStorage.setItem("user", JSON.stringify(user));
      setLocation("/admin");
      
      toast({
        title: "Admin Login Successful",
        description: "Welcome to the admin dashboard!",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid admin credentials. Please check your username and password.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      
      <div className="min-h-screen flex items-center justify-center p-4 relative z-10">
        <div className="w-full max-w-md">
          {/* Logo and Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-primary rounded-xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-primary-foreground" />
            </div>
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Tourist Safety Monitor
            </h1>
            <p className="text-muted-foreground">Secure • Reliable • Always Protected</p>
          </div>

          {/* Login Form */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-center mb-6">Welcome Back</h2>
              
              {/* Tourist Login */}
              <Button
                onClick={handleGoogleLogin}
                disabled={isLoading}
                className="w-full mb-4 bg-white text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 flex items-center justify-center border"
                variant="outline"
                data-testid="button-google-login"
              >
                <FaGoogle className="mr-3 text-lg" />
                Continue with Google (Tourist)
              </Button>

              <div className="flex items-center my-6">
                <hr className="flex-1 border-border" />
                <span className="px-3 text-muted-foreground text-sm">or</span>
                <hr className="flex-1 border-border" />
              </div>

              {/* Admin Login */}
              <form onSubmit={handleAdminLogin} className="space-y-4">
                <h3 className="text-sm font-medium text-muted-foreground">Admin Access</h3>
                
                <Input
                  type="text"
                  placeholder="Admin Username"
                  value={adminCredentials.username}
                  onChange={(e) => setAdminCredentials(prev => ({ ...prev, username: e.target.value }))}
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                  data-testid="input-admin-username"
                />
                
                <Input
                  type="password"
                  placeholder="Admin Password"
                  value={adminCredentials.password}
                  onChange={(e) => setAdminCredentials(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                  data-testid="input-admin-password"
                />
                
                <Button
                  type="submit"
                  disabled={isLoading || !adminCredentials.username || !adminCredentials.password}
                  className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200"
                  data-testid="button-admin-login"
                >
                  <LogIn className="mr-2 w-4 h-4" />
                  Sign In as Admin
                </Button>
              </form>

              <p className="text-xs text-muted-foreground text-center mt-6">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>

          {/* Demo credentials hint */}
          <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
            <p className="text-sm text-muted-foreground text-center">
              <strong>Demo Admin Credentials:</strong><br />
              Username: admin1, Password: admin123<br />
              Username: admin2, Password: admin456
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
