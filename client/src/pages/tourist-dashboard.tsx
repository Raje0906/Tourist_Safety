import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";
import AnimatedBackground from "@/components/animated-background";
import { 
  Shield, 
  Bell, 
  User, 
  AlertTriangle, 
  MapPin, 
  Share2, 
  Headphones,
  Calendar,
  Map,
  ShieldCheck,
  Navigation
} from "lucide-react";

export default function TouristDashboard() {
  const [, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lastMessage, isConnected } = useWebSocket();

  // Get user and tourist data from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const tourist = JSON.parse(localStorage.getItem("tourist") || "{}");

  // Redirect if not authenticated
  useEffect(() => {
    if (!user.id || !tourist.id) {
      setLocation("/");
    }
  }, [user.id, tourist.id, setLocation]);

  // Get current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const location = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setCurrentLocation(location);
          
          // Update tourist location
          updateLocationMutation.mutate({
            locationLat: location.lat.toString(),
            locationLng: location.lng.toString(),
            currentLocation: "Current Location",
          });
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    }
  }, []);

  // Fetch tourist alerts
  const { data: alertsData } = useQuery({
    queryKey: ['/api/alerts/tourist', tourist.id],
    enabled: !!tourist.id,
  });

  // Update location mutation
  const updateLocationMutation = useMutation({
    mutationFn: (locationData: any) => apiRequest("PATCH", `/api/tourists/${tourist.id}`, locationData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/alerts/tourist', tourist.id] });
    },
  });

  // Emergency panic button
  const emergencyMutation = useMutation({
    mutationFn: (emergencyData: any) => apiRequest("POST", "/api/emergencies", emergencyData),
    onSuccess: () => {
      toast({
        title: "Emergency Alert Sent",
        description: "Help is on the way! Authorities have been notified.",
      });
    },
  });

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'NEW_ALERT':
          if (lastMessage.data.touristId === tourist.id) {
            queryClient.invalidateQueries({ queryKey: ['/api/alerts/tourist', tourist.id] });
            toast({
              title: "New Alert",
              description: lastMessage.data.message,
              variant: lastMessage.data.severity === 'high' ? 'destructive' : 'default',
            });
          }
          break;
      }
    }
  }, [lastMessage, tourist.id, queryClient, toast]);

  const handlePanicButton = () => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location services for emergency alerts.",
        variant: "destructive",
      });
      return;
    }

    emergencyMutation.mutate({
      touristId: tourist.id,
      type: 'panic_button',
      location: 'Current Location',
      locationLat: currentLocation.lat.toString(),
      locationLng: currentLocation.lng.toString(),
      description: 'Emergency panic button activated',
    });
  };

  const handleLocationShare = () => {
    if (!currentLocation) {
      toast({
        title: "Location Required",
        description: "Please enable location services to share your location.",
        variant: "destructive",
      });
      return;
    }

    // Share location with emergency contacts
    const locationUrl = `https://maps.google.com/?q=${currentLocation.lat},${currentLocation.lng}`;
    
    if (navigator.share) {
      navigator.share({
        title: 'My Current Location',
        text: 'I am sharing my current location with you for safety.',
        url: locationUrl,
      });
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(locationUrl);
      toast({
        title: "Location Copied",
        description: "Location URL copied to clipboard. Share it with your emergency contacts.",
      });
    }
  };

  const alerts = (alertsData as any)?.alerts || [];
  const safetyScore = tourist.safetyScore || 85;

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />

      {/* Header */}
      <header className="bg-card/80 backdrop-blur-sm border-b border-border p-4 relative z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <Shield className="text-primary-foreground w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tourist Safety</h1>
              <p className="text-sm text-muted-foreground" data-testid="text-user-name">
                {tourist.firstName} {tourist.lastName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm text-muted-foreground">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            <Button variant="ghost" size="sm" data-testid="button-notifications">
              <Bell className="w-5 h-5" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-profile">
              <User className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto p-4 space-y-6 relative z-10">
        {/* Safety Score Card */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Safety Score</h2>
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse-soft"></div>
                <span className="text-sm text-muted-foreground">Active</span>
              </div>
            </div>
            <div className="flex items-center space-x-6">
              <div className="relative w-24 h-24">
                <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
                  <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="8" fill="none" className="text-muted"/>
                  <circle 
                    cx="50" 
                    cy="50" 
                    r="45" 
                    stroke="currentColor" 
                    strokeWidth="8" 
                    fill="none" 
                    className="text-green-400" 
                    strokeDasharray="251.2" 
                    strokeDashoffset={251.2 - (safetyScore / 100) * 251.2}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-2xl font-bold text-green-400" data-testid="text-safety-score">
                    {safetyScore}
                  </span>
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-medium text-green-400 mb-2">Good Safety Status</h3>
                <p className="text-muted-foreground text-sm mb-2">
                  You're in a safe area. Continue enjoying your trip!
                </p>
                <div className="flex space-x-2">
                  <span className="px-2 py-1 bg-green-500/20 text-green-400 text-xs rounded-full">
                    Low Risk Area
                  </span>
                  <span className="px-2 py-1 bg-blue-500/20 text-blue-400 text-xs rounded-full">
                    GPS Active
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Emergency Panel */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Panic Button */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6 text-center">
              <Button
                onClick={handlePanicButton}
                disabled={emergencyMutation.isPending}
                className="w-20 h-20 bg-destructive hover:bg-destructive/90 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-200 hover:scale-105"
                data-testid="button-panic"
              >
                <AlertTriangle className="text-destructive-foreground w-8 h-8" />
              </Button>
              <h3 className="font-semibold text-destructive mb-2">Emergency</h3>
              <p className="text-xs text-muted-foreground">Tap for immediate help</p>
            </CardContent>
          </Card>

          {/* Location Share */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6 text-center">
              <Button
                onClick={handleLocationShare}
                className="w-20 h-20 bg-primary hover:bg-primary/90 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-200"
                data-testid="button-share-location"
              >
                <Share2 className="text-primary-foreground w-8 h-8" />
              </Button>
              <h3 className="font-semibold mb-2">Share Location</h3>
              <p className="text-xs text-muted-foreground">Share with family</p>
            </CardContent>
          </Card>

          {/* Support */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6 text-center">
              <Button
                className="w-20 h-20 bg-accent hover:bg-accent/90 rounded-full flex items-center justify-center mx-auto mb-4 transition-all duration-200"
                data-testid="button-support"
              >
                <Headphones className="text-accent-foreground w-8 h-8" />
              </Button>
              <h3 className="font-semibold mb-2">Support</h3>
              <p className="text-xs text-muted-foreground">24/7 assistance</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Location & Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Card */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Navigation className="mr-2 text-primary" />
                Current Location
              </h3>
              <div className="bg-muted/50 rounded-lg h-48 flex items-center justify-center border border-border">
                <div className="text-center">
                  <MapPin className="w-12 h-12 text-muted-foreground mb-2 mx-auto" />
                  <p className="text-muted-foreground" data-testid="text-current-location">
                    {currentLocation ? `${currentLocation.lat.toFixed(6)}, ${currentLocation.lng.toFixed(6)}` : "Getting location..."}
                  </p>
                  <p className="text-sm text-green-400 mt-1">Safe Zone</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Alerts */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Bell className="mr-2 text-primary" />
                Recent Alerts
              </h3>
              <div className="space-y-3 max-h-48 overflow-y-auto">
                {alerts.length > 0 ? (
                  alerts.map((alert: any) => (
                    <div 
                      key={alert.id} 
                      className="flex items-start space-x-3 p-3 bg-muted/30 rounded-lg"
                      data-testid={`alert-${alert.id}`}
                    >
                      <div className={`w-2 h-2 rounded-full mt-2 ${
                        alert.severity === 'critical' ? 'bg-red-400' :
                        alert.severity === 'high' ? 'bg-orange-400' :
                        alert.severity === 'medium' ? 'bg-yellow-400' : 'bg-green-400'
                      }`}></div>
                      <div className="flex-1">
                        <p className="text-sm">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-muted-foreground mb-2 mx-auto opacity-50" />
                    <p className="text-muted-foreground">No alerts yet</p>
                    <p className="text-sm text-muted-foreground mt-1">You'll be notified of any important updates</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Trip Information */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Map className="mr-2 text-primary" />
              Trip Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <Calendar className="w-8 h-8 text-primary mb-2 mx-auto" />
                <p className="font-medium" data-testid="text-trip-duration">
                  {tourist.startDate && tourist.endDate 
                    ? `${Math.ceil((new Date(tourist.endDate).getTime() - new Date(tourist.startDate).getTime()) / (1000 * 60 * 60 * 24))} Days`
                    : "Not Set"
                  }
                </p>
                <p className="text-sm text-muted-foreground">Trip Duration</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <MapPin className="w-8 h-8 text-primary mb-2 mx-auto" />
                <p className="font-medium" data-testid="text-planned-locations">
                  {tourist.itinerary ? tourist.itinerary.split(',').length : 0} Locations
                </p>
                <p className="text-sm text-muted-foreground">Planned Visits</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <ShieldCheck className="w-8 h-8 text-primary mb-2 mx-auto" />
                <p className="font-medium text-green-400" data-testid="text-digital-id-status">
                  Verified
                </p>
                <p className="text-sm text-muted-foreground">Digital ID</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
