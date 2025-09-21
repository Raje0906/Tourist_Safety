import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertUserSchema, insertTouristSchema, insertAlertSchema, insertEmergencyIncidentSchema } from "@shared/schema";

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

  // Tourist routes
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
      res.status(400).json({ error: 'Invalid tourist data' });
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
      
      const activeAlerts = alerts.filter(alert => !alert.isResolved);
      const emergencyIncidents = incidents.filter(incident => incident.status === 'active');
      const averageSafetyScore = tourists.length > 0 
        ? tourists.reduce((sum, t) => sum + (t.safetyScore || 0), 0) / tourists.length 
        : 0;
      
      res.json({
        activeTourists: tourists.length,
        activeAlerts: activeAlerts.length,
        emergencyIncidents: emergencyIncidents.length,
        averageSafetyScore: Math.round(averageSafetyScore * 10) / 10
      });
    } catch (error) {
      res.status(500).json({ error: 'Failed to fetch statistics' });
    }
  });

  return httpServer;
}
