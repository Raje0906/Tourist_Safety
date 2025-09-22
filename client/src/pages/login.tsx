import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import Plasma from "@/components/Plasma";
import { Shield, LogIn, Users, UserCheck, UserPlus } from "lucide-react";
import { FaGoogle } from "react-icons/fa";

type LoginMode = 'tourist' | 'admin';
type TouristMode = 'signin' | 'register';

export default function Login() {
  const [, setLocation] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<LoginMode>('tourist');
  const [touristMode, setTouristMode] = useState<TouristMode>('signin');
  const [adminCredentials, setAdminCredentials] = useState({ username: "", password: "" });
  const [touristCredentials, setTouristCredentials] = useState({ email: "", password: "", name: "" });
  const { toast } = useToast();

  const handleTouristSignin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/tourist/signin", {
        email: touristCredentials.email,
        password: touristCredentials.password
      });
      const { user } = await response.json();

      localStorage.setItem("user", JSON.stringify(user));
      setLocation("/registration");
      
      toast({
        title: "Login Successful",
        description: "Welcome back! Redirecting to your dashboard.",
      });
    } catch (error) {
      toast({
        title: "Login Failed",
        description: "Invalid email or password. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleTouristRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      const response = await apiRequest("POST", "/api/auth/tourist/register", {
        email: touristCredentials.email,
        password: touristCredentials.password,
        name: touristCredentials.name
      });
      const { user } = await response.json();

      localStorage.setItem("user", JSON.stringify(user));
      setLocation("/registration");
      
      toast({
        title: "Registration Successful",
        description: "Welcome! Please complete your tourist profile.",
      });
    } catch (error) {
      toast({
        title: "Registration Failed",
        description: "Email already exists or registration failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
      <div style={{ width: '100%', height: '100vh', position: 'fixed', top: 0, left: 0, zIndex: 0 }}>
        <Plasma 
          color="#ff6b35"
          speed={0.6}
          direction="forward"
          scale={1.1}
          opacity={0.8}
          mouseInteractive={true}
        />
      </div>
      
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

          {/* Login Mode Selector */}
          <div className="flex mb-6 bg-card/40 backdrop-blur-sm rounded-xl p-2 border border-border">
            <button
              onMouseEnter={() => setLoginMode('tourist')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 ${
                loginMode === 'tourist' 
                  ? 'bg-primary text-primary-foreground shadow-lg transform scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <Users className="w-5 h-5 mr-2" />
              Tourist Login
            </button>
            <button
              onMouseEnter={() => setLoginMode('admin')}
              className={`flex-1 flex items-center justify-center py-3 px-4 rounded-lg transition-all duration-300 ${
                loginMode === 'admin' 
                  ? 'bg-primary text-primary-foreground shadow-lg transform scale-105' 
                  : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
              }`}
            >
              <UserCheck className="w-5 h-5 mr-2" />
              Admin Access
            </button>
          </div>

          {/* Login Form */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="pt-6">
              <h2 className="text-xl font-semibold text-center mb-6">
                {loginMode === 'tourist' ? 'Welcome Tourist' : 'Admin Portal'}
              </h2>
              
              {loginMode === 'tourist' ? (
                /* Tourist Login */
                <div className="space-y-4">
                  {/* Tourist Mode Selector */}
                  <div className="flex mb-4 bg-muted/20 rounded-lg p-1">
                    <button
                      onClick={() => setTouristMode('signin')}
                      className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-all duration-200 text-sm ${
                        touristMode === 'signin' 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <LogIn className="w-4 h-4 mr-2" />
                      Sign In
                    </button>
                    <button
                      onClick={() => setTouristMode('register')}
                      className={`flex-1 flex items-center justify-center py-2 px-3 rounded-md transition-all duration-200 text-sm ${
                        touristMode === 'register' 
                          ? 'bg-primary text-primary-foreground shadow-sm' 
                          : 'text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Register
                    </button>
                  </div>

                  {touristMode === 'signin' ? (
                    /* Sign In Form */
                    <form onSubmit={handleTouristSignin} className="space-y-4">
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={touristCredentials.email}
                        onChange={(e) => setTouristCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                        required
                      />
                      
                      <Input
                        type="password"
                        placeholder="Password"
                        value={touristCredentials.password}
                        onChange={(e) => setTouristCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                        required
                      />
                      
                      <Button
                        type="submit"
                        disabled={isLoading || !touristCredentials.email || !touristCredentials.password}
                        className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200"
                      >
                        <LogIn className="mr-2 w-4 h-4" />
                        Sign In
                      </Button>
                    </form>
                  ) : (
                    /* Register Form */
                    <form onSubmit={handleTouristRegister} className="space-y-4">
                      <Input
                        type="text"
                        placeholder="Full Name"
                        value={touristCredentials.name}
                        onChange={(e) => setTouristCredentials(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                        required
                      />
                      
                      <Input
                        type="email"
                        placeholder="Email Address"
                        value={touristCredentials.email}
                        onChange={(e) => setTouristCredentials(prev => ({ ...prev, email: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                        required
                      />
                      
                      <Input
                        type="password"
                        placeholder="Password"
                        value={touristCredentials.password}
                        onChange={(e) => setTouristCredentials(prev => ({ ...prev, password: e.target.value }))}
                        className="w-full px-4 py-3 bg-input border border-border rounded-lg focus:ring-2 focus:ring-ring focus:border-transparent"
                        required
                      />
                      
                      <Button
                        type="submit"
                        disabled={isLoading || !touristCredentials.email || !touristCredentials.password || !touristCredentials.name}
                        className="w-full bg-primary text-primary-foreground py-3 px-4 rounded-lg font-medium hover:bg-primary/90 transition-all duration-200"
                      >
                        <UserPlus className="mr-2 w-4 h-4" />
                        Create Account
                      </Button>
                    </form>
                  )}

                  {/* Optional Google Login */}
                  <div className="flex items-center my-4">
                    <hr className="flex-1 border-border" />
                    <span className="px-3 text-muted-foreground text-sm">or</span>
                    <hr className="flex-1 border-border" />
                  </div>

                  <Button
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full bg-white text-gray-800 py-3 px-4 rounded-lg font-medium hover:bg-gray-100 transition-all duration-200 flex items-center justify-center border"
                    variant="outline"
                  >
                    <FaGoogle className="mr-3 text-lg" />
                    Continue with Google
                  </Button>
                </div>
              ) : (
                /* Admin Login */
                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <p className="text-center text-muted-foreground mb-4">
                    Secure admin access for system management
                  </p>
                  
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
              )}

              <p className="text-xs text-muted-foreground text-center mt-6">
                By continuing, you agree to our Terms of Service and Privacy Policy
              </p>
            </CardContent>
          </Card>

          {/* Demo credentials hint - only show for admin mode */}
          {loginMode === 'admin' && (
            <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Demo Admin Credentials:</strong><br />
                Username: admin1, Password: admin123<br />
                Username: admin2, Password: admin456
              </p>
            </div>
          )}
          
          {/* Tourist info hint - only show for tourist mode */}
          {loginMode === 'tourist' && (
            <div className="mt-4 p-4 bg-muted/20 rounded-lg border border-border">
              <p className="text-sm text-muted-foreground text-center">
                <strong>Demo Tourist Credentials:</strong><br />
                Email: tourist1@example.com, Password: tourist123<br />
                Email: tourist2@example.com, Password: tourist456<br />
                Email: tourist3@example.com, Password: tourist789<br />
                <span className="block mt-2 text-xs">Or use Google OAuth for quick access</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
