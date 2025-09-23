import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useWebSocket } from "@/lib/websocket";
import SafeVoyageLogo from "@/components/safe-voyage-logo";
import LocationMap from "@/components/location-map";
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
  Navigation,
  LogOut
} from "lucide-react";

export default function TouristDashboard() {
  const [, setLocation] = useLocation();
  const [currentLocation, setCurrentLocation] = useState<{ 
    lat: number; 
    lng: number; 
    accuracy?: number;
    lastUpdated?: Date;
  } | null>(null);
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

  // Real-time location tracking
  useEffect(() => {
    let watchId: number | null = null;
    let locationUpdateInterval: NodeJS.Timeout | null = null;

    const startLocationTracking = () => {
      if (!navigator.geolocation) {
        console.warn("Geolocation is not supported by this browser.");
        // Fallback location if geolocation not supported
        const fallbackLocation = {
          lat: 40.7128,
          lng: -74.0060,
          accuracy: 1000,
          lastUpdated: new Date(),
        };
        setCurrentLocation(fallbackLocation);
        return;
      }

      // Options for high accuracy location tracking
      const options = {
        enableHighAccuracy: true, // Request high accuracy
        timeout: 15000, // 15 second timeout
        maximumAge: 30000 // 30 seconds cache for performance
      };

      // Success callback for location updates
      const onLocationSuccess = (position: GeolocationPosition) => {
        const newLocation = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          lastUpdated: new Date(),
        };

        // Only update if location has changed significantly (>10 meters)
        if (!currentLocation || 
            Math.abs(newLocation.lat - currentLocation.lat) > 0.0001 || 
            Math.abs(newLocation.lng - currentLocation.lng) > 0.0001) {
          
          setCurrentLocation(newLocation);
          
          // Update tourist location in backend
          updateLocationMutation.mutate({
            locationLat: newLocation.lat.toString(),
            locationLng: newLocation.lng.toString(),
            currentLocation: "Current Location",
            accuracy: position.coords.accuracy,
            timestamp: new Date().toISOString(),
          });

          console.log(`Location updated: ${newLocation.lat.toFixed(6)}, ${newLocation.lng.toFixed(6)} (Accuracy: ${position.coords.accuracy}m)`);
        }
      };

      // Error callback for location tracking
      const onLocationError = (error: GeolocationPositionError) => {
        console.error("Location tracking error:", error);
        
        let errorMessage = "";
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location access denied by user";
            toast({
              title: "Location Access Denied",
              description: "Please enable location services for real-time tracking",
              variant: "destructive",
            });
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information is unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        // If no current location is set, use fallback
        if (!currentLocation) {
          const mockLocation = {
            lat: 40.7128,
            lng: -74.0060,
            accuracy: 1000, // 1km accuracy for demo
            lastUpdated: new Date(),
          };
          setCurrentLocation(mockLocation);
          
          updateLocationMutation.mutate({
            locationLat: mockLocation.lat.toString(),
            locationLng: mockLocation.lng.toString(),
            currentLocation: "New York, NY (Demo Location)",
          });
        }
      };

      // Start watching location changes
      watchId = navigator.geolocation.watchPosition(
        onLocationSuccess,
        onLocationError,
        options
      );

      // Also set up periodic location updates as backup
      locationUpdateInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          onLocationSuccess,
          onLocationError,
          options
        );
      }, 60000); // Update every minute
    };

    // Start location tracking
    startLocationTracking();

    // Cleanup function
    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
      if (locationUpdateInterval) {
        clearInterval(locationUpdateInterval);
      }
    };
  }, []); // Empty dependency array to run only once

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

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("user");
    localStorage.removeItem("tourist");
    
    // Show logout message
    toast({
      title: "Logged Out",
      description: "You have been successfully logged out.",
    });
    
    // Redirect to login page
    setLocation("/");
  };

  return (
    <div className="min-h-screen relative" style={{ background: '#2a5e96' }}>

      {/* Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4 relative z-10 shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="bg-white/95 backdrop-blur-sm p-2 rounded-lg shadow-xl border border-white/40 flex items-center justify-center w-14 h-14">
              <SafeVoyageLogo className="text-primary-foreground" size={36} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Safe Voyage</h1>
              <p className="text-sm text-white font-bold" data-testid="text-user-name">
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
              <Bell className="w-6 h-6" />
            </Button>
            <Button variant="ghost" size="sm" data-testid="button-profile">
              <User className="w-6 h-6" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-logout"
            >
              <LogOut className="w-6 h-6" />
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
                <p className="text-white font-bold text-sm mb-2">
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
              <p className="text-xs text-white font-bold">Tap for immediate help</p>
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
              <p className="text-xs text-white font-bold">Share with family</p>
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
              <p className="text-xs text-white font-bold">24/7 assistance</p>
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
              <div className="bg-muted/50 rounded-lg h-48 border border-border overflow-hidden">
                {currentLocation ? (
                  <LocationMap 
                    lat={currentLocation.lat} 
                    lng={currentLocation.lng}
                    accuracy={currentLocation.accuracy}
                    className="h-full w-full"
                    showAccuracyCircle={true}
                  />
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <div className="text-center">
                      <MapPin className="w-12 h-12 text-muted-foreground mb-2 mx-auto animate-pulse" />
                      <p className="text-muted-foreground">Getting location...</p>
                    </div>
                  </div>
                )}
              </div>
              {currentLocation && (
                <div className="mt-4">
                  <div className="flex items-center justify-center space-x-4 mb-2">
                    <div className="flex items-center space-x-2">
                      <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                      <span className="text-sm text-green-400 font-medium">Live Tracking</span>
                    </div>
                    {currentLocation.accuracy && (
                      <span className="text-xs text-blue-400">
                        ±{Math.round(currentLocation.accuracy)}m accuracy
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground text-center" data-testid="text-current-location">
                    {currentLocation.lat.toFixed(6)}, {currentLocation.lng.toFixed(6)}
                  </p>
                  {currentLocation.lastUpdated && (
                    <p className="text-xs text-muted-foreground text-center mt-1">
                      Last updated: {currentLocation.lastUpdated.toLocaleTimeString()}
                    </p>
                  )}
                </div>
              )}
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
                        <p className="text-xs text-white font-bold">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8">
                    <Bell className="w-12 h-12 text-muted-foreground mb-2 mx-auto opacity-50" />
                    <p className="text-white font-bold">No alerts yet</p>
                    <p className="text-sm text-white font-bold mt-1">You'll be notified of any important updates</p>
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
                <p className="text-sm text-white font-bold">Trip Duration</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <MapPin className="w-8 h-8 text-primary mb-2 mx-auto" />
                <p className="font-medium" data-testid="text-planned-locations">
                  {tourist.itinerary ? tourist.itinerary.split(',').length : 0} Locations
                </p>
                <p className="text-sm text-white font-bold">Planned Visits</p>
              </div>
              <div className="text-center p-4 bg-muted/30 rounded-lg">
                <ShieldCheck className="w-8 h-8 text-primary mb-2 mx-auto" />
                <p className="font-medium text-green-400" data-testid="text-digital-id-status">
                  Verified
                </p>
                <p className="text-sm text-white font-bold">Digital ID</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
