import { storage } from "./storage";

export interface TouristBehaviorData {
  touristId: string;
  timestamp: Date;
  locationLat?: number;
  locationLng?: number;
  speed?: number; // km/h
  batteryLevel?: number;
  lastCommunication?: Date;
  heartRate?: number;
  isMoving: boolean;
  timeOfDay: 'morning' | 'afternoon' | 'evening' | 'night';
}

export interface AnomalyDetectionResult {
  isAnomaly: boolean;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  description: string;
  behaviorData: any;
}

export class AIAnomalyDetector {
  private static readonly LOCATION_CHANGE_THRESHOLD = 50; // km
  private static readonly SPEED_THRESHOLD = 120; // km/h unusual speed
  private static readonly COMMUNICATION_TIMEOUT = 6; // hours
  private static readonly HEART_RATE_THRESHOLD = { min: 50, max: 120 };
  private static readonly NIGHT_HOURS = { start: 22, end: 6 };

  /**
   * Main anomaly detection function
   */
  public static async detectAnomalies(behaviorData: TouristBehaviorData): Promise<AnomalyDetectionResult[]> {
    const anomalies: AnomalyDetectionResult[] = [];

    try {
      // Get tourist historical data for pattern analysis
      const tourist = await storage.getTouristByUserId(behaviorData.touristId);
      if (!tourist) {
        throw new Error('Tourist not found');
      }

      // Location anomaly detection
      const locationAnomaly = await this.detectLocationAnomaly(behaviorData, tourist);
      if (locationAnomaly.isAnomaly) {
        anomalies.push(locationAnomaly);
      }

      // Movement pattern anomaly detection
      const movementAnomaly = await this.detectMovementAnomaly(behaviorData);
      if (movementAnomaly.isAnomaly) {
        anomalies.push(movementAnomaly);
      }

      // Communication anomaly detection
      const communicationAnomaly = await this.detectCommunicationAnomaly(behaviorData);
      if (communicationAnomaly.isAnomaly) {
        anomalies.push(communicationAnomaly);
      }

      // Health anomaly detection (if health data available)
      if (behaviorData.heartRate) {
        const healthAnomaly = this.detectHealthAnomaly(behaviorData);
        if (healthAnomaly.isAnomaly) {
          anomalies.push(healthAnomaly);
        }
      }

      // Time-based behavior anomaly
      const timeAnomaly = this.detectTimeBasedAnomaly(behaviorData);
      if (timeAnomaly.isAnomaly) {
        anomalies.push(timeAnomaly);
      }

    } catch (error) {
      console.error('Error in anomaly detection:', error);
    }

    return anomalies;
  }

  /**
   * Detect unusual location changes
   */
  private static async detectLocationAnomaly(
    behaviorData: TouristBehaviorData, 
    tourist: any
  ): Promise<AnomalyDetectionResult> {
    const defaultResult: AnomalyDetectionResult = {
      isAnomaly: false,
      anomalyType: 'location',
      severity: 'low',
      confidence: 0,
      description: '',
      behaviorData: behaviorData
    };

    if (!behaviorData.locationLat || !behaviorData.locationLng) {
      return defaultResult;
    }

    // Check if tourist moved too far from their planned itinerary
    if (tourist.locationLat && tourist.locationLng) {
      const distance = this.calculateDistance(
        tourist.locationLat,
        tourist.locationLng,
        behaviorData.locationLat,
        behaviorData.locationLng
      );

      if (distance > this.LOCATION_CHANGE_THRESHOLD) {
        return {
          isAnomaly: true,
          anomalyType: 'location',
          severity: distance > 100 ? 'high' : 'medium',
          confidence: Math.min(0.9, distance / 100),
          description: `Tourist moved ${distance.toFixed(2)}km from last known location`,
          behaviorData: { ...behaviorData, previousLocation: { lat: tourist.locationLat, lng: tourist.locationLng }, distance }
        };
      }
    }

    return defaultResult;
  }

  /**
   * Detect unusual movement patterns
   */
  private static async detectMovementAnomaly(behaviorData: TouristBehaviorData): Promise<AnomalyDetectionResult> {
    const defaultResult: AnomalyDetectionResult = {
      isAnomaly: false,
      anomalyType: 'movement',
      severity: 'low',
      confidence: 0,
      description: '',
      behaviorData: behaviorData
    };

    // Detect unusual speed
    if (behaviorData.speed && behaviorData.speed > this.SPEED_THRESHOLD) {
      return {
        isAnomaly: true,
        anomalyType: 'movement',
        severity: behaviorData.speed > 200 ? 'critical' : 'high',
        confidence: 0.85,
        description: `Unusual speed detected: ${behaviorData.speed}km/h`,
        behaviorData: behaviorData
      };
    }

    // Detect sudden stop in movement during expected travel time
    if (!behaviorData.isMoving && behaviorData.timeOfDay === 'afternoon') {
      // This could indicate an emergency or unusual situation
      return {
        isAnomaly: true,
        anomalyType: 'movement',
        severity: 'medium',
        confidence: 0.6,
        description: 'Unexpected stop in movement during typical travel hours',
        behaviorData: behaviorData
      };
    }

    return defaultResult;
  }

  /**
   * Detect communication anomalies
   */
  private static async detectCommunicationAnomaly(behaviorData: TouristBehaviorData): Promise<AnomalyDetectionResult> {
    const defaultResult: AnomalyDetectionResult = {
      isAnomaly: false,
      anomalyType: 'communication',
      severity: 'low',
      confidence: 0,
      description: '',
      behaviorData: behaviorData
    };

    if (!behaviorData.lastCommunication) {
      return defaultResult;
    }

    const hoursSinceLastCommunication = 
      (new Date().getTime() - behaviorData.lastCommunication.getTime()) / (1000 * 60 * 60);

    if (hoursSinceLastCommunication > this.COMMUNICATION_TIMEOUT) {
      return {
        isAnomaly: true,
        anomalyType: 'communication',
        severity: hoursSinceLastCommunication > 24 ? 'critical' : 'high',
        confidence: Math.min(0.9, hoursSinceLastCommunication / 24),
        description: `No communication for ${hoursSinceLastCommunication.toFixed(1)} hours`,
        behaviorData: behaviorData
      };
    }

    return defaultResult;
  }

  /**
   * Detect health-related anomalies
   */
  private static detectHealthAnomaly(behaviorData: TouristBehaviorData): AnomalyDetectionResult {
    const defaultResult: AnomalyDetectionResult = {
      isAnomaly: false,
      anomalyType: 'health',
      severity: 'low',
      confidence: 0,
      description: '',
      behaviorData: behaviorData
    };

    if (!behaviorData.heartRate) {
      return defaultResult;
    }

    const { min, max } = this.HEART_RATE_THRESHOLD;
    
    if (behaviorData.heartRate < min || behaviorData.heartRate > max) {
      const severity = behaviorData.heartRate < 40 || behaviorData.heartRate > 150 ? 'critical' : 'high';
      
      return {
        isAnomaly: true,
        anomalyType: 'health',
        severity: severity,
        confidence: 0.8,
        description: `Abnormal heart rate detected: ${behaviorData.heartRate} BPM`,
        behaviorData: behaviorData
      };
    }

    return defaultResult;
  }

  /**
   * Detect time-based behavioral anomalies
   */
  private static detectTimeBasedAnomaly(behaviorData: TouristBehaviorData): AnomalyDetectionResult {
    const defaultResult: AnomalyDetectionResult = {
      isAnomaly: false,
      anomalyType: 'behavior',
      severity: 'low',
      confidence: 0,
      description: '',
      behaviorData: behaviorData
    };

    const currentHour = new Date().getHours();
    
    // Detect movement during unusual hours (late night/early morning)
    if (behaviorData.isMoving && 
        (currentHour >= this.NIGHT_HOURS.start || currentHour <= this.NIGHT_HOURS.end)) {
      return {
        isAnomaly: true,
        anomalyType: 'behavior',
        severity: 'medium',
        confidence: 0.7,
        description: `Unusual movement detected during night hours (${currentHour}:00)`,
        behaviorData: behaviorData
      };
    }

    return defaultResult;
  }

  /**
   * Calculate distance between two coordinates using Haversine formula
   */
  private static calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLon = this.toRadians(lon2 - lon1);
    
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  /**
   * Convert degrees to radians
   */
  private static toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  /**
   * Simulate real-time behavior analysis
   */
  public static async simulateBehaviorAnalysis(touristId: string): Promise<TouristBehaviorData> {
    // This would normally come from IoT devices, mobile apps, etc.
    const mockData: TouristBehaviorData = {
      touristId,
      timestamp: new Date(),
      locationLat: 28.6139 + (Math.random() - 0.5) * 0.1, // Delhi area with some variance
      locationLng: 77.2090 + (Math.random() - 0.5) * 0.1,
      speed: Math.random() * 60, // 0-60 km/h
      batteryLevel: Math.random() * 100,
      lastCommunication: new Date(Date.now() - Math.random() * 12 * 60 * 60 * 1000), // Last 12 hours
      heartRate: 60 + Math.random() * 40, // 60-100 BPM
      isMoving: Math.random() > 0.3,
      timeOfDay: this.getTimeOfDay()
    };

    return mockData;
  }

  private static getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 6 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }
}