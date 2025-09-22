import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertTouristSchema, insertAlertSchema, insertEmergencyIncidentSchema, insertAIAnomalySchema, insertEFIRSchema, insertAuthoritySchema } from "@shared/schema";
import { AIAnomalyDetector } from "./ai-anomaly-detector";
import { EFIRGenerator } from "./efir-generator";
import { notificationService } from "./notification-service";
import { geofencingService } from "./geofencing-service";
import { analyticsService } from "./analytics-service";
import { fileManagementService } from "./file-management-service";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  const clients = new Set<WebSocket>();
  
  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');
    
    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });
  });

  // Broadcast function for real-time updates
  const broadcast = (data: any) => {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  };

  // Authentication routes
  app.post("/api/auth/google", async (req, res) => {
    try {
      const { email, name, googleId } = req.body;
      
      let user = await storage.getUserByGoogleId(googleId);
      if (!user) {
        user = await storage.createUser({
          email,
          name,
          role: 'tourist',
          googleId,
        });
      }
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post("/api/auth/admin", async (req, res) => {
    try {
      const { username, password } = req.body;
      
      // Hardcoded admin credentials
      const adminCredentials = [
        { username: 'admin1', password: 'admin123', email: 'admin1@safetysystem.com' },
        { username: 'admin2', password: 'admin456', email: 'admin2@safetysystem.com' }
      ];
      
      const adminCred = adminCredentials.find(
        cred => cred.username === username && cred.password === password
      );
      
      if (!adminCred) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      const user = await storage.getUserByEmail(adminCred.email);
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post("/api/auth/tourist/signin", async (req, res) => {
    try {
      const { email, password } = req.body;
      console.log('Tourist signin attempt:', { email, password });
      
      // Hardcoded tourist credentials for demo
      const touristCredentials = [
        { email: 'tourist1@example.com', password: 'tourist123', name: 'John Doe' },
        { email: 'tourist2@example.com', password: 'tourist456', name: 'Jane Smith' },
        { email: 'tourist3@example.com', password: 'tourist789', name: 'Mike Johnson' }
      ];
      
      const touristCred = touristCredentials.find(
        cred => cred.email === email && cred.password === password
      );
      
      console.log('Found credential:', touristCred);
      
      if (!touristCred) {
        console.log('Invalid credentials for:', { email, password });
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      
      // Check if user already exists
      let user = await storage.getUserByEmail(touristCred.email);
      if (!user) {
        console.log('Creating new user for:', touristCred.email);
        user = await storage.createUser({
          email: touristCred.email,
          name: touristCred.name,
          role: 'tourist',
        });
      }
      
      console.log('Login successful for user:', user);
      res.json({ user });
    } catch (error) {
      console.error('Tourist signin error:', error);
      res.status(500).json({ error: 'Authentication failed' });
    }
  });

  app.post("/api/auth/tourist/register", async (req, res) => {
    try {
      const { email, password, name } = req.body;
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: 'User already exists' });
      }
      
      // Create new user
      const user = await storage.createUser({
        email,
        name,
        role: 'tourist',
      });
      
      res.json({ user });
    } catch (error) {
      res.status(500).json({ error: 'Registration failed' });
    }
  });

  // Tourist routes
  // Check if tourist has valid digital ID for trip dates
  app.post("/api/tourists/check-digital-id", async (req, res) => {
    try {
      const { userId, startDate, endDate } = req.body;
      
      if (!userId || !startDate || !endDate) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const result = await storage.checkValidDigitalId(
        userId, 
        new Date(startDate), 
        new Date(endDate)
      );
      
      res.json(result);
    } catch (error) {
      console.error('Error checking digital ID:', error);
      res.status(500).json({ error: 'Failed to check digital ID validity' });
    }
  });
  
  // Update tourist trip dates
  app.put("/api/tourists/:id/trip-dates", async (req, res) => {
    try {
      const { startDate, endDate, itinerary } = req.body;
      
      if (!startDate || !endDate) {
        return res.status(400).json({ error: 'Start date and end date are required' });
      }
      
      const updatedTourist = await storage.updateTouristTripDates(
        req.params.id,
        new Date(startDate),
        new Date(endDate),
        itinerary
      );
      
      if (!updatedTourist) {
        return res.status(404).json({ error: 'Tourist not found' });
      }
      
      // Broadcast trip update to admin
      broadcast({
        type: 'TRIP_UPDATED',
        data: updatedTourist
      });
      
      res.json({ tourist: updatedTourist });
    } catch (error) {
      console.error('Error updating trip dates:', error);
      res.status(500).json({ error: 'Failed to update trip dates' });
    }
  });

  app.post("/api/tourists", async (req, res) => {
    try {
      const touristData = insertTouristSchema.parse(req.body);
      const tourist = await storage.createTourist(touristData);
      
      // Broadcast new tourist registration to admin
      broadcast({
        type: 'NEW_TOURIST',
        data: tourist
      });
      
      res.json({ tourist });
    } catch (error) {
      console.error('Tourist creation error:', error);
      if (error instanceof Error) {
        res.status(400).json({ 
          error: 'Invalid tourist data', 
          details: error.message 
        });
      } else {
        res.status(400).json({ error: 'Invalid tourist data' });
      }
    }
  });

  app.get("/api/tourists", async (req, res) => {
    try {
      const tourists = await storage.getAllActiveTourists();
      res.json({ tourists });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tourists' });
    }
  });

  app.get("/api/tourists/user/:userId", async (req, res) => {
    try {
      const tourist = await storage.getTouristByUserId(req.params.userId);
      if (!tourist) {
        return res.status(404).json({ error: 'Tourist not found' });
      }
      res.json({ tourist });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tourist' });
    }
  });

  app.patch("/api/tourists/:id", async (req, res) => {
    try {
      const tourist = await storage.updateTourist(req.params.id, req.body);
      if (!tourist) {
        return res.status(404).json({ error: 'Tourist not found' });
      }
      
      // Broadcast location update if coordinates changed
      if (req.body.locationLat && req.body.locationLng) {
        broadcast({
          type: 'LOCATION_UPDATE',
          data: { touristId: tourist.id, location: req.body }
        });
      }
      
      res.json({ tourist });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update tourist' });
    }
  });

  // Alert routes
  app.get("/api/alerts", async (req, res) => {
    try {
      const alerts = await storage.getAlerts();
      res.json({ alerts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch alerts' });
    }
  });

  app.get("/api/alerts/tourist/:touristId", async (req, res) => {
    try {
      const alerts = await storage.getAlertsByTouristId(req.params.touristId);
      res.json({ alerts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tourist alerts' });
    }
  });

  app.post("/api/alerts", async (req, res) => {
    try {
      const alertData = insertAlertSchema.parse(req.body);
      const alert = await storage.createAlert(alertData);
      
      // Broadcast new alert
      broadcast({
        type: 'NEW_ALERT',
        data: alert
      });
      
      res.json({ alert });
    } catch (error) {
      res.status(400).json({ error: 'Invalid alert data' });
    }
  });

  // Emergency incident routes
  app.get("/api/emergencies", async (req, res) => {
    try {
      const incidents = await storage.getEmergencyIncidents();
      res.json({ incidents });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch emergency incidents' });
    }
  });

  app.post("/api/emergencies", async (req, res) => {
    try {
      const incidentData = insertEmergencyIncidentSchema.parse(req.body);
      const incident = await storage.createEmergencyIncident(incidentData);
      
      // Broadcast emergency incident
      broadcast({
        type: 'EMERGENCY_INCIDENT',
        data: incident
      });
      
      // Auto-create critical alert for emergency
      const alert = await storage.createAlert({
        touristId: incident.touristId,
        type: 'emergency',
        severity: 'critical',
        title: 'Emergency Incident',
        message: `Emergency reported at ${incident.location}`,
        location: incident.location,
      });
      
      broadcast({
        type: 'NEW_ALERT',
        data: alert
      });
      
      res.json({ incident });
    } catch (error) {
      res.status(400).json({ error: 'Invalid incident data' });
    }
  });

  app.patch("/api/emergencies/:id", async (req, res) => {
    try {
      const incident = await storage.updateEmergencyIncident(req.params.id, req.body);
      if (!incident) {
        return res.status(404).json({ error: 'Emergency incident not found' });
      }
      
      broadcast({
        type: 'INCIDENT_UPDATE',
        data: incident
      });
      
      res.json({ incident });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update incident' });
    }
  });

  // File upload route for KYC documents
  app.post("/api/upload", async (req, res) => {
    try {
      // In a real implementation, this would handle file uploads to cloud storage
      // For now, return a mock URL
      const fileUrl = `https://storage.safetysystem.com/documents/${Date.now()}.pdf`;
      res.json({ url: fileUrl });
    } catch (error) {
      res.status(500).json({ error: 'Upload failed' });
    }
  });

  // Statistics endpoint for admin dashboard
  app.get("/api/statistics", async (req, res) => {
    try {
      const tourists = await storage.getAllActiveTourists();
      const alerts = await storage.getAlerts();
      const incidents = await storage.getEmergencyIncidents();
      const anomalies = await storage.getAIAnomalies();
      const efirs = await storage.getEFIRs();
      
      const activeAlerts = alerts.filter(alert => !alert.isResolved);
      const emergencyIncidents = incidents.filter(incident => incident.status === 'active');
      const unresolvedAnomalies = anomalies.filter(anomaly => !anomaly.isResolved);
      const pendingEFIRs = efirs.filter(efir => efir.status === 'filed');
      const averageSafetyScore = tourists.length > 0 
        ? tourists.reduce((sum, t) => sum + (t.safetyScore || 0), 0) / tourists.length 
        : 0;
      
      res.json({
        activeTourists: tourists.length,
        activeAlerts: activeAlerts.length,
        emergencyIncidents: emergencyIncidents.length,
        averageSafetyScore: Math.round(averageSafetyScore * 10) / 10,
        unresolvedAnomalies: unresolvedAnomalies.length,
        pendingEFIRs: pendingEFIRs.length
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  // Blockchain service status endpoint
  app.get("/api/blockchain/status", async (req, res) => {
    try {
      const status = await storage.getBlockchainServiceStatus();
      res.json({ status });
    } catch (error) {
      console.error('Error getting blockchain status:', error);
      res.status(500).json({ 
        error: 'Failed to fetch blockchain status',
        status: {
          available: false,
          error: 'Service unavailable'
        }
      });
    }
  });

  // AI Anomaly Detection routes
  app.get("/api/anomalies", async (req, res) => {
    try {
      const anomalies = await storage.getAIAnomalies();
      res.json({ anomalies });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch AI anomalies' });
    }
  });

  app.get("/api/anomalies/tourist/:touristId", async (req, res) => {
    try {
      const anomalies = await storage.getAIAnomaliesByTouristId(req.params.touristId);
      res.json({ anomalies });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tourist anomalies' });
    }
  });

  app.post("/api/anomalies/detect", async (req, res) => {
    try {
      const { touristId } = req.body;
      
      // Simulate behavior data collection
      const behaviorData = await AIAnomalyDetector.simulateBehaviorAnalysis(touristId);
      
      // Detect anomalies
      const anomalies = await AIAnomalyDetector.detectAnomalies(behaviorData);
      
      // Store detected anomalies
      const createdAnomalies = [];
      for (const anomaly of anomalies) {
        if (anomaly.isAnomaly) {
          const created = await storage.createAIAnomaly({
            touristId,
            anomalyType: anomaly.anomalyType,
            severity: anomaly.severity,
            confidence: anomaly.confidence.toString(),
            description: anomaly.description,
            locationLat: behaviorData.locationLat?.toString(),
            locationLng: behaviorData.locationLng?.toString(),
            behaviorData: anomaly.behaviorData
          });
          createdAnomalies.push(created);
          
          // Broadcast anomaly detection
          broadcast({
            type: 'AI_ANOMALY_DETECTED',
            data: created
          });
          
          // Create alert for high severity anomalies
          if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
            const alert = await storage.createAlert({
              touristId,
              type: 'safety',
              severity: anomaly.severity,
              title: `AI Anomaly Detected: ${anomaly.anomalyType}`,
              message: anomaly.description,
              location: behaviorData.locationLat ? `${behaviorData.locationLat}, ${behaviorData.locationLng}` : undefined
            });
            
            broadcast({
              type: 'NEW_ALERT',
              data: alert
            });
          }
        }
      }
      
      res.json({ 
        behaviorData,
        anomalies: createdAnomalies,
        detectedCount: createdAnomalies.length
      });
    } catch (error) {
      console.error('Error in anomaly detection:', error);
      res.status(500).json({ error: 'Failed to detect anomalies' });
    }
  });

  app.patch("/api/anomalies/:id", async (req, res) => {
    try {
      const anomaly = await storage.updateAIAnomaly(req.params.id, req.body);
      if (!anomaly) {
        return res.status(404).json({ error: 'Anomaly not found' });
      }
      
      broadcast({
        type: 'ANOMALY_UPDATE',
        data: anomaly
      });
      
      res.json({ anomaly });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update anomaly' });
    }
  });

  // E-FIR routes
  app.get("/api/efirs", async (req, res) => {
    try {
      const efirs = await storage.getEFIRs();
      res.json({ efirs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch E-FIRs' });
    }
  });

  app.get("/api/efirs/tourist/:touristId", async (req, res) => {
    try {
      const efirs = await storage.getEFIRsByTouristId(req.params.touristId);
      res.json({ efirs });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch tourist E-FIRs' });
    }
  });

  app.post("/api/efirs", async (req, res) => {
    try {
      const efirData = insertEFIRSchema.parse(req.body);
      
      // Validate incidentType
      const validIncidentTypes = ['theft', 'assault', 'fraud', 'harassment', 'other'];
      if (!validIncidentTypes.includes(efirData.incidentType)) {
        return res.status(400).json({ error: 'Invalid incident type' });
      }
      
      // Generate E-FIR
      const efirResult = await EFIRGenerator.generateEFIR(efirData as any);
      
      broadcast({
        type: 'NEW_EFIR',
        data: efirResult
      });
      
      res.json({ efir: efirResult });
    } catch (error) {
      console.error('Error creating E-FIR:', error);
      res.status(400).json({ error: 'Invalid E-FIR data' });
    }
  });

  app.patch("/api/efirs/:id", async (req, res) => {
    try {
      const efir = await storage.updateEFIR(req.params.id, req.body);
      if (!efir) {
        return res.status(404).json({ error: 'E-FIR not found' });
      }
      
      broadcast({
        type: 'EFIR_UPDATE',
        data: efir
      });
      
      res.json({ efir });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update E-FIR' });
    }
  });

  // Authority routes
  app.get("/api/authorities", async (req, res) => {
    try {
      const { lat, lng, limit = 10 } = req.query;
      let authorities = await storage.getAuthorities();
      
      // If location is provided, filter to nearest authorities
      if (lat && lng) {
        const userLat = parseFloat(lat as string);
        const userLng = parseFloat(lng as string);
        
        // Calculate distance and sort by proximity
        authorities = authorities
          .map(authority => {
            if (authority.latitude && authority.longitude) {
              const distance = calculateDistance(
                userLat, userLng,
                parseFloat(authority.latitude), parseFloat(authority.longitude)
              );
              return { ...authority, distance };
            }
            return { ...authority, distance: Infinity };
          })
          .sort((a, b) => (a as any).distance - (b as any).distance)
          .slice(0, parseInt(limit as string));
      }
      
      res.json({ authorities });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch authorities' });
    }
  });

  app.post("/api/authorities", async (req, res) => {
    try {
      const authorityData = insertAuthoritySchema.parse(req.body);
      const authority = await storage.createAuthority(authorityData);
      
      broadcast({
        type: 'NEW_AUTHORITY',
        data: authority
      });
      
      res.json({ authority });
    } catch (error) {
      res.status(400).json({ error: 'Invalid authority data' });
    }
  });

  app.patch("/api/authorities/:id", async (req, res) => {
    try {
      const authority = await storage.updateAuthority(req.params.id, req.body);
      if (!authority) {
        return res.status(404).json({ error: 'Authority not found' });
      }
      
      broadcast({
        type: 'AUTHORITY_UPDATE',
        data: authority
      });
      
      res.json({ authority });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update authority' });
    }
  });

  // Test route for AI anomaly detection
  app.post("/api/test/anomaly-detection", async (req, res) => {
    try {
      // Simulate anomaly detection for all active tourists
      const tourists = await storage.getAllActiveTourists();
      const detectedAnomalies = [];
      
      for (const tourist of tourists.slice(0, 3)) { // Test with first 3 tourists
        const behaviorData = await AIAnomalyDetector.simulateBehaviorAnalysis(tourist.id);
        const anomalies = await AIAnomalyDetector.detectAnomalies(behaviorData);
        
        for (const anomaly of anomalies) {
          if (anomaly.isAnomaly) {
            const created = await storage.createAIAnomaly({
              touristId: tourist.id,
              anomalyType: anomaly.anomalyType,
              severity: anomaly.severity,
              confidence: anomaly.confidence.toString(),
              description: anomaly.description,
              locationLat: behaviorData.locationLat?.toString(),
              locationLng: behaviorData.locationLng?.toString(),
              behaviorData: anomaly.behaviorData
            });
            
            detectedAnomalies.push(created);
            
            broadcast({
              type: 'AI_ANOMALY_DETECTED',
              data: created
            });
            
            // Create alert for high severity anomalies
            if (anomaly.severity === 'high' || anomaly.severity === 'critical') {
              const alert = await storage.createAlert({
                touristId: tourist.id,
                type: 'safety',
                severity: anomaly.severity,
                title: `AI Anomaly: ${anomaly.anomalyType}`,
                message: anomaly.description,
                location: behaviorData.locationLat ? `${behaviorData.locationLat}, ${behaviorData.locationLng}` : undefined
              });
              
              broadcast({
                type: 'NEW_ALERT',
                data: alert
              });
            }
          }
        }
      }
      
      res.json({ 
        message: 'Test anomaly detection completed',
        detectedAnomalies: detectedAnomalies.length,
        anomalies: detectedAnomalies
      });
    } catch (error) {
      console.error('Error in test anomaly detection:', error);
      res.status(500).json({ error: 'Test failed' });
    }
  });
  
  // Verify tourist identity with blockchain signature
  app.post("/api/blockchain/verify-identity", async (req, res) => {
    try {
      const { touristId, message, signature } = req.body;
      
      if (!touristId || !message || !signature) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const isValid = await storage.verifyTouristIdentity(touristId, message, signature);
      
      res.json({ 
        isValid, 
        message: isValid ? 'Identity verified successfully' : 'Identity verification failed'
      });
    } catch (error) {
      res.status(500).json({ error: 'Identity verification failed' });
    }
  });
  
  // Admin endpoint to verify tourist profile on blockchain
  app.post("/api/blockchain/verify-profile", async (req, res) => {
    try {
      const { touristId, verificationLevel } = req.body;
      
      if (!touristId || !verificationLevel) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      if (verificationLevel < 1 || verificationLevel > 2) {
        return res.status(400).json({ error: 'Invalid verification level' });
      }
      
      const txHash = await storage.verifyTouristProfile(touristId, verificationLevel);
      
      if (!txHash) {
        return res.status(404).json({ error: 'Tourist not found or verification failed' });
      }
      
      broadcast({
        type: 'PROFILE_VERIFIED',
        data: { touristId, verificationLevel, transactionHash: txHash }
      });
      
      res.json({ 
        success: true,
        transactionHash: txHash,
        message: 'Profile verified on blockchain'
      });
    } catch (error) {
      res.status(500).json({ error: 'Profile verification failed' });
    }
  });
  
  // Get blockchain profile data
  app.get("/api/blockchain/profile/:touristId", async (req, res) => {
    try {
      const profile = await storage.getBlockchainProfile(req.params.touristId);
      
      if (!profile) {
        return res.status(404).json({ error: 'Blockchain profile not found' });
      }
      
      res.json({ profile });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch blockchain profile' });
    }
  });
  
  // Emergency access to encrypted profile data
  app.post("/api/blockchain/emergency-access", async (req, res) => {
    try {
      const { touristId } = req.body;
      
      if (!touristId) {
        return res.status(400).json({ error: 'Tourist ID required' });
      }
      
      const emergencyData = await storage.emergencyAccessProfile(touristId);
      
      if (!emergencyData) {
        return res.status(404).json({ error: 'Emergency data not found' });
      }
      
      // Log emergency access for audit trail
      broadcast({
        type: 'EMERGENCY_ACCESS',
        data: { touristId, timestamp: new Date().toISOString() }
      });
      
      res.json({ 
        emergencyData: JSON.parse(emergencyData),
        accessTime: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Emergency access failed' });
    }
  });
  
  // Check if profile is verified on blockchain
  app.get("/api/blockchain/verification-status/:touristId", async (req, res) => {
    try {
      const isVerified = await storage.isProfileVerified(req.params.touristId);
      res.json({ isVerified });
    } catch (error) {
      res.status(500).json({ error: 'Failed to check verification status' });
    }
  });
  
  // Get blockchain network information
  app.get("/api/blockchain/network-info", async (req, res) => {
    try {
      const networkInfo = await storage.getBlockchainNetworkInfo();
      
      if (!networkInfo) {
        return res.status(503).json({ error: 'Blockchain network unavailable' });
      }
      
      res.json(networkInfo);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get network information' });
    }
  });

  // Helper function to calculate distance between two coordinates
  function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI/180;
    const φ2 = lat2 * Math.PI/180;
    const Δφ = (lat2-lat1) * Math.PI/180;
    const Δλ = (lon2-lon1) * Math.PI/180;
    
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    
    return R * c; // Distance in meters
  }

  // Advanced Features - Geofencing
  app.post("/api/geofence/check", async (req, res) => {
    try {
      const { touristId, lat, lng } = req.body;
      
      if (!touristId || !lat || !lng) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Check if tourist is in a safe zone
      const safeZones = [
        { name: 'Tourist Area 1', center: { lat: 28.6129, lng: 77.2295 }, radius: 5000 }, // Delhi
        { name: 'Tourist Area 2', center: { lat: 19.0760, lng: 72.8777 }, radius: 5000 }, // Mumbai
        { name: 'Tourist Area 3', center: { lat: 12.9716, lng: 77.5946 }, radius: 5000 }, // Bangalore
      ];
      
      let isInSafeZone = false;
      let currentZone = null;
      
      for (const zone of safeZones) {
        const distance = calculateDistance(lat, lng, zone.center.lat, zone.center.lng);
        if (distance <= zone.radius) {
          isInSafeZone = true;
          currentZone = zone.name;
          break;
        }
      }
      
      // Create alert if outside safe zone
      if (!isInSafeZone) {
        const alert = await storage.createAlert({
          touristId,
          type: 'geofence',
          severity: 'medium',
          title: 'Outside Safe Zone',
          message: 'Tourist has moved outside designated safe zones',
          location: `${lat}, ${lng}`
        });
        
        broadcast({
          type: 'GEOFENCE_ALERT',
          data: alert
        });
      }
      
      res.json({ 
        isInSafeZone, 
        currentZone,
        latitude: lat,
        longitude: lng,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ error: 'Geofence check failed' });
    }
  });

  // Real-time location tracking
  app.post("/api/location/update", async (req, res) => {
    try {
      const { touristId, lat, lng, accuracy, timestamp } = req.body;
      
      if (!touristId || !lat || !lng) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      // Update tourist location
      const updatedTourist = await storage.updateTourist(touristId, {
        locationLat: lat.toString(),
        locationLng: lng.toString(),
        currentLocation: `${lat}, ${lng}`
      });
      
      if (!updatedTourist) {
        return res.status(404).json({ error: 'Tourist not found' });
      }
      
      // Broadcast location update
      broadcast({
        type: 'LOCATION_UPDATE',
        data: {
          touristId,
          location: { lat, lng, accuracy, timestamp: timestamp || new Date().toISOString() },
          tourist: updatedTourist
        }
      });
      
      res.json({ 
        success: true, 
        location: { lat, lng, accuracy, timestamp: timestamp || new Date().toISOString() }
      });
    } catch (error) {
      res.status(500).json({ error: 'Location update failed' });
    }
  });

  // Weather alerts integration
  app.get("/api/weather/:location", async (req, res) => {
    try {
      const { location } = req.params;
      
      // Mock weather data (in production, integrate with weather API)
      const weatherData = {
        location,
        temperature: Math.round(Math.random() * 30 + 10), // 10-40°C
        condition: ['sunny', 'cloudy', 'rainy', 'stormy'][Math.floor(Math.random() * 4)],
        humidity: Math.round(Math.random() * 100),
        windSpeed: Math.round(Math.random() * 20),
        alerts: [] as any[],
        timestamp: new Date().toISOString()
      };
      
      // Generate weather alerts
      if (weatherData.condition === 'stormy') {
        weatherData.alerts.push({
          type: 'severe_weather',
          severity: 'high',
          message: 'Severe storm warning in effect. Seek shelter immediately.'
        });
      } else if (weatherData.condition === 'rainy') {
        weatherData.alerts.push({
          type: 'weather',
          severity: 'medium',
          message: 'Heavy rain expected. Carry umbrella and avoid flood-prone areas.'
        });
      }
      
      res.json({ weather: weatherData });
    } catch (error) {
      res.status(500).json({ error: 'Weather data fetch failed' });
    }
  });

  // Safety recommendations
  app.get("/api/safety/recommendations/:touristId", async (req, res) => {
    try {
      const { touristId } = req.params;
      
      const tourist = await storage.getTourist(touristId);
      if (!tourist) {
        return res.status(404).json({ error: 'Tourist not found' });
      }
      
      // Generate safety recommendations based on location, time, and profile
      const recommendations = [
        {
          id: 1,
          type: 'general',
          priority: 'high',
          title: 'Keep Emergency Contacts Handy',
          message: 'Always have local emergency numbers and your embassy contact information readily available.'
        },
        {
          id: 2,
          type: 'location',
          priority: 'medium',
          title: 'Stay in Well-lit Areas',
          message: 'Avoid poorly lit streets and isolated areas, especially during night hours.'
        },
        {
          id: 3,
          type: 'communication',
          priority: 'medium',
          title: 'Regular Check-ins',
          message: 'Share your location with trusted contacts and check in regularly.'
        },
        {
          id: 4,
          type: 'documents',
          priority: 'high',
          title: 'Secure Important Documents',
          message: 'Keep copies of your passport and other important documents in a secure location.'
        }
      ];
      
      // Add location-specific recommendations
      if (tourist.currentLocation) {
        recommendations.push({
          id: 5,
          type: 'local',
          priority: 'medium',
          title: 'Local Safety Information',
          message: 'Research local customs, laws, and potential safety concerns for your current area.'
        });
      }
      
      res.json({ recommendations });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get safety recommendations' });
    }
  });

  // Emergency contacts management
  app.get("/api/emergency-contacts/:touristId", async (req, res) => {
    try {
      const { touristId } = req.params;
      
      const tourist = await storage.getTourist(touristId);
      if (!tourist) {
        return res.status(404).json({ error: 'Tourist not found' });
      }
      
      // Get all relevant emergency contacts
      const authorities = await storage.getAuthorities();
      
      const emergencyContacts = {
        personal: {
          name: tourist.emergencyName,
          phone: tourist.emergencyPhone
        },
        local: authorities.filter(auth => auth.isActive),
        international: [
          {
            name: 'Tourist Helpline India',
            phone: '+91-11-1363',
            type: 'tourist_support',
            available24x7: true
          },
          {
            name: 'Emergency Services',
            phone: '112',
            type: 'emergency',
            available24x7: true
          }
        ]
      };
      
      res.json({ contacts: emergencyContacts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get emergency contacts' });
    }
  });

  // Advanced analytics for admin dashboard
  app.get("/api/analytics/overview", async (req, res) => {
    try {
      const tourists = await storage.getAllActiveTourists();
      const alerts = await storage.getAlerts();
      const incidents = await storage.getEmergencyIncidents();
      const anomalies = await storage.getAIAnomalies();
      
      // Calculate trends (mock data for demonstration)
      const analytics = {
        totalTourists: tourists.length,
        activeTourists: tourists.filter(t => t.isActive).length,
        totalAlerts: alerts.length,
        resolvedAlerts: alerts.filter(a => a.isResolved).length,
        totalIncidents: incidents.length,
        resolvedIncidents: incidents.filter(i => i.status === 'resolved').length,
        averageSafetyScore: tourists.length > 0 
          ? Math.round((tourists.reduce((sum, t) => sum + (t.safetyScore || 0), 0) / tourists.length) * 10) / 10
          : 0,
        locationCoverage: {
          delhi: tourists.filter(t => t.currentLocation?.includes('28.6')).length,
          mumbai: tourists.filter(t => t.currentLocation?.includes('19.0')).length,
          bangalore: tourists.filter(t => t.currentLocation?.includes('12.9')).length,
          other: tourists.filter(t => t.currentLocation && 
            !t.currentLocation.includes('28.6') && 
            !t.currentLocation.includes('19.0') && 
            !t.currentLocation.includes('12.9')).length
        },
        alertsByType: {
          emergency: alerts.filter(a => a.type === 'emergency').length,
          geofence: alerts.filter(a => a.type === 'geofence').length,
          weather: alerts.filter(a => a.type === 'weather').length,
          safety: alerts.filter(a => a.type === 'safety').length
        },
        incidentsByType: {
          panic_button: incidents.filter(i => i.type === 'panic_button').length,
          automatic: incidents.filter(i => i.type === 'automatic').length,
          reported: incidents.filter(i => i.type === 'reported').length
        },
        anomalies: {
          total: anomalies.length,
          resolved: anomalies.filter(a => a.isResolved).length,
          byType: {
            movement: anomalies.filter(a => a.anomalyType === 'movement').length,
            location: anomalies.filter(a => a.anomalyType === 'location').length,
            communication: anomalies.filter(a => a.anomalyType === 'communication').length,
            behavior: anomalies.filter(a => a.anomalyType === 'behavior').length
          }
        }
      };
      
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get analytics data' });
    }
  });

  // Real-time dashboard data
  app.get("/api/dashboard/realtime", async (req, res) => {
    try {
      const tourists = await storage.getAllActiveTourists();
      const recentAlerts = (await storage.getAlerts())
        .filter(alert => !alert.isResolved)
        .slice(0, 10);
      
      const activeIncidents = (await storage.getEmergencyIncidents())
        .filter(incident => incident.status === 'active');
      
      // Mock real-time data
      const realtimeData = {
        timestamp: new Date().toISOString(),
        activeTourists: tourists.filter(t => {
          // Consider active if location updated in last 30 minutes
          return t.currentLocation && new Date(t.createdAt!).getTime() > Date.now() - 30 * 60 * 1000;
        }).length,
        onlineTourists: Math.floor(tourists.length * 0.7), // Mock online status
        activeAlerts: recentAlerts.length,
        criticalIncidents: activeIncidents.filter(i => 
          recentAlerts.some(a => a.touristId === i.touristId && a.severity === 'critical')
        ).length,
        systemStatus: {
          database: 'operational',
          blockchain: 'operational',
          notifications: 'operational',
          geoServices: 'operational'
        },
        recentActivity: [
          ...recentAlerts.slice(0, 5).map(alert => ({
            type: 'alert',
            timestamp: alert.createdAt,
            message: `${alert.title} - ${alert.severity}`,
            severity: alert.severity
          })),
          ...activeIncidents.slice(0, 5).map(incident => ({
            type: 'incident',
            timestamp: incident.createdAt,
            message: `Emergency incident at ${incident.location}`,
            severity: 'high'
          }))
        ].sort((a, b) => new Date(b.timestamp!).getTime() - new Date(a.timestamp!).getTime())
      };
      
      res.json({ data: realtimeData });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get real-time dashboard data' });
    }
  });

  // Notification Service Endpoints
  app.get("/api/notifications/preferences/:touristId", async (req, res) => {
    try {
      const preferences = notificationService.getPreferences(req.params.touristId);
      res.json({ preferences });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get notification preferences' });
    }
  });

  app.put("/api/notifications/preferences/:touristId", async (req, res) => {
    try {
      const { touristId } = req.params;
      notificationService.updatePreferences(touristId, req.body);
      const updatedPreferences = notificationService.getPreferences(touristId);
      res.json({ preferences: updatedPreferences });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update notification preferences' });
    }
  });

  app.post("/api/notifications/send", async (req, res) => {
    try {
      const result = await notificationService.sendNotification(req.body);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to send notification' });
    }
  });

  app.post("/api/notifications/emergency/:touristId", async (req, res) => {
    try {
      const { touristId } = req.params;
      const { message, location } = req.body;
      
      await notificationService.sendEmergencyNotification(touristId, message, location);
      res.json({ success: true, message: 'Emergency notifications sent' });
    } catch (error) {
      res.status(500).json({ error: 'Failed to send emergency notifications' });
    }
  });

  app.get("/api/notifications/statistics", async (req, res) => {
    try {
      const stats = notificationService.getStatistics();
      res.json({ statistics: stats });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get notification statistics' });
    }
  });

  // Geofencing Service Endpoints
  app.post("/api/geofencing/location-update", async (req, res) => {
    try {
      const { touristId, latitude, longitude, accuracy } = req.body;
      
      if (!touristId || !latitude || !longitude) {
        return res.status(400).json({ error: 'Missing required parameters' });
      }
      
      const result = await geofencingService.processLocationUpdate(
        touristId,
        { latitude, longitude },
        accuracy
      );
      
      // Broadcast geofence alerts
      if (result.alerts.length > 0) {
        result.alerts.forEach(alert => {
          broadcast({
            type: 'GEOFENCE_ALERT',
            data: alert
          });
        });
      }
      
      // Update tourist location in storage
      await storage.updateTourist(touristId, {
        locationLat: latitude.toString(),
        locationLng: longitude.toString(),
        currentLocation: `${latitude}, ${longitude}`
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Failed to process location update' });
    }
  });

  app.get("/api/geofencing/safe-zones", async (req, res) => {
    try {
      const zones = geofencingService.getAllSafeZones();
      res.json({ zones });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get safe zones' });
    }
  });

  app.post("/api/geofencing/safe-zones", async (req, res) => {
    try {
      const zoneId = geofencingService.addSafeZone(req.body);
      res.json({ success: true, zoneId });
    } catch (error) {
      res.status(500).json({ error: 'Failed to create safe zone' });
    }
  });

  app.put("/api/geofencing/safe-zones/:zoneId", async (req, res) => {
    try {
      const success = geofencingService.updateSafeZone(req.params.zoneId, req.body);
      if (!success) {
        return res.status(404).json({ error: 'Safe zone not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to update safe zone' });
    }
  });

  app.delete("/api/geofencing/safe-zones/:zoneId", async (req, res) => {
    try {
      const success = geofencingService.deleteSafeZone(req.params.zoneId);
      if (!success) {
        return res.status(404).json({ error: 'Safe zone not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to delete safe zone' });
    }
  });

  app.get("/api/geofencing/alerts/:touristId", async (req, res) => {
    try {
      const alerts = geofencingService.getGeofenceAlerts(req.params.touristId);
      res.json({ alerts });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get geofence alerts' });
    }
  });

  app.patch("/api/geofencing/alerts/:touristId/:alertId/resolve", async (req, res) => {
    try {
      const success = geofencingService.resolveAlert(req.params.touristId, req.params.alertId);
      if (!success) {
        return res.status(404).json({ error: 'Alert not found' });
      }
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  });

  app.get("/api/geofencing/nearby-zones", async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
      }
      
      const nearbyZones = geofencingService.getNearbyZones(
        { latitude: Number(lat), longitude: Number(lng) },
        radius ? Number(radius) : undefined
      );
      
      res.json({ zones: nearbyZones });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get nearby zones' });
    }
  });

  app.get("/api/geofencing/emergency-facilities", async (req, res) => {
    try {
      const { lat, lng, radius } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
      }
      
      const facilities = geofencingService.getEmergencyFacilities(
        { latitude: Number(lat), longitude: Number(lng) },
        radius ? Number(radius) : undefined
      );
      
      res.json({ facilities });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get emergency facilities' });
    }
  });

  app.get("/api/geofencing/safety-recommendations", async (req, res) => {
    try {
      const { lat, lng } = req.query;
      
      if (!lat || !lng) {
        return res.status(400).json({ error: 'Latitude and longitude required' });
      }
      
      const recommendations = geofencingService.getSafetyRecommendations(
        { latitude: Number(lat), longitude: Number(lng) }
      );
      
      res.json(recommendations);
    } catch (error) {
      res.status(500).json({ error: 'Failed to get safety recommendations' });
    }
  });

  app.get("/api/geofencing/statistics", async (req, res) => {
    try {
      const stats = geofencingService.getStatistics();
      res.json({ statistics: stats });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get geofencing statistics' });
    }
  });

  // Advanced Analytics Endpoints
  app.get("/api/analytics/system-metrics", async (req, res) => {
    try {
      const metrics = await analyticsService.getSystemMetrics();
      res.json({ metrics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get system metrics' });
    }
  });

  app.get("/api/analytics/location", async (req, res) => {
    try {
      const analytics = await analyticsService.getLocationAnalytics();
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get location analytics' });
    }
  });

  app.get("/api/analytics/time-based", async (req, res) => {
    try {
      const analytics = await analyticsService.getTimeBasedAnalytics();
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get time-based analytics' });
    }
  });

  app.get("/api/analytics/behavior", async (req, res) => {
    try {
      const analytics = await analyticsService.getTouristBehaviorAnalytics();
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get behavior analytics' });
    }
  });

  app.get("/api/analytics/performance", async (req, res) => {
    try {
      const analytics = await analyticsService.getSystemPerformanceAnalytics();
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get performance analytics' });
    }
  });

  app.get("/api/analytics/predictive", async (req, res) => {
    try {
      const analytics = await analyticsService.getPredictiveAnalytics();
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get predictive analytics' });
    }
  });

  app.get("/api/analytics/comprehensive-report", async (req, res) => {
    try {
      const report = await analyticsService.generateComprehensiveReport();
      res.json({ report });
    } catch (error) {
      res.status(500).json({ error: 'Failed to generate comprehensive report' });
    }
  });

  // File Management Endpoints
  app.post("/api/files/upload", async (req, res) => {
    try {
      const result = await fileManagementService.uploadDocument(req.body);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Broadcast file upload notification
      broadcast({
        type: 'FILE_UPLOADED',
        data: {
          fileId: result.fileId,
          touristId: req.body.touristId,
          documentType: req.body.documentType,
          timestamp: new Date().toISOString()
        }
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  app.get("/api/files/:fileId", async (req, res) => {
    try {
      const metadata = fileManagementService.getFileMetadata(req.params.fileId);
      
      if (!metadata) {
        return res.status(404).json({ error: 'File not found' });
      }
      
      res.json({ metadata });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get file metadata' });
    }
  });

  app.get("/api/files/tourist/:touristId", async (req, res) => {
    try {
      const files = fileManagementService.getFilesByTourist(req.params.touristId);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get tourist files' });
    }
  });

  app.get("/api/files/type/:documentType", async (req, res) => {
    try {
      const files = fileManagementService.getFilesByType(req.params.documentType as any);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get files by type' });
    }
  });

  app.post("/api/files/:fileId/verify", async (req, res) => {
    try {
      const { verifiedBy } = req.body;
      
      if (!verifiedBy) {
        return res.status(400).json({ error: 'verifiedBy is required' });
      }
      
      const result = await fileManagementService.verifyDocument(req.params.fileId, verifiedBy);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      // Broadcast verification notification
      broadcast({
        type: 'DOCUMENT_VERIFIED',
        data: {
          fileId: req.params.fileId,
          verifiedBy,
          timestamp: new Date().toISOString()
        }
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Document verification failed' });
    }
  });

  app.delete("/api/files/:fileId", async (req, res) => {
    try {
      const { deletedBy } = req.body;
      
      if (!deletedBy) {
        return res.status(400).json({ error: 'deletedBy is required' });
      }
      
      const result = await fileManagementService.deleteFile(req.params.fileId, deletedBy);
      
      if (!result.success) {
        return res.status(400).json(result);
      }
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'File deletion failed' });
    }
  });

  app.post("/api/files/search", async (req, res) => {
    try {
      const files = fileManagementService.searchFiles(req.body);
      res.json({ files });
    } catch (error) {
      res.status(500).json({ error: 'File search failed' });
    }
  });

  app.get("/api/files/analytics/overview", async (req, res) => {
    try {
      const analytics = fileManagementService.getFileAnalytics();
      res.json({ analytics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get file analytics' });
    }
  });

  app.get("/api/files/analytics/storage", async (req, res) => {
    try {
      const statistics = fileManagementService.getStorageStatistics();
      res.json({ statistics });
    } catch (error) {
      res.status(500).json({ error: 'Failed to get storage statistics' });
    }
  });

  app.post("/api/files/bulk-verify", async (req, res) => {
    try {
      const { fileIds, verifiedBy } = req.body;
      
      if (!fileIds || !Array.isArray(fileIds) || !verifiedBy) {
        return res.status(400).json({ error: 'fileIds array and verifiedBy are required' });
      }
      
      const result = await fileManagementService.bulkVerifyFiles(fileIds, verifiedBy);
      
      // Broadcast bulk verification notification
      broadcast({
        type: 'BULK_VERIFICATION_COMPLETE',
        data: {
          totalFiles: fileIds.length,
          successful: result.success,
          failed: result.failed,
          verifiedBy,
          timestamp: new Date().toISOString()
        }
      });
      
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: 'Bulk verification failed' });
    }
  });

  // Enhanced system monitoring endpoints
  app.get("/api/system/health", async (req, res) => {
    try {
      const health = {
        timestamp: new Date().toISOString(),
        services: {
          database: await this.checkDatabaseHealth(),
          blockchain: await this.checkBlockchainHealth(),
          notifications: this.checkNotificationHealth(),
          geofencing: this.checkGeofencingHealth(),
          fileManagement: this.checkFileManagementHealth()
        },
        overall: 'operational'
      };
      
      // Determine overall health
      const serviceStates = Object.values(health.services);
      if (serviceStates.some(state => state === 'critical')) {
        health.overall = 'critical';
      } else if (serviceStates.some(state => state === 'degraded')) {
        health.overall = 'degraded';
      }
      
      res.json({ health });
    } catch (error) {
      res.status(500).json({ 
        health: {
          timestamp: new Date().toISOString(),
          overall: 'critical',
          error: 'Health check failed'
        }
      });
    }
  });

  // Service-specific health check methods
  const checkDatabaseHealth = async (): Promise<string> => {
    try {
      // Try to fetch a simple record
      await storage.getAllActiveTourists();
      return 'operational';
    } catch (error) {
      return 'critical';
    }
  };

  const checkBlockchainHealth = async (): Promise<string> => {
    try {
      const status = await storage.getBlockchainServiceStatus();
      if (status.available && status.blockchain.connected) {
        return 'operational';
      } else if (status.available) {
        return 'degraded';
      } else {
        return 'critical';
      }
    } catch (error) {
      return 'critical';
    }
  };

  const checkNotificationHealth = (): string => {
    try {
      const stats = notificationService.getStatistics();
      return stats.successRate > 90 ? 'operational' : 
             stats.successRate > 70 ? 'degraded' : 'critical';
    } catch (error) {
      return 'critical';
    }
  };

  const checkGeofencingHealth = (): string => {
    try {
      const stats = geofencingService.getStatistics();
      return stats.activeSafeZones > 0 ? 'operational' : 'degraded';
    } catch (error) {
      return 'critical';
    }
  };

  const checkFileManagementHealth = (): string => {
    try {
      const stats = fileManagementService.getStorageStatistics();
      return stats.storageHealth === 'good' ? 'operational' :
             stats.storageHealth === 'warning' ? 'degraded' : 'critical';
    } catch (error) {
      return 'critical';
    }
  };

  return httpServer;
}
