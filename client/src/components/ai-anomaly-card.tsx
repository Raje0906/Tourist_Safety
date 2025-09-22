import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Activity, MapPin, Clock, Brain, TrendingUp } from 'lucide-react';

interface AIAnomalyCardProps {
  anomaly: {
    id: string;
    touristId: string;
    anomalyType: string;
    severity: string;
    confidence: string;
    description: string;
    locationLat?: string;
    locationLng?: string;
    behaviorData?: any;
    isResolved: boolean;
    createdAt: string;
  };
  onResolve?: (id: string) => void;
  showActions?: boolean;
}

export default function AIAnomalyCard({ anomaly, onResolve, showActions = true }: AIAnomalyCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', badge: 'destructive' };
      case 'high': return { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', badge: 'destructive' };
      case 'medium': return { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', badge: 'default' };
      case 'low': return { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', badge: 'secondary' };
      default: return { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', badge: 'secondary' };
    }
  };

  const getAnomalyIcon = (type: string) => {
    switch (type) {
      case 'movement': return Activity;
      case 'location': return MapPin;
      case 'communication': return Clock;
      case 'behavior': return Brain;
      case 'health': return TrendingUp;
      default: return Activity;
    }
  };

  const colors = getSeverityColor(anomaly.severity);
  const IconComponent = getAnomalyIcon(anomaly.anomalyType);
  const confidence = Math.round(parseFloat(anomaly.confidence) * 100);

  return (
    <Card className={`${colors.bg} ${colors.border} border-l-4`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${colors.bg}`}>
              <IconComponent className={`h-5 w-5 ${colors.text}`} />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {anomaly.anomalyType.charAt(0).toUpperCase() + anomaly.anomalyType.slice(1)} Anomaly
                <Badge variant={colors.badge as any}>{anomaly.severity}</Badge>
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Tourist ID: {anomaly.touristId.slice(-8)}
              </p>
            </div>
          </div>
          <div className="text-right">
            <div className="text-sm font-medium">Confidence</div>
            <div className={`text-lg font-bold ${colors.text}`}>{confidence}%</div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription className="text-sm">
            {anomaly.description}
          </AlertDescription>
        </Alert>

        {/* Location Information */}
        {anomaly.locationLat && anomaly.locationLng && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>
              Location: {parseFloat(anomaly.locationLat).toFixed(4)}, {parseFloat(anomaly.locationLng).toFixed(4)}
            </span>
          </div>
        )}

        {/* Behavior Data Summary */}
        {anomaly.behaviorData && (
          <div className="bg-white rounded-lg p-3 space-y-2">
            <h4 className="text-sm font-medium">Behavior Analysis</h4>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {anomaly.behaviorData.speed && (
                <div>
                  <span className="text-muted-foreground">Speed:</span>
                  <span className="ml-1 font-medium">{Math.round(anomaly.behaviorData.speed)} km/h</span>
                </div>
              )}
              {anomaly.behaviorData.heartRate && (
                <div>
                  <span className="text-muted-foreground">Heart Rate:</span>
                  <span className="ml-1 font-medium">{anomaly.behaviorData.heartRate} BPM</span>
                </div>
              )}
              {anomaly.behaviorData.timeOfDay && (
                <div>
                  <span className="text-muted-foreground">Time:</span>
                  <span className="ml-1 font-medium">{anomaly.behaviorData.timeOfDay}</span>
                </div>
              )}
              {anomaly.behaviorData.isMoving !== undefined && (
                <div>
                  <span className="text-muted-foreground">Movement:</span>
                  <span className="ml-1 font-medium">{anomaly.behaviorData.isMoving ? 'Active' : 'Stationary'}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Timestamp and Actions */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" />
            {new Date(anomaly.createdAt).toLocaleString()}
          </div>
          
          {showActions && (
            <div className="flex gap-2">
              {anomaly.isResolved ? (
                <Badge variant="secondary" className="text-xs">
                  ✓ Resolved
                </Badge>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onResolve?.(anomaly.id)}
                >
                  Mark Resolved
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}