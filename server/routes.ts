import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertTouristSchema, insertAlertSchema, insertEmergencyIncidentSchema, insertAIAnomalySchema, insertEFIRSchema, insertAuthoritySchema } from "@shared/schema";
import { AIAnomalyDetector } from "./ai-anomaly-detector";
import { EFIRGenerator } from "./efir-generator";

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
      const authorities = await storage.getAuthorities();
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

  return httpServer;
}
