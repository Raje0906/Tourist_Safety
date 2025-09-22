/**
 * Comprehensive Notification Service
 * Handles all types of notifications: Email, SMS, Push, Real-time WebSocket
 */

export interface NotificationPreferences {
  touristId: string;
  emailNotifications: boolean;
  smsNotifications: boolean;
  pushNotifications: boolean;
  emergencyAlerts: boolean;
  weatherAlerts: boolean;
  safetyTips: boolean;
  locationTracking: boolean;
  quietHours: {
    enabled: boolean;
    start: string;
    end: string;
  };
}

export interface NotificationPayload {
  type: 'emergency' | 'alert' | 'weather' | 'safety' | 'info';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: any;
  recipient: {
    id: string;
    email?: string;
    phone?: string;
    deviceTokens?: string[];
  };
  channels: ('email' | 'sms' | 'push' | 'websocket')[];
}

export class NotificationService {
  private preferences: Map<string, NotificationPreferences> = new Map();

  constructor() {
    // Initialize default preferences
    this.initializeDefaultPreferences();
  }

  private initializeDefaultPreferences() {
    // Mock default preferences - in production, load from database
    const defaultPrefs: NotificationPreferences = {
      touristId: 'default',
      emailNotifications: true,
      smsNotifications: true,
      pushNotifications: true,
      emergencyAlerts: true,
      weatherAlerts: true,
      safetyTips: true,
      locationTracking: true,
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '08:00'
      }
    };
    this.preferences.set('default', defaultPrefs);
  }

  /**
   * Send notification through multiple channels
   */
  async sendNotification(payload: NotificationPayload): Promise<{
    success: boolean;
    channels: { [key: string]: boolean };
    error?: string;
  }> {
    try {
      const userPrefs = this.preferences.get(payload.recipient.id) || this.preferences.get('default')!;
      
      // Check if notifications are allowed during quiet hours
      if (this.isQuietHours(userPrefs) && payload.severity !== 'critical') {
        return {
          success: false,
          channels: {},
          error: 'Notification blocked due to quiet hours'
        };
      }

      const results: { [key: string]: boolean } = {};

      // Send through each requested channel
      for (const channel of payload.channels) {
        try {
          switch (channel) {
            case 'email':
              if (userPrefs.emailNotifications && payload.recipient.email) {
                results.email = await this.sendEmail(payload);
              }
              break;
            case 'sms':
              if (userPrefs.smsNotifications && payload.recipient.phone) {
                results.sms = await this.sendSMS(payload);
              }
              break;
            case 'push':
              if (userPrefs.pushNotifications && payload.recipient.deviceTokens) {
                results.push = await this.sendPushNotification(payload);
              }
              break;
            case 'websocket':
              results.websocket = await this.sendWebSocketNotification(payload);
              break;
          }
        } catch (error) {
          console.error(`Failed to send ${channel} notification:`, error);
          results[channel] = false;
        }
      }

      const success = Object.values(results).some(result => result === true);
      
      // Log notification for audit trail
      this.logNotification(payload, results);

      return { success, channels: results };
    } catch (error) {
      console.error('Notification service error:', error);
      return {
        success: false,
        channels: {},
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Send emergency notification to all channels
   */
  async sendEmergencyNotification(
    touristId: string,
    message: string,
    location?: string,
    contacts?: any[]
  ): Promise<void> {
    try {
      // Get emergency contacts
      const emergencyContacts = contacts || await this.getEmergencyContacts(touristId);
      
      // Send to tourist
      await this.sendNotification({
        type: 'emergency',
        severity: 'critical',
        title: 'Emergency Alert',
        message,
        recipient: { id: touristId },
        channels: ['push', 'websocket'],
        data: { location, type: 'emergency' }
      });

      // Send to emergency contacts
      for (const contact of emergencyContacts) {
        await this.sendNotification({
          type: 'emergency',
          severity: 'critical',
          title: 'Tourist Emergency Alert',
          message: `Emergency reported by tourist: ${message}${location ? ` at ${location}` : ''}`,
          recipient: {
            id: contact.id,
            email: contact.email,
            phone: contact.phone
          },
          channels: ['email', 'sms', 'push'],
          data: { touristId, location, type: 'emergency_contact' }
        });
      }

      console.log(`Emergency notifications sent for tourist ${touristId}`);
    } catch (error) {
      console.error('Failed to send emergency notifications:', error);
    }
  }

  /**
   * Send bulk notifications (for weather alerts, system announcements, etc.)
   */
  async sendBulkNotification(
    touristIds: string[],
    payload: Omit<NotificationPayload, 'recipient'>
  ): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;

    for (const touristId of touristIds) {
      try {
        const result = await this.sendNotification({
          ...payload,
          recipient: { id: touristId }
        });
        
        if (result.success) {
          sent++;
        } else {
          failed++;
        }
      } catch (error) {
        console.error(`Failed to send notification to ${touristId}:`, error);
        failed++;
      }
    }

    console.log(`Bulk notification complete: ${sent} sent, ${failed} failed`);
    return { sent, failed };
  }

  /**
   * Update notification preferences
   */
  updatePreferences(touristId: string, preferences: Partial<NotificationPreferences>): void {
    const current = this.preferences.get(touristId) || this.preferences.get('default')!;
    const updated = { ...current, ...preferences, touristId };
    this.preferences.set(touristId, updated);
    console.log(`Updated notification preferences for tourist ${touristId}`);
  }

  /**
   * Get notification preferences
   */
  getPreferences(touristId: string): NotificationPreferences {
    return this.preferences.get(touristId) || this.preferences.get('default')!;
  }

  /**
   * Check if current time is within quiet hours
   */
  private isQuietHours(preferences: NotificationPreferences): boolean {
    if (!preferences.quietHours.enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 100 + now.getMinutes();
    
    const startTime = this.parseTime(preferences.quietHours.start);
    const endTime = this.parseTime(preferences.quietHours.end);

    if (startTime <= endTime) {
      return currentTime >= startTime && currentTime <= endTime;
    } else {
      // Overnight quiet hours (e.g., 22:00 to 08:00)
      return currentTime >= startTime || currentTime <= endTime;
    }
  }

  private parseTime(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return hours * 100 + minutes;
  }

  /**
   * Send email notification (mock implementation)
   */
  private async sendEmail(payload: NotificationPayload): Promise<boolean> {
    try {
      // Mock email sending - in production, use services like SendGrid, AWS SES, etc.
      console.log(`📧 Email sent to ${payload.recipient.email}:`);
      console.log(`   Subject: ${payload.title}`);
      console.log(`   Message: ${payload.message}`);
      
      // Simulate email delivery delay
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return true;
    } catch (error) {
      console.error('Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send SMS notification (mock implementation)
   */
  private async sendSMS(payload: NotificationPayload): Promise<boolean> {
    try {
      // Mock SMS sending - in production, use services like Twilio, AWS SNS, etc.
      console.log(`📱 SMS sent to ${payload.recipient.phone}:`);
      console.log(`   Message: ${payload.title} - ${payload.message}`);
      
      // Simulate SMS delivery delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      return true;
    } catch (error) {
      console.error('SMS sending failed:', error);
      return false;
    }
  }

  /**
   * Send push notification (mock implementation)
   */
  private async sendPushNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Mock push notification - in production, use FCM, APNs, etc.
      console.log(`🔔 Push notification sent:`);
      console.log(`   Title: ${payload.title}`);
      console.log(`   Body: ${payload.message}`);
      console.log(`   Data:`, payload.data);
      
      // Simulate push delivery delay
      await new Promise(resolve => setTimeout(resolve, 50));
      
      return true;
    } catch (error) {
      console.error('Push notification sending failed:', error);
      return false;
    }
  }

  /**
   * Send WebSocket notification (mock implementation)
   */
  private async sendWebSocketNotification(payload: NotificationPayload): Promise<boolean> {
    try {
      // Mock WebSocket notification - integrate with existing WebSocket server
      console.log(`🌐 WebSocket notification sent:`);
      console.log(`   Type: ${payload.type}`);
      console.log(`   Severity: ${payload.severity}`);
      console.log(`   Message: ${payload.message}`);
      
      return true;
    } catch (error) {
      console.error('WebSocket notification sending failed:', error);
      return false;
    }
  }

  /**
   * Get emergency contacts for a tourist
   */
  private async getEmergencyContacts(touristId: string): Promise<any[]> {
    // Mock emergency contacts - in production, fetch from database
    return [
      {
        id: 'emergency_contact_1',
        name: 'Emergency Contact',
        email: 'emergency@example.com',
        phone: '+1234567890',
        type: 'personal'
      },
      {
        id: 'local_authority_1',
        name: 'Local Police',
        email: 'police@local.gov',
        phone: '+1234567891',
        type: 'authority'
      }
    ];
  }

  /**
   * Log notification for audit trail
   */
  private logNotification(payload: NotificationPayload, results: { [key: string]: boolean }): void {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: payload.type,
      severity: payload.severity,
      recipient: payload.recipient.id,
      channels: payload.channels,
      results,
      title: payload.title,
      success: Object.values(results).some(r => r === true)
    };

    console.log('📝 Notification logged:', logEntry);
    
    // In production, save to database for audit trail
  }

  /**
   * Get notification statistics
   */
  getStatistics(): {
    totalSent: number;
    successRate: number;
    channelStats: { [key: string]: number };
  } {
    // Mock statistics - in production, query from database
    return {
      totalSent: 150,
      successRate: 94.5,
      channelStats: {
        email: 45,
        sms: 38,
        push: 52,
        websocket: 15
      }
    };
  }

  /**
   * Send scheduled safety tips
   */
  async sendScheduledSafetyTips(touristIds: string[]): Promise<void> {
    const safetyTips = [
      {
        title: "Stay Alert in Crowded Areas",
        message: "Keep your belongings secure and stay aware of your surroundings in busy tourist spots."
      },
      {
        title: "Share Your Itinerary",
        message: "Always inform trusted contacts about your travel plans and expected check-in times."
      },
      {
        title: "Emergency Preparedness",
        message: "Keep emergency contact numbers saved and know the local emergency services number."
      },
      {
        title: "Document Security",
        message: "Keep digital and physical copies of important documents in separate secure locations."
      }
    ];

    const randomTip = safetyTips[Math.floor(Math.random() * safetyTips.length)];

    await this.sendBulkNotification(touristIds, {
      type: 'safety',
      severity: 'low',
      title: randomTip.title,
      message: randomTip.message,
      channels: ['push'],
      data: { type: 'safety_tip', automated: true }
    });
  }

  /**
   * Send weather alerts based on location
   */
  async sendWeatherAlert(
    location: string,
    weatherCondition: string,
    severity: 'low' | 'medium' | 'high' | 'critical',
    touristIds: string[]
  ): Promise<void> {
    const weatherMessages = {
      stormy: "Severe storm warning in your area. Seek shelter immediately and avoid outdoor activities.",
      rainy: "Heavy rain expected in your area. Carry umbrella and avoid flood-prone areas.",
      sunny: "Clear weather ahead! Perfect day for outdoor activities. Stay hydrated.",
      cloudy: "Overcast conditions expected. Good weather for sightseeing."
    };

    const message = weatherMessages[weatherCondition as keyof typeof weatherMessages] || 
                   "Weather conditions in your area have changed. Stay informed and take necessary precautions.";

    await this.sendBulkNotification(touristIds, {
      type: 'weather',
      severity,
      title: `Weather Alert - ${location}`,
      message,
      channels: severity === 'critical' ? ['email', 'sms', 'push'] : ['push'],
      data: { 
        location, 
        weatherCondition, 
        type: 'weather_alert',
        timestamp: new Date().toISOString()
      }
    });
  }
}

// Export singleton instance
export const notificationService = new NotificationService();