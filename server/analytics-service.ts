/**
 * Advanced Analytics Service
 * Provides comprehensive analytics, reporting, and data insights
 */

import { storage } from './storage';

export interface AnalyticsMetrics {
  totalTourists: number;
  activeTourists: number;
  newTouristsToday: number;
  newTouristsWeek: number;
  totalAlerts: number;
  activeAlerts: number;
  resolvedAlerts: number;
  criticalAlerts: number;
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  averageSafetyScore: number;
  safetyScoreDistribution: { [key: string]: number };
  alertResponseTime: number; // average in minutes
  incidentResolutionTime: number; // average in hours
}

export interface LocationAnalytics {
  locationCoverage: { [key: string]: number };
  popularDestinations: Array<{ location: string; touristCount: number }>;
  safetyHotspots: Array<{ location: string; alertCount: number; riskLevel: string }>;
  emergencyFrequency: { [key: string]: number };
}

export interface TimeBasedAnalytics {
  hourlyActivity: number[];
  dailyActivity: number[];
  weeklyTrends: number[];
  monthlyTrends: number[];
  peakHours: Array<{ hour: number; activity: number }>;
  alertsByHour: number[];
  incidentsByHour: number[];
}

export interface TouristBehaviorAnalytics {
  averageStayDuration: number; // days
  mostUsedFeatures: Array<{ feature: string; usage: number }>;
  safetyComplianceRate: number; // percentage
  emergencyResponseRate: number; // percentage
  locationSharingRate: number; // percentage
  digitalIdVerificationRate: number; // percentage
}

export interface SystemPerformanceAnalytics {
  apiResponseTimes: { [key: string]: number };
  systemUptime: number; // percentage
  notificationDeliveryRate: number; // percentage
  blockchainTransactionSuccess: number; // percentage
  ipfsUploadSuccess: number; // percentage
  databasePerformance: {
    queryTime: number;
    connectionPool: number;
    errorRate: number;
  };
}

export interface PredictiveAnalytics {
  riskPredictions: Array<{
    touristId: string;
    riskScore: number;
    riskFactors: string[];
    recommendations: string[];
  }>;
  trendForecasts: {
    expectedTourists: number[];
    expectedAlerts: number[];
    expectedIncidents: number[];
  };
  seasonalPatterns: {
    monthlyPatterns: { [key: string]: number };
    weeklyPatterns: { [key: string]: number };
    holidayEffects: { [key: string]: number };
  };
}

export class AnalyticsService {
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    // Start background cache warming
    this.startCacheWarming();
  }

  /**
   * Get comprehensive system metrics
   */
  async getSystemMetrics(): Promise<AnalyticsMetrics> {
    const cacheKey = 'system_metrics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tourists = await storage.getAllActiveTourists();
      const alerts = await storage.getAlerts();
      const incidents = await storage.getEmergencyIncidents();

      const now = new Date();
      const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

      const newTouristsToday = tourists.filter(t => 
        new Date(t.createdAt!).getTime() >= today.getTime()
      ).length;

      const newTouristsWeek = tourists.filter(t => 
        new Date(t.createdAt!).getTime() >= weekAgo.getTime()
      ).length;

      const activeAlerts = alerts.filter(a => !a.isResolved);
      const criticalAlerts = alerts.filter(a => a.severity === 'critical' && !a.isResolved);
      const activeIncidents = incidents.filter(i => i.status === 'active');

      const safetyScores = tourists.map(t => t.safetyScore || 0);
      const averageSafetyScore = safetyScores.length > 0 
        ? safetyScores.reduce((sum, score) => sum + score, 0) / safetyScores.length
        : 0;

      const safetyScoreDistribution = {
        'excellent (90-100)': safetyScores.filter(s => s >= 90).length,
        'good (80-89)': safetyScores.filter(s => s >= 80 && s < 90).length,
        'fair (70-79)': safetyScores.filter(s => s >= 70 && s < 80).length,
        'poor (60-69)': safetyScores.filter(s => s >= 60 && s < 70).length,
        'critical (0-59)': safetyScores.filter(s => s < 60).length
      };

      // Calculate response times (mock data for now)
      const alertResponseTime = this.calculateAverageResponseTime(alerts);
      const incidentResolutionTime = this.calculateAverageResolutionTime(incidents);

      const metrics: AnalyticsMetrics = {
        totalTourists: tourists.length,
        activeTourists: tourists.filter(t => t.isActive).length,
        newTouristsToday,
        newTouristsWeek,
        totalAlerts: alerts.length,
        activeAlerts: activeAlerts.length,
        resolvedAlerts: alerts.filter(a => a.isResolved).length,
        criticalAlerts: criticalAlerts.length,
        totalIncidents: incidents.length,
        activeIncidents: activeIncidents.length,
        resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
        averageSafetyScore: Math.round(averageSafetyScore * 10) / 10,
        safetyScoreDistribution,
        alertResponseTime,
        incidentResolutionTime
      };

      this.setCache(cacheKey, metrics);
      return metrics;
    } catch (error) {
      console.error('Error calculating system metrics:', error);
      throw error;
    }
  }

  /**
   * Get location-based analytics
   */
  async getLocationAnalytics(): Promise<LocationAnalytics> {
    const cacheKey = 'location_analytics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tourists = await storage.getAllActiveTourists();
      const alerts = await storage.getAlerts();
      const incidents = await storage.getEmergencyIncidents();

      // Location coverage analysis
      const locationCoverage: { [key: string]: number } = {};
      const locationAlerts: { [key: string]: number } = {};

      tourists.forEach(tourist => {
        if (tourist.currentLocation) {
          const city = this.extractCityFromLocation(tourist.currentLocation);
          locationCoverage[city] = (locationCoverage[city] || 0) + 1;
        }
      });

      alerts.forEach(alert => {
        if (alert.location) {
          const city = this.extractCityFromLocation(alert.location);
          locationAlerts[city] = (locationAlerts[city] || 0) + 1;
        }
      });

      // Popular destinations
      const popularDestinations = Object.entries(locationCoverage)
        .map(([location, touristCount]) => ({ location, touristCount }))
        .sort((a, b) => b.touristCount - a.touristCount)
        .slice(0, 10);

      // Safety hotspots
      const safetyHotspots = Object.entries(locationAlerts)
        .map(([location, alertCount]) => ({
          location,
          alertCount,
          riskLevel: alertCount > 10 ? 'high' : alertCount > 5 ? 'medium' : 'low'
        }))
        .sort((a, b) => b.alertCount - a.alertCount)
        .slice(0, 10);

      // Emergency frequency by type
      const emergencyFrequency: { [key: string]: number } = {};
      incidents.forEach(incident => {
        emergencyFrequency[incident.type] = (emergencyFrequency[incident.type] || 0) + 1;
      });

      const analytics: LocationAnalytics = {
        locationCoverage,
        popularDestinations,
        safetyHotspots,
        emergencyFrequency
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error calculating location analytics:', error);
      throw error;
    }
  }

  /**
   * Get time-based analytics
   */
  async getTimeBasedAnalytics(): Promise<TimeBasedAnalytics> {
    const cacheKey = 'time_analytics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tourists = await storage.getAllActiveTourists();
      const alerts = await storage.getAlerts();
      const incidents = await storage.getEmergencyIncidents();

      // Initialize arrays for 24 hours, 7 days, 4 weeks, 12 months
      const hourlyActivity = new Array(24).fill(0);
      const dailyActivity = new Array(7).fill(0);
      const weeklyTrends = new Array(4).fill(0);
      const monthlyTrends = new Array(12).fill(0);
      const alertsByHour = new Array(24).fill(0);
      const incidentsByHour = new Array(24).fill(0);

      // Analyze tourist activity patterns
      tourists.forEach(tourist => {
        const date = new Date(tourist.createdAt!);
        const hour = date.getHours();
        const day = date.getDay();
        const week = Math.floor((Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
        const month = date.getMonth();

        hourlyActivity[hour]++;
        dailyActivity[day]++;
        if (week < 4) weeklyTrends[week]++;
        monthlyTrends[month]++;
      });

      // Analyze alert patterns
      alerts.forEach(alert => {
        const hour = new Date(alert.createdAt!).getHours();
        alertsByHour[hour]++;
      });

      // Analyze incident patterns
      incidents.forEach(incident => {
        const hour = new Date(incident.createdAt!).getHours();
        incidentsByHour[hour]++;
      });

      // Find peak hours
      const peakHours = hourlyActivity
        .map((activity, hour) => ({ hour, activity }))
        .sort((a, b) => b.activity - a.activity)
        .slice(0, 5);

      const analytics: TimeBasedAnalytics = {
        hourlyActivity,
        dailyActivity,
        weeklyTrends,
        monthlyTrends,
        peakHours,
        alertsByHour,
        incidentsByHour
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error calculating time-based analytics:', error);
      throw error;
    }
  }

  /**
   * Get tourist behavior analytics
   */
  async getTouristBehaviorAnalytics(): Promise<TouristBehaviorAnalytics> {
    const cacheKey = 'behavior_analytics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tourists = await storage.getAllActiveTourists();

      // Calculate average stay duration
      const stayDurations = tourists
        .filter(t => t.startDate && t.endDate)
        .map(t => {
          const start = new Date(t.startDate!);
          const end = new Date(t.endDate!);
          return (end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000);
        });

      const averageStayDuration = stayDurations.length > 0
        ? stayDurations.reduce((sum, duration) => sum + duration, 0) / stayDurations.length
        : 0;

      // Mock feature usage data (in production, track actual usage)
      const mostUsedFeatures = [
        { feature: 'Location Tracking', usage: Math.floor(tourists.length * 0.85) },
        { feature: 'Emergency Alerts', usage: Math.floor(tourists.length * 0.72) },
        { feature: 'Digital ID', usage: Math.floor(tourists.length * 0.95) },
        { feature: 'Safety Recommendations', usage: Math.floor(tourists.length * 0.68) },
        { feature: 'Weather Alerts', usage: Math.floor(tourists.length * 0.55) }
      ].sort((a, b) => b.usage - a.usage);

      // Calculate compliance rates
      const safetyComplianceRate = (tourists.filter(t => (t.safetyScore || 0) >= 80).length / tourists.length) * 100;
      const emergencyResponseRate = 95; // Mock data
      const locationSharingRate = (tourists.filter(t => t.currentLocation).length / tourists.length) * 100;
      const digitalIdVerificationRate = (tourists.filter(t => t.digitalIdHash).length / tourists.length) * 100;

      const analytics: TouristBehaviorAnalytics = {
        averageStayDuration: Math.round(averageStayDuration * 10) / 10,
        mostUsedFeatures,
        safetyComplianceRate: Math.round(safetyComplianceRate * 10) / 10,
        emergencyResponseRate,
        locationSharingRate: Math.round(locationSharingRate * 10) / 10,
        digitalIdVerificationRate: Math.round(digitalIdVerificationRate * 10) / 10
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error calculating behavior analytics:', error);
      throw error;
    }
  }

  /**
   * Get system performance analytics
   */
  async getSystemPerformanceAnalytics(): Promise<SystemPerformanceAnalytics> {
    const cacheKey = 'performance_analytics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      // Mock performance data (in production, collect from monitoring systems)
      const analytics: SystemPerformanceAnalytics = {
        apiResponseTimes: {
          '/api/tourists': 45,
          '/api/alerts': 32,
          '/api/emergencies': 58,
          '/api/blockchain/status': 120,
          '/api/statistics': 89
        },
        systemUptime: 99.7,
        notificationDeliveryRate: 96.5,
        blockchainTransactionSuccess: 94.2,
        ipfsUploadSuccess: 88.3,
        databasePerformance: {
          queryTime: 25,
          connectionPool: 85,
          errorRate: 0.3
        }
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error calculating performance analytics:', error);
      throw error;
    }
  }

  /**
   * Get predictive analytics
   */
  async getPredictiveAnalytics(): Promise<PredictiveAnalytics> {
    const cacheKey = 'predictive_analytics';
    const cached = this.getFromCache(cacheKey);
    if (cached) return cached;

    try {
      const tourists = await storage.getAllActiveTourists();
      const alerts = await storage.getAlerts();
      const incidents = await storage.getEmergencyIncidents();

      // Risk predictions for tourists
      const riskPredictions = tourists.slice(0, 10).map(tourist => {
        const riskFactors = [];
        let riskScore = 0;

        if ((tourist.safetyScore || 0) < 70) {
          riskFactors.push('Low safety score');
          riskScore += 30;
        }

        if (!tourist.currentLocation) {
          riskFactors.push('Location tracking disabled');
          riskScore += 20;
        }

        const touristAlerts = alerts.filter(a => a.touristId === tourist.id && !a.isResolved);
        if (touristAlerts.length > 2) {
          riskFactors.push('Multiple unresolved alerts');
          riskScore += 25;
        }

        const recommendations = [];
        if (riskScore > 50) {
          recommendations.push('Enable location tracking');
          recommendations.push('Update emergency contacts');
          recommendations.push('Review safety guidelines');
        }

        return {
          touristId: tourist.id,
          riskScore: Math.min(100, riskScore),
          riskFactors,
          recommendations
        };
      });

      // Trend forecasts (simple linear projection)
      const expectedTourists = this.generateTrendForecast(tourists.length, 7);
      const expectedAlerts = this.generateTrendForecast(alerts.length, 7);
      const expectedIncidents = this.generateTrendForecast(incidents.length, 7);

      // Seasonal patterns
      const monthlyPatterns = this.calculateSeasonalPatterns(tourists, 'month');
      const weeklyPatterns = this.calculateSeasonalPatterns(tourists, 'week');
      const holidayEffects = {
        'New Year': 1.5,
        'Independence Day': 1.3,
        'Diwali': 1.8,
        'Christmas': 1.4
      };

      const analytics: PredictiveAnalytics = {
        riskPredictions,
        trendForecasts: {
          expectedTourists,
          expectedAlerts,
          expectedIncidents
        },
        seasonalPatterns: {
          monthlyPatterns,
          weeklyPatterns,
          holidayEffects
        }
      };

      this.setCache(cacheKey, analytics);
      return analytics;
    } catch (error) {
      console.error('Error calculating predictive analytics:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive analytics report
   */
  async generateComprehensiveReport(): Promise<{
    generatedAt: string;
    systemMetrics: AnalyticsMetrics;
    locationAnalytics: LocationAnalytics;
    timeBasedAnalytics: TimeBasedAnalytics;
    behaviorAnalytics: TouristBehaviorAnalytics;
    performanceAnalytics: SystemPerformanceAnalytics;
    predictiveAnalytics: PredictiveAnalytics;
    summary: {
      keyInsights: string[];
      recommendations: string[];
      alerts: string[];
    };
  }> {
    try {
      const [
        systemMetrics,
        locationAnalytics,
        timeBasedAnalytics,
        behaviorAnalytics,
        performanceAnalytics,
        predictiveAnalytics
      ] = await Promise.all([
        this.getSystemMetrics(),
        this.getLocationAnalytics(),
        this.getTimeBasedAnalytics(),
        this.getTouristBehaviorAnalytics(),
        this.getSystemPerformanceAnalytics(),
        this.getPredictiveAnalytics()
      ]);

      const summary = this.generateSummary({
        systemMetrics,
        locationAnalytics,
        timeBasedAnalytics,
        behaviorAnalytics,
        performanceAnalytics,
        predictiveAnalytics
      });

      return {
        generatedAt: new Date().toISOString(),
        systemMetrics,
        locationAnalytics,
        timeBasedAnalytics,
        behaviorAnalytics,
        performanceAnalytics,
        predictiveAnalytics,
        summary
      };
    } catch (error) {
      console.error('Error generating comprehensive report:', error);
      throw error;
    }
  }

  // Helper methods

  private calculateAverageResponseTime(alerts: any[]): number {
    // Mock calculation - in production, track actual response times
    return Math.round(Math.random() * 30 + 10); // 10-40 minutes
  }

  private calculateAverageResolutionTime(incidents: any[]): number {
    // Mock calculation - in production, track actual resolution times
    return Math.round(Math.random() * 48 + 2); // 2-50 hours
  }

  private extractCityFromLocation(location: string): string {
    // Simple city extraction - in production, use proper geocoding
    if (location.includes('28.6')) return 'Delhi';
    if (location.includes('19.0')) return 'Mumbai';
    if (location.includes('12.9')) return 'Bangalore';
    if (location.includes('22.5')) return 'Kolkata';
    if (location.includes('13.0')) return 'Chennai';
    return 'Other';
  }

  private generateTrendForecast(currentValue: number, days: number): number[] {
    const forecast = [];
    const growthRate = 0.02; // 2% daily growth
    
    for (let i = 1; i <= days; i++) {
      const projected = Math.round(currentValue * Math.pow(1 + growthRate, i));
      forecast.push(projected);
    }
    
    return forecast;
  }

  private calculateSeasonalPatterns(data: any[], pattern: 'month' | 'week'): { [key: string]: number } {
    const patterns: { [key: string]: number } = {};
    
    if (pattern === 'month') {
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      months.forEach((month, index) => {
        const count = data.filter(item => new Date(item.createdAt).getMonth() === index).length;
        patterns[month] = count;
      });
    } else {
      const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      days.forEach((day, index) => {
        const count = data.filter(item => new Date(item.createdAt).getDay() === index).length;
        patterns[day] = count;
      });
    }
    
    return patterns;
  }

  private generateSummary(analytics: any): {
    keyInsights: string[];
    recommendations: string[];
    alerts: string[];
  } {
    const keyInsights = [
      `System currently monitoring ${analytics.systemMetrics.activeTourists} active tourists`,
      `Average safety score: ${analytics.systemMetrics.averageSafetyScore}/100`,
      `${analytics.systemMetrics.activeAlerts} active alerts requiring attention`,
      `System uptime: ${analytics.performanceAnalytics.systemUptime}%`
    ];

    const recommendations = [
      'Continue monitoring high-risk tourists',
      'Optimize notification delivery systems',
      'Enhance blockchain transaction success rate',
      'Implement predictive risk assessment'
    ];

    const alerts = [];
    if (analytics.systemMetrics.criticalAlerts > 0) {
      alerts.push(`${analytics.systemMetrics.criticalAlerts} critical alerts need immediate attention`);
    }
    if (analytics.performanceAnalytics.systemUptime < 99) {
      alerts.push('System uptime below threshold');
    }
    if (analytics.systemMetrics.activeIncidents > 5) {
      alerts.push('High number of active emergency incidents');
    }

    return { keyInsights, recommendations, alerts };
  }

  // Cache management
  private getFromCache(key: string): any {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }

  private setCache(key: string, data: any, ttl = this.CACHE_TTL): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  private startCacheWarming(): void {
    // Warm cache every 5 minutes
    setInterval(async () => {
      try {
        await Promise.all([
          this.getSystemMetrics(),
          this.getLocationAnalytics(),
          this.getTimeBasedAnalytics()
        ]);
        console.log('📊 Analytics cache warmed');
      } catch (error) {
        console.error('Cache warming failed:', error);
      }
    }, 5 * 60 * 1000);
  }
}

// Export singleton instance
export const analyticsService = new AnalyticsService();