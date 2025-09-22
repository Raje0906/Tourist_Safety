/**
 * Advanced Geofencing Service
 * Handles location tracking, safe zone monitoring, and geofence alerts
 */

export interface GeoPoint {
  latitude: number;
  longitude: number;
}

export interface SafeZone {
  id: string;
  name: string;
  description?: string;
  center: GeoPoint;
  radius: number; // meters
  type: 'tourist_area' | 'embassy' | 'hospital' | 'police_station' | 'custom';
  isActive: boolean;
  createdAt: Date;
  metadata?: {
    contactInfo?: string;
    emergencyPhone?: string;
    operatingHours?: string;
    notes?: string;
  };
}

export interface GeofenceAlert {
  id: string;
  touristId: string;
  type: 'zone_entry' | 'zone_exit' | 'safe_zone_violation' | 'restricted_area';
  zoneName: string;
  location: GeoPoint;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  isResolved: boolean;
}

export interface LocationHistory {
  touristId: string;
  location: GeoPoint;
  accuracy?: number;
  timestamp: Date;
  speed?: number;
  heading?: number;
  source: 'gps' | 'network' | 'manual';
}

export class GeofencingService {
  private safeZones: Map<string, SafeZone> = new Map();
  private locationHistory: Map<string, LocationHistory[]> = new Map();
  private geofenceAlerts: Map<string, GeofenceAlert[]> = new Map();

  constructor() {
    this.initializeDefaultSafeZones();
  }

  /**
   * Initialize default safe zones for major tourist destinations
   */
  private initializeDefaultSafeZones(): void {
    const defaultZones: SafeZone[] = [
      {
        id: 'delhi_tourist_1',
        name: 'India Gate Area',
        description: 'Major tourist attraction in New Delhi',
        center: { latitude: 28.6129, longitude: 77.2295 },
        radius: 2000,
        type: 'tourist_area',
        isActive: true,
        createdAt: new Date(),
        metadata: {
          contactInfo: 'Tourist Information Center: +91-11-23363607',
          operatingHours: '24/7',
          notes: 'Well-patrolled area with good lighting'
        }
      },
      {
        id: 'mumbai_tourist_1',
        name: 'Gateway of India',
        description: 'Historic monument and tourist hub',
        center: { latitude: 18.9220, longitude: 72.8347 },
        radius: 1500,
        type: 'tourist_area',
        isActive: true,
        createdAt: new Date(),
        metadata: {
          contactInfo: 'Mumbai Police Tourist Helpline: +91-22-22621855',
          operatingHours: '06:00-22:00',
          notes: 'High tourist traffic, multiple security personnel'
        }
      },
      {
        id: 'bangalore_tourist_1',
        name: 'Cubbon Park Area',
        description: 'Central business district and park area',
        center: { latitude: 12.9716, longitude: 77.5946 },
        radius: 2500,
        type: 'tourist_area',
        isActive: true,
        createdAt: new Date(),
        metadata: {
          contactInfo: 'Bangalore City Police: +91-80-22942444',
          operatingHours: '05:00-21:00',
          notes: 'Safe during day hours, recommended for group travel after dark'
        }
      },
      {
        id: 'embassy_us_delhi',
        name: 'US Embassy New Delhi',
        description: 'United States Embassy',
        center: { latitude: 28.5982, longitude: 77.1892 },
        radius: 500,
        type: 'embassy',
        isActive: true,
        createdAt: new Date(),
        metadata: {
          contactInfo: 'US Embassy: +91-11-2419-8000',
          emergencyPhone: '+91-11-2419-8000',
          operatingHours: 'Mon-Fri 08:30-17:30',
          notes: 'High security zone'
        }
      },
      {
        id: 'hospital_aiims_delhi',
        name: 'AIIMS New Delhi',
        description: 'All India Institute of Medical Sciences',
        center: { latitude: 28.5672, longitude: 77.2100 },
        radius: 800,
        type: 'hospital',
        isActive: true,
        createdAt: new Date(),
        metadata: {
          contactInfo: 'AIIMS Emergency: +91-11-26588500',
          emergencyPhone: '+91-11-26588500',
          operatingHours: '24/7',
          notes: 'Major medical facility with emergency services'
        }
      }
    ];

    defaultZones.forEach(zone => {
      this.safeZones.set(zone.id, zone);
    });

    console.log(`✅ Initialized ${defaultZones.length} default safe zones`);
  }

  /**
   * Calculate distance between two points using Haversine formula
   */
  private calculateDistance(point1: GeoPoint, point2: GeoPoint): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (point1.latitude * Math.PI) / 180;
    const φ2 = (point2.latitude * Math.PI) / 180;
    const Δφ = ((point2.latitude - point1.latitude) * Math.PI) / 180;
    const Δλ = ((point2.longitude - point1.longitude) * Math.PI) / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  }

  /**
   * Check if a point is within a safe zone
   */
  isInSafeZone(location: GeoPoint): {
    isInSafeZone: boolean;
    zones: SafeZone[];
    nearestZone?: { zone: SafeZone; distance: number };
  } {
    const zones: SafeZone[] = [];
    let nearestZone: { zone: SafeZone; distance: number } | undefined;
    let minDistance = Infinity;

    for (const zone of this.safeZones.values()) {
      if (!zone.isActive) continue;

      const distance = this.calculateDistance(location, zone.center);
      
      if (distance <= zone.radius) {
        zones.push(zone);
      }

      if (distance < minDistance) {
        minDistance = distance;
        nearestZone = { zone, distance };
      }
    }

    return {
      isInSafeZone: zones.length > 0,
      zones,
      nearestZone
    };
  }

  /**
   * Process location update and check for geofence violations
   */
  async processLocationUpdate(
    touristId: string,
    location: GeoPoint,
    accuracy?: number,
    timestamp?: Date
  ): Promise<{
    success: boolean;
    alerts: GeofenceAlert[];
    safeZoneStatus: {
      isInSafeZone: boolean;
      currentZones: SafeZone[];
      nearestZone?: { zone: SafeZone; distance: number };
    };
  }> {
    try {
      const locationEntry: LocationHistory = {
        touristId,
        location,
        accuracy,
        timestamp: timestamp || new Date(),
        source: 'gps'
      };

      // Store location history
      if (!this.locationHistory.has(touristId)) {
        this.locationHistory.set(touristId, []);
      }
      const history = this.locationHistory.get(touristId)!;
      history.push(locationEntry);

      // Keep only last 100 location points per tourist
      if (history.length > 100) {
        history.splice(0, history.length - 100);
      }

      // Check safe zone status
      const safeZoneStatus = this.isInSafeZone(location);
      const alerts: GeofenceAlert[] = [];

      // Generate alerts based on location
      if (!safeZoneStatus.isInSafeZone) {
        // Check if tourist was previously in a safe zone
        const previousLocation = history[history.length - 2];
        if (previousLocation) {
          const previousSafeZoneStatus = this.isInSafeZone(previousLocation.location);
          if (previousSafeZoneStatus.isInSafeZone) {
            // Tourist left safe zone
            const alert = this.createGeofenceAlert(
              touristId,
              'zone_exit',
              previousSafeZoneStatus.zones[0].name,
              location,
              'medium',
              `Tourist has left the safe zone: ${previousSafeZoneStatus.zones[0].name}`
            );
            alerts.push(alert);
          }
        }

        // Check proximity to nearest safe zone
        if (safeZoneStatus.nearestZone && safeZoneStatus.nearestZone.distance > 5000) {
          const alert = this.createGeofenceAlert(
            touristId,
            'safe_zone_violation',
            'General Safety',
            location,
            'medium',
            `Tourist is more than 5km away from nearest safe zone (${safeZoneStatus.nearestZone.zone.name})`
          );
          alerts.push(alert);
        }
      } else {
        // Check if tourist entered a new safe zone
        const previousLocation = history[history.length - 2];
        if (previousLocation) {
          const previousSafeZoneStatus = this.isInSafeZone(previousLocation.location);
          const newZones = safeZoneStatus.zones.filter(zone => 
            !previousSafeZoneStatus.zones.some(prevZone => prevZone.id === zone.id)
          );

          for (const newZone of newZones) {
            const alert = this.createGeofenceAlert(
              touristId,
              'zone_entry',
              newZone.name,
              location,
              'low',
              `Tourist has entered safe zone: ${newZone.name}`
            );
            alerts.push(alert);
          }
        }
      }

      // Store alerts
      if (alerts.length > 0) {
        if (!this.geofenceAlerts.has(touristId)) {
          this.geofenceAlerts.set(touristId, []);
        }
        this.geofenceAlerts.get(touristId)!.push(...alerts);
      }

      return {
        success: true,
        alerts,
        safeZoneStatus
      };
    } catch (error) {
      console.error('Error processing location update:', error);
      return {
        success: false,
        alerts: [],
        safeZoneStatus: {
          isInSafeZone: false,
          currentZones: []
        }
      };
    }
  }

  /**
   * Create a geofence alert
   */
  private createGeofenceAlert(
    touristId: string,
    type: GeofenceAlert['type'],
    zoneName: string,
    location: GeoPoint,
    severity: GeofenceAlert['severity'],
    message: string
  ): GeofenceAlert {
    return {
      id: `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      touristId,
      type,
      zoneName,
      location,
      timestamp: new Date(),
      severity,
      message,
      isResolved: false
    };
  }

  /**
   * Add a new safe zone
   */
  addSafeZone(zone: Omit<SafeZone, 'id' | 'createdAt'>): string {
    const id = `zone_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const newZone: SafeZone = {
      ...zone,
      id,
      createdAt: new Date()
    };
    
    this.safeZones.set(id, newZone);
    console.log(`✅ Added new safe zone: ${newZone.name} (${id})`);
    return id;
  }

  /**
   * Update safe zone
   */
  updateSafeZone(id: string, updates: Partial<SafeZone>): boolean {
    const zone = this.safeZones.get(id);
    if (!zone) return false;

    const updatedZone = { ...zone, ...updates };
    this.safeZones.set(id, updatedZone);
    console.log(`✅ Updated safe zone: ${updatedZone.name}`);
    return true;
  }

  /**
   * Delete safe zone
   */
  deleteSafeZone(id: string): boolean {
    const deleted = this.safeZones.delete(id);
    if (deleted) {
      console.log(`🗑️ Deleted safe zone: ${id}`);
    }
    return deleted;
  }

  /**
   * Get all safe zones
   */
  getAllSafeZones(): SafeZone[] {
    return Array.from(this.safeZones.values());
  }

  /**
   * Get safe zones by type
   */
  getSafeZonesByType(type: SafeZone['type']): SafeZone[] {
    return Array.from(this.safeZones.values()).filter(zone => zone.type === type && zone.isActive);
  }

  /**
   * Get location history for a tourist
   */
  getLocationHistory(touristId: string, limit?: number): LocationHistory[] {
    const history = this.locationHistory.get(touristId) || [];
    return limit ? history.slice(-limit) : history;
  }

  /**
   * Get geofence alerts for a tourist
   */
  getGeofenceAlerts(touristId: string, includeResolved = false): GeofenceAlert[] {
    const alerts = this.geofenceAlerts.get(touristId) || [];
    return includeResolved ? alerts : alerts.filter(alert => !alert.isResolved);
  }

  /**
   * Resolve geofence alert
   */
  resolveAlert(touristId: string, alertId: string): boolean {
    const alerts = this.geofenceAlerts.get(touristId);
    if (!alerts) return false;

    const alert = alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.isResolved = true;
    console.log(`✅ Resolved geofence alert: ${alertId}`);
    return true;
  }

  /**
   * Get safe zones near a location
   */
  getNearbyZones(location: GeoPoint, radiusKm = 10): Array<{
    zone: SafeZone;
    distance: number;
  }> {
    const radiusMeters = radiusKm * 1000;
    const nearbyZones: Array<{ zone: SafeZone; distance: number }> = [];

    for (const zone of this.safeZones.values()) {
      if (!zone.isActive) continue;

      const distance = this.calculateDistance(location, zone.center);
      if (distance <= radiusMeters) {
        nearbyZones.push({ zone, distance });
      }
    }

    return nearbyZones.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Get emergency facilities near location
   */
  getEmergencyFacilities(location: GeoPoint, radiusKm = 20): Array<{
    zone: SafeZone;
    distance: number;
    estimatedTime: number; // minutes
  }> {
    const emergencyTypes: SafeZone['type'][] = ['hospital', 'police_station', 'embassy'];
    const facilities: Array<{ zone: SafeZone; distance: number; estimatedTime: number }> = [];

    for (const zone of this.safeZones.values()) {
      if (!zone.isActive || !emergencyTypes.includes(zone.type)) continue;

      const distance = this.calculateDistance(location, zone.center);
      if (distance <= radiusKm * 1000) {
        // Estimate travel time (assuming average speed of 30 km/h)
        const estimatedTime = Math.round((distance / 1000) / 30 * 60);
        facilities.push({ zone, distance, estimatedTime });
      }
    }

    return facilities.sort((a, b) => a.distance - b.distance);
  }

  /**
   * Generate safety recommendations based on location
   */
  getSafetyRecommendations(location: GeoPoint): {
    recommendations: string[];
    nearbyFacilities: Array<{ zone: SafeZone; distance: number }>;
    riskLevel: 'low' | 'medium' | 'high';
  } {
    const safeZoneStatus = this.isInSafeZone(location);
    const nearbyFacilities = this.getNearbyZones(location, 5);
    const emergencyFacilities = this.getEmergencyFacilities(location, 10);

    const recommendations: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' = 'low';

    if (!safeZoneStatus.isInSafeZone) {
      riskLevel = 'medium';
      recommendations.push('You are currently outside designated safe zones. Consider moving to a nearby tourist area.');
      
      if (safeZoneStatus.nearestZone) {
        const distanceKm = Math.round(safeZoneStatus.nearestZone.distance / 1000 * 10) / 10;
        recommendations.push(`Nearest safe zone: ${safeZoneStatus.nearestZone.zone.name} (${distanceKm} km away)`);
      }
    } else {
      recommendations.push(`You are in a safe zone: ${safeZoneStatus.zones[0].name}`);
    }

    if (emergencyFacilities.length === 0) {
      riskLevel = 'high';
      recommendations.push('No emergency facilities found nearby. Consider moving to a more developed area.');
    } else {
      const nearest = emergencyFacilities[0];
      recommendations.push(`Nearest emergency facility: ${nearest.zone.name} (${Math.round(nearest.distance / 1000 * 10) / 10} km)`);
    }

    // Time-based recommendations
    const hour = new Date().getHours();
    if (hour >= 22 || hour <= 6) {
      riskLevel = riskLevel === 'low' ? 'medium' : 'high';
      recommendations.push('It is currently late night/early morning. Stay in well-lit areas and avoid traveling alone.');
    }

    if (nearbyFacilities.length < 2) {
      recommendations.push('Limited facilities in this area. Ensure you have emergency contacts readily available.');
    }

    return {
      recommendations,
      nearbyFacilities,
      riskLevel
    };
  }

  /**
   * Get geofencing statistics
   */
  getStatistics(): {
    totalSafeZones: number;
    activeSafeZones: number;
    totalAlerts: number;
    unresolvedAlerts: number;
    zonesByType: { [key: string]: number };
    alertsByType: { [key: string]: number };
  } {
    const zones = Array.from(this.safeZones.values());
    const allAlerts = Array.from(this.geofenceAlerts.values()).flat();

    const zonesByType: { [key: string]: number } = {};
    const alertsByType: { [key: string]: number } = {};

    zones.forEach(zone => {
      zonesByType[zone.type] = (zonesByType[zone.type] || 0) + 1;
    });

    allAlerts.forEach(alert => {
      alertsByType[alert.type] = (alertsByType[alert.type] || 0) + 1;
    });

    return {
      totalSafeZones: zones.length,
      activeSafeZones: zones.filter(z => z.isActive).length,
      totalAlerts: allAlerts.length,
      unresolvedAlerts: allAlerts.filter(a => !a.isResolved).length,
      zonesByType,
      alertsByType
    };
  }
}

// Export singleton instance
export const geofencingService = new GeofencingService();