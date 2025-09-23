import { useState, useEffect, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useWebSocket } from "@/lib/websocket";
import AnimatedBackground from "@/components/animated-background";
import EFIRForm from "@/components/efir-form";
import SafeVoyageLogo from "@/components/safe-voyage-logo";
import { 
  Shield, 
  Users, 
  AlertTriangle, 
  Phone, 
  ShieldCheck,
  MapPin,
  Bell,
  Settings,
  Download,
  FileText,
  Eye,
  MessageCircle,
  TrendingUp,
  TrendingDown,
  Minus,
  LogOut,
  Clock
} from "lucide-react";

interface StatisticsData {
  activeTourists: number;
  activeAlerts: number;
  emergencyIncidents: number;
  averageSafetyScore: number;
  unresolvedAnomalies: number;
  pendingEFIRs: number;
}

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { lastMessage, isConnected } = useWebSocket();
  const [showEFIRForm, setShowEFIRForm] = useState(false);
  const [selectedTouristId, setSelectedTouristId] = useState<string | null>(null);
  const [mapView, setMapView] = useState<'live' | '1h' | '1d'>('live');
  const mapRef = useRef<any>(null);
  const mapInstanceRef = useRef<any>(null);

  // Get user data from localStorage
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  // Redirect if not authenticated or not admin
  useEffect(() => {
    if (!user.id || user.role !== 'admin') {
      setLocation("/");
    }
  }, [user.id, user.role, setLocation]);

  // Fetch statistics
  const { data: statisticsData, refetch: refetchStatistics } = useQuery<StatisticsData>({
    queryKey: ['/api/statistics'],
  });

  // Fetch tourists
  const { data: touristsData, refetch: refetchTourists } = useQuery({
    queryKey: ['/api/tourists'],
  });

  // Fetch alerts
  const { data: alertsData, refetch: refetchAlerts } = useQuery({
    queryKey: ['/api/alerts'],
  });

  // Fetch emergency incidents
  const { data: incidentsData, refetch: refetchIncidents } = useQuery({
    queryKey: ['/api/emergencies'],
  });

  // Fetch AI anomalies
  const { data: anomaliesData, refetch: refetchAnomalies } = useQuery({
    queryKey: ['/api/anomalies'],
  });

  // Fetch E-FIRs
  const { data: efirsData, refetch: refetchEFIRs } = useQuery({
    queryKey: ['/api/efirs'],
  });

  const statistics = statisticsData || { activeTourists: 0, activeAlerts: 0, emergencyIncidents: 0, averageSafetyScore: 0, unresolvedAnomalies: 0, pendingEFIRs: 0 };
  const tourists = (touristsData as any)?.tourists || [];
  const alerts = (alertsData as any)?.alerts || [];
  const incidents = (incidentsData as any)?.incidents || [];
  const anomalies = (anomaliesData as any)?.anomalies || [];
  const efirs = (efirsData as any)?.efirs || [];

  // Update tourist markers on map based on database users with last stored location
  const updateTouristMarkers = async (map: any, L: any) => {
    if (!map || !tourists.length) return;

    // Clear existing markers
    map.eachLayer((layer: any) => {
      if (layer.options && layer.options.isMarker) {
        map.removeLayer(layer);
      }
    });

    // Add markers for each active tourist with their last stored location
    tourists.forEach((tourist: any, index: number) => {
      // Use actual stored coordinates from database (lat/lng fields)
      // If no coordinates stored, use demo coordinates around different cities for visualization
      const demoLocations = [
        [19.0760, 72.8777], // Mumbai, India
        [28.6139, 77.2090], // Delhi, India
        [12.9716, 77.5946], // Bangalore, India
        [13.0827, 80.2707], // Chennai, India
        [22.5726, 88.3639], // Kolkata, India
        [18.5204, 73.8567], // Pune, India
        [23.0225, 72.5714], // Ahmedabad, India
        [26.9124, 75.7873], // Jaipur, India
      ];
      
      // Priority: Use actual coordinates from database, fallback to demo locations
      const lat = tourist.lastKnownLatitude || tourist.latitude || 
                 demoLocations[index % demoLocations.length][0] + (Math.random() - 0.5) * 0.02;
      const lng = tourist.lastKnownLongitude || tourist.longitude || 
                 demoLocations[index % demoLocations.length][1] + (Math.random() - 0.5) * 0.02;
      
      // Only show active users (filter by status or recent activity)
      const isActive = tourist.isActive !== false && tourist.status !== 'inactive';
      if (!isActive) return; // Skip inactive users
      
      // Create custom pin icon based on safety score and activity status
      const getMarkerColor = (score: number, isOnline: boolean) => {
        if (!isOnline) return '#9ca3af'; // gray for offline
        if (score >= 80) return '#22c55e'; // green for safe
        if (score >= 60) return '#eab308'; // yellow for caution
        return '#ef4444'; // red for alert
      };
      
      const isOnline = tourist.lastSeen ? 
        (Date.now() - new Date(tourist.lastSeen).getTime()) < 300000 : true; // 5 min threshold
      const color = getMarkerColor(tourist.safetyScore || 50, isOnline);
      
      // Enhanced pin with status indicator
      const customIcon = L.divIcon({
        html: `
          <div style="
            position: relative;
            background-color: ${color};
            width: 16px;
            height: 16px;
            border-radius: 50%;
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.3);
            ${isOnline ? 'animation: pulse 2s infinite;' : ''}
          "></div>
          ${isOnline ? `
            <div style="
              position: absolute;
              top: -2px;
              right: -2px;
              width: 6px;
              height: 6px;
              background-color: #10b981;
              border: 1px solid white;
              border-radius: 50%;
              animation: ping 1s infinite;
            "></div>
          ` : ''}
          <style>
            @keyframes pulse {
              0% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
              100% { transform: scale(1); opacity: 1; }
            }
            @keyframes ping {
              0% { transform: scale(1); opacity: 1; }
              75%, 100% { transform: scale(1.5); opacity: 0; }
            }
          </style>
        `,
        className: 'custom-tourist-pin',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });

      const marker = L.marker([lat, lng], { 
        icon: customIcon,
        isMarker: true 
      }).addTo(map);
      
      // Enhanced popup with detailed user information from database
      const lastSeenText = tourist.lastSeen ? 
        `${new Date(tourist.lastSeen).toLocaleString()}` : 'Unknown';
      const statusText = isOnline ? 'Online' : 'Offline';
      const locationText = tourist.currentLocation || 
        `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      
      marker.bindPopup(`
        <div style="padding: 12px; min-width: 220px; font-family: system-ui;">
          <div style="display: flex; align-items: center; margin-bottom: 8px;">
            <div style="
              width: 12px; height: 12px; 
              background-color: ${color}; 
              border-radius: 50%; 
              margin-right: 8px;
              ${isOnline ? 'animation: pulse 1s infinite;' : ''}
            "></div>
            <h4 style="margin: 0; font-weight: bold; font-size: 14px;">
              ${tourist.firstName || 'Unknown'} ${tourist.lastName || 'User'}
            </h4>
          </div>
          
          <div style="font-size: 11px; color: #666; line-height: 1.4;">
            <p style="margin: 3px 0;"><strong>ID:</strong> #${tourist.digitalIdHash?.slice(-8) || tourist.id?.slice(-8) || 'N/A'}</p>
            <p style="margin: 3px 0;"><strong>Status:</strong> 
              <span style="color: ${isOnline ? '#10b981' : '#6b7280'}; font-weight: bold;">${statusText}</span>
            </p>
            <p style="margin: 3px 0;"><strong>Safety Score:</strong> 
              <span style="color: ${color}; font-weight: bold;">${tourist.safetyScore || 'N/A'}</span>
            </p>
            <p style="margin: 3px 0;"><strong>Alert Level:</strong> 
              ${tourist.safetyScore >= 80 ? '🟢 Safe' : tourist.safetyScore >= 60 ? '🟡 Caution' : '🔴 Alert'}
            </p>
            <p style="margin: 3px 0;"><strong>Location:</strong> ${locationText}</p>
            <p style="margin: 3px 0;"><strong>Last Seen:</strong> ${lastSeenText}</p>
            ${tourist.email ? `<p style="margin: 3px 0;"><strong>Email:</strong> ${tourist.email}</p>` : ''}
          </div>
          
          <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e5e7eb;">
            <button onclick="alert('Tracking user: ${tourist.firstName} ${tourist.lastName}')" 
                    style="background: #3b82f6; color: white; border: none; padding: 4px 8px; 
                           border-radius: 4px; font-size: 10px; cursor: pointer;">
              📍 Track User
            </button>
            <button onclick="alert('Sending message to: ${tourist.firstName} ${tourist.lastName}')" 
                    style="background: #10b981; color: white; border: none; padding: 4px 8px; 
                           border-radius: 4px; font-size: 10px; cursor: pointer; margin-left: 4px;">
              💬 Message
            </button>
          </div>
        </div>
      `);
    });

    // Add risk zones with enhanced styling
    const riskZones = [
      { lat: 19.0760, lng: 72.8777, radius: 800, risk: 'high', name: 'High Risk Zone - Downtown' },
      { lat: 28.6139, lng: 77.2090, radius: 600, risk: 'medium', name: 'Medium Risk - Station Area' },
      { lat: 12.9716, lng: 77.5946, radius: 500, risk: 'low', name: 'Safe Zone - Tech Park' }
    ];

    riskZones.forEach(zone => {
      const color = zone.risk === 'high' ? '#ef4444' : zone.risk === 'medium' ? '#f59e0b' : '#10b981';
      const circle = L.circle([zone.lat, zone.lng], {
        color: color,
        fillColor: color,
        fillOpacity: 0.15,
        weight: 2,
        radius: zone.radius,
        isMarker: true
      }).addTo(map);
      
      circle.bindPopup(`
        <div style="padding: 10px; font-family: system-ui;">
          <h4 style="margin: 0 0 8px 0; color: ${color}; font-size: 14px;">${zone.name}</h4>
          <p style="margin: 4px 0; font-size: 12px;"><strong>Risk Level:</strong> ${zone.risk.toUpperCase()}</p>
          <p style="margin: 4px 0; font-size: 12px;"><strong>Coverage:</strong> ${zone.radius}m radius</p>
          <p style="margin: 4px 0; font-size: 11px; color: #666;">Active monitoring zone</p>
        </div>
      `);
    });

    // Auto-fit map bounds to show all markers if there are users
    if (tourists.length > 0) {
      const group = new L.featureGroup();
      const demoLocations = [
        [19.0760, 72.8777], // Mumbai, India
        [28.6139, 77.2090], // Delhi, India
        [12.9716, 77.5946], // Bangalore, India
        [13.0827, 80.2707], // Chennai, India
        [22.5726, 88.3639], // Kolkata, India
        [18.5204, 73.8567], // Pune, India
        [23.0225, 72.5714], // Ahmedabad, India
        [26.9124, 75.7873], // Jaipur, India
      ];
      
      tourists.forEach((tourist: any, index: number) => {
        const lat = tourist.lastKnownLatitude || tourist.latitude || 
                   demoLocations[index % demoLocations.length][0];
        const lng = tourist.lastKnownLongitude || tourist.longitude || 
                   demoLocations[index % demoLocations.length][1];
        group.addLayer(L.marker([lat, lng]));
      });
      
      try {
        map.fitBounds(group.getBounds().pad(0.1));
      } catch (e) {
        // Fallback if bounds calculation fails
        map.setView([19.0760, 72.8777], 10);
      }
    }
  };

  // Initialize real map with tourist locations
  useEffect(() => {
    const initializeMap = async () => {
      if (typeof window === 'undefined') return;
      
      try {
        // Dynamically import Leaflet to avoid SSR issues
        const L = (await import('leaflet')).default;
        
        // Import Leaflet CSS
        if (!document.querySelector('link[href*="leaflet"]')) {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
          document.head.appendChild(link);
        }

        if (mapRef.current && !mapInstanceRef.current) {
          // Initialize map centered on a default location (e.g., Mumbai, India)
          const map = L.map(mapRef.current).setView([19.0760, 72.8777], 10);
          
          // Add OpenStreetMap tiles
          L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
          }).addTo(map);

          mapInstanceRef.current = map;
          
          // Add tourist markers when data is available
          updateTouristMarkers(map, L);
        }
      } catch (error) {
        console.error('Error initializing map:', error);
      }
    };

    initializeMap();
    
    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update markers when tourist data changes
  useEffect(() => {
    if (mapInstanceRef.current && tourists.length > 0) {
      const initLeaflet = async () => {
        const L = (await import('leaflet')).default;
        updateTouristMarkers(mapInstanceRef.current, L);
      };
      initLeaflet();
    }
  }, [tourists]);

  const handleMapViewChange = (view: 'live' | '1h' | '1d') => {
    setMapView(view);
    // In a real implementation, this would filter data based on time range
  };

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      switch (lastMessage.type) {
        case 'NEW_TOURIST':
        case 'LOCATION_UPDATE':
          refetchTourists();
          refetchStatistics();
          break;
        case 'NEW_ALERT':
          refetchAlerts();
          refetchStatistics();
          break;
        case 'EMERGENCY_INCIDENT':
        case 'INCIDENT_UPDATE':
          refetchIncidents();
          refetchStatistics();
          break;
        case 'AI_ANOMALY_DETECTED':
        case 'ANOMALY_UPDATE':
          refetchAnomalies();
          refetchStatistics();
          break;
        case 'NEW_EFIR':
        case 'EFIR_UPDATE':
          refetchEFIRs();
          refetchStatistics();
          break;
      }
    }
  }, [lastMessage, refetchTourists, refetchAlerts, refetchIncidents, refetchStatistics, refetchAnomalies, refetchEFIRs]);

  const handleExportData = () => {
    const data = {
      tourists,
      alerts,
      incidents,
      exportDate: new Date().toISOString(),
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tourist-safety-data-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical': return <TrendingUp className="w-4 h-4 text-red-400" />;
      case 'high': return <TrendingUp className="w-4 h-4 text-orange-400" />;
      case 'medium': return <Minus className="w-4 h-4 text-yellow-400" />;
      default: return <TrendingDown className="w-4 h-4 text-green-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-400/10 border-red-400/20 text-red-400';
      case 'high': return 'bg-orange-400/10 border-orange-400/20 text-orange-400';
      case 'medium': return 'bg-yellow-400/10 border-yellow-400/20 text-yellow-400';
      default: return 'bg-blue-400/10 border-blue-400/20 text-blue-400';
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem("user");
    
    // Redirect to login page
    setLocation("/");
  };

  const handleGenerateFIR = () => {
    // If no tourists are available, show an alert
    if (tourists.length === 0) {
      alert('No tourists available to generate E-FIR for');
      return;
    }
    
    // Use the first tourist as default, in a real app this would be selected by admin
    const firstTourist = tourists[0];
    setSelectedTouristId(firstTourist.id);
    setShowEFIRForm(true);
  };

  const handleEFIRSuccess = (efir: any) => {
    console.log('E-FIR created successfully:', efir);
    setShowEFIRForm(false);
    setSelectedTouristId(null);
    // Refresh E-FIRs data
    refetchEFIRs();
    refetchStatistics();
  };

  const handleEFIRCancel = () => {
    setShowEFIRForm(false);
    setSelectedTouristId(null);
  };

  return (
    <div className="min-h-screen relative" style={{ background: '#2a5e96' }}>
      <AnimatedBackground />

      {/* Admin Header */}
      <header className="bg-white/10 backdrop-blur-md border-b border-white/20 p-4 relative z-10 shadow-lg" style={{ background: 'rgba(255, 255, 255, 0.1)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <SafeVoyageLogo className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-white font-bold">Safe Voyage System</p>
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2 bg-muted/50 px-3 py-2 rounded-lg">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
              <span className="text-sm">{isConnected ? 'System Active' : 'System Offline'}</span>
            </div>
            <Button variant="ghost" size="sm" data-testid="button-settings">
              <Settings className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLocation("/authority-dashboard")}
              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
            >
              <Shield className="w-5 h-5" />
              Authority Dashboard
            </Button>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleLogout}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              data-testid="button-logout"
            >
              <LogOut className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto p-6 space-y-6 relative z-10">
        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Active Tourists</p>
                  <p className="text-2xl font-bold text-primary" data-testid="stat-active-tourists">
                    {statistics.activeTourists}
                  </p>
                </div>
                <div className="w-12 h-12 bg-primary/20 rounded-lg flex items-center justify-center">
                  <Users className="text-primary w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-green-400 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+12% from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Active Alerts</p>
                  <p className="text-2xl font-bold text-yellow-400" data-testid="stat-active-alerts">
                    {statistics.activeAlerts}
                  </p>
                </div>
                <div className="w-12 h-12 bg-yellow-400/20 rounded-lg flex items-center justify-center">
                  <AlertTriangle className="text-yellow-400 w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-yellow-400 text-sm">
                <Minus className="w-4 h-4 mr-1" />
                <span>3 new today</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Emergency Calls</p>
                  <p className="text-2xl font-bold text-destructive" data-testid="stat-emergency-calls">
                    {statistics.emergencyIncidents}
                  </p>
                </div>
                <div className="w-12 h-12 bg-destructive/20 rounded-lg flex items-center justify-center">
                  <Phone className="text-destructive w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-green-400 text-sm">
                <TrendingDown className="w-4 h-4 mr-1" />
                <span>-1 from yesterday</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Safety Score Avg</p>
                  <p className="text-2xl font-bold text-green-400" data-testid="stat-safety-score">
                    {statistics.averageSafetyScore}
                  </p>
                </div>
                <div className="w-12 h-12 bg-green-400/20 rounded-lg flex items-center justify-center">
                  <ShieldCheck className="text-green-400 w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-green-400 text-sm">
                <TrendingUp className="w-4 h-4 mr-1" />
                <span>+2.1 points</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">AI Anomalies</p>
                  <p className="text-2xl font-bold text-orange-500" data-testid="stat-anomalies">
                    {statistics.unresolvedAnomalies}
                  </p>
                </div>
                <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                  <TrendingUp className="text-orange-500 w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-orange-500 text-sm">
                <AlertTriangle className="w-4 h-4 mr-1" />
                <span>Unresolved</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-white font-bold text-sm">Pending E-FIRs</p>
                  <p className="text-2xl font-bold text-red-500" data-testid="stat-efirs">
                    {statistics.pendingEFIRs}
                  </p>
                </div>
                <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
                  <FileText className="text-red-500 w-6 h-6" />
                </div>
              </div>
              <div className="mt-2 flex items-center text-red-500 text-sm">
                <Clock className="w-4 h-4 mr-1" />
                <span>Awaiting Action</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Heat Map */}
          <div className="lg:col-span-2">
            <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center">
                    <MapPin className="mr-2 text-primary" />
                    Tourist Heat Map
                  </h3>
                  <div className="flex space-x-2">
                    <Button 
                      size="sm" 
                      variant={mapView === 'live' ? 'default' : 'outline'}
                      onClick={() => handleMapViewChange('live')}
                      data-testid="button-live-view"
                    >
                      Live
                    </Button>
                    <Button 
                      size="sm" 
                      variant={mapView === '1h' ? 'default' : 'outline'}
                      onClick={() => handleMapViewChange('1h')}
                      data-testid="button-1h-view"
                    >
                      1H
                    </Button>
                    <Button 
                      size="sm" 
                      variant={mapView === '1d' ? 'default' : 'outline'}
                      onClick={() => handleMapViewChange('1d')}
                      data-testid="button-1d-view"
                    >
                      1D
                    </Button>
                  </div>
                </div>
                
                {/* Real Map Container */}
                <div className="relative">
                  <div 
                    ref={mapRef}
                    className="w-full h-80 rounded-lg border bg-gray-100"
                    style={{ zIndex: 1 }}
                  ></div>
                  
                  {/* Map Controls Overlay */}
                  <div className="absolute top-4 right-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs z-10">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-white">Live Updates</span>
                      </div>
                      <div className="text-white/80">{statistics.activeTourists} Active</div>
                      <div className="text-white/80">{alerts.length} Alerts</div>
                    </div>
                  </div>
                  
                  {/* Map Legend */}
                  <div className="absolute bottom-4 left-4 bg-black/70 backdrop-blur-sm rounded-lg p-3 text-xs z-10">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                        <span className="text-white">Alert Users</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                        <span className="text-white">Caution Users</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <span className="text-white">Safe Users</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
                        <span className="text-white">Offline Users</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-ping"></div>
                        <span className="text-white">Online Status</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Loading State */}
                  {!mapInstanceRef.current && (
                    <div className="absolute inset-0 bg-muted/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <MapPin className="w-8 h-8 text-muted-foreground mb-2 mx-auto animate-spin" />
                        <p className="text-sm text-muted-foreground">Loading map...</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Alerts */}
          <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
            <CardContent className="p-6">
              <h3 className="text-lg font-semibold mb-4 flex items-center">
                <Bell className="mr-2 text-primary" />
                Recent Alerts
              </h3>
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {alerts.slice(0, 10).map((alert: any) => (
                  <div 
                    key={alert.id}
                    className={`p-3 rounded-lg border ${getSeverityColor(alert.severity)}`}
                    data-testid={`alert-item-${alert.id}`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{alert.title}</p>
                        <p className="text-xs opacity-90 mt-1">{alert.message}</p>
                        <p className="text-xs opacity-75 mt-1">
                          {new Date(alert.createdAt).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-1 ml-2">
                        {getSeverityIcon(alert.severity)}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="p-1 h-6 w-6"
                          data-testid={`button-view-alert-${alert.id}`}
                        >
                          <Eye className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tourist Management Table */}
        <Card className="bg-card/80 backdrop-blur-sm border border-border shadow-xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold flex items-center">
                <Users className="mr-2 text-primary" />
                Active Tourists
              </h3>
              <div className="flex space-x-2">
                <Button
                  onClick={handleExportData}
                  variant="outline"
                  data-testid="button-export-data"
                >
                  <Download className="mr-2 w-4 h-4" />
                  Export
                </Button>
                <Button 
                  onClick={handleGenerateFIR}
                  data-testid="button-generate-fir"
                >
                  <FileText className="mr-2 w-4 h-4" />
                  Generate FIR
                </Button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left py-3 px-4 font-bold text-white">ID</th>
                    <th className="text-left py-3 px-4 font-bold text-white">Name</th>
                    <th className="text-left py-3 px-4 font-bold text-white">Location</th>
                    <th className="text-left py-3 px-4 font-bold text-white">Safety Score</th>
                    <th className="text-left py-3 px-4 font-bold text-white">Status</th>
                    <th className="text-left py-3 px-4 font-bold text-white">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {tourists.map((tourist: any) => (
                    <tr 
                      key={tourist.id}
                      className="hover:bg-muted/30 transition-colors"
                      data-testid={`tourist-row-${tourist.id}`}
                    >
                      <td className="py-3 px-4 font-mono text-sm">
                        #{tourist.digitalIdHash?.slice(-8) || 'N/A'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                            <span className="text-primary-foreground text-xs font-bold">
                              {tourist.firstName?.[0]}{tourist.lastName?.[0]}
                            </span>
                          </div>
                          <span data-testid={`tourist-name-${tourist.id}`}>
                            {tourist.firstName} {tourist.lastName}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">
                        {tourist.currentLocation || 'Not Available'}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2">
                          <div className="w-12 h-2 bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${tourist.safetyScore >= 80 ? 'bg-green-400' : 
                                tourist.safetyScore >= 60 ? 'bg-yellow-400' : 'bg-red-400'}`}
                              style={{ width: `${tourist.safetyScore || 0}%` }}
                            ></div>
                          </div>
                          <span className={`text-sm ${tourist.safetyScore >= 80 ? 'text-green-400' : 
                            tourist.safetyScore >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {tourist.safetyScore || 0}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={tourist.safetyScore >= 80 ? "default" : 
                            tourist.safetyScore >= 60 ? "secondary" : "destructive"}
                          className={tourist.safetyScore >= 80 ? 
                            "bg-green-400/20 text-green-400" : 
                            tourist.safetyScore >= 60 ? 
                            "bg-yellow-400/20 text-yellow-400" : 
                            "bg-red-400/20 text-red-400"}
                          data-testid={`tourist-status-${tourist.id}`}
                        >
                          {tourist.safetyScore >= 80 ? 'Safe' : 
                           tourist.safetyScore >= 60 ? 'Caution' : 'Alert'}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-view-tourist-${tourist.id}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-track-tourist-${tourist.id}`}
                          >
                            <MapPin className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            data-testid={`button-message-tourist-${tourist.id}`}
                          >
                            <MessageCircle className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {tourists.length > 0 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
                <p className="text-sm text-white font-bold">
                  Showing 1-{Math.min(20, tourists.length)} of {tourists.length} tourists
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm">Previous</Button>
                  <Button size="sm">1</Button>
                  <Button variant="outline" size="sm">2</Button>
                  <Button variant="outline" size="sm">3</Button>
                  <Button variant="outline" size="sm">Next</Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* E-FIR Form Dialog */}
      <Dialog open={showEFIRForm} onOpenChange={setShowEFIRForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Generate Electronic FIR (E-FIR)</DialogTitle>
          </DialogHeader>
          {selectedTouristId && (
            <EFIRForm
              touristId={selectedTouristId}
              onSuccess={handleEFIRSuccess}
              onCancel={handleEFIRCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
