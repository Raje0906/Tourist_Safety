import { useState, useEffect } from "react";
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

  const statistics = statisticsData || { activeTourists: 0, activeAlerts: 0, emergencyIncidents: 0, averageSafetyScore: 0, unresolvedAnomalies: 0, pendingEFIRs: 0 };
  const tourists = (touristsData as any)?.tourists || [];
  const alerts = (alertsData as any)?.alerts || [];
  const incidents = (incidentsData as any)?.incidents || [];
  const anomalies = (anomaliesData as any)?.anomalies || [];
  const efirs = (efirsData as any)?.efirs || [];

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
    <div className="min-h-screen bg-background relative">
      <AnimatedBackground />

      {/* Admin Header */}
      <header className="bg-card border-b border-border p-4 relative z-10">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
              <SafeVoyageLogo className="text-primary-foreground" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Safe Voyage System</p>
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
                  <p className="text-muted-foreground text-sm">Active Tourists</p>
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
                  <p className="text-muted-foreground text-sm">Active Alerts</p>
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
                  <p className="text-muted-foreground text-sm">Emergency Calls</p>
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
                  <p className="text-muted-foreground text-sm">Safety Score Avg</p>
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
                  <p className="text-muted-foreground text-sm">AI Anomalies</p>
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
                  <p className="text-muted-foreground text-sm">Pending E-FIRs</p>
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
                    <Button size="sm" variant="default" data-testid="button-live-view">Live</Button>
                    <Button size="sm" variant="outline" data-testid="button-1h-view">1H</Button>
                    <Button size="sm" variant="outline" data-testid="button-1d-view">1D</Button>
                  </div>
                </div>
                <div className="bg-muted/30 rounded-lg h-80 flex items-center justify-center border">
                  <div className="text-center">
                    <MapPin className="w-16 h-16 text-muted-foreground mb-4 mx-auto opacity-50" />
                    <p className="text-muted-foreground">Interactive Heat Map</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Showing tourist density and risk zones
                    </p>
                  </div>
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
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">ID</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Name</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Location</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Safety Score</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                    <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
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
                <p className="text-sm text-muted-foreground">
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
