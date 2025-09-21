import { type User, type InsertUser, type Tourist, type InsertTourist, type Alert, type InsertAlert, type EmergencyIncident, type InsertEmergencyIncident } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByGoogleId(googleId: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

  // Tourist methods
  getTourist(id: string): Promise<Tourist | undefined>;
  getTouristByUserId(userId: string): Promise<Tourist | undefined>;
  createTourist(tourist: InsertTourist): Promise<Tourist>;
  updateTourist(id: string, updates: Partial<Tourist>): Promise<Tourist | undefined>;
  getAllActiveTourists(): Promise<Tourist[]>;

  // Alert methods
  getAlerts(): Promise<Alert[]>;
  getAlertsByTouristId(touristId: string): Promise<Alert[]>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined>;

  // Emergency incident methods
  getEmergencyIncidents(): Promise<EmergencyIncident[]>;
  getEmergencyIncidentsByTouristId(touristId: string): Promise<EmergencyIncident[]>;
  createEmergencyIncident(incident: InsertEmergencyIncident): Promise<EmergencyIncident>;
  updateEmergencyIncident(id: string, updates: Partial<EmergencyIncident>): Promise<EmergencyIncident | undefined>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tourists: Map<string, Tourist> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private emergencyIncidents: Map<string, EmergencyIncident> = new Map();

  constructor() {
    // Initialize with admin users
    this.createUser({
      email: 'admin1@safetysystem.com',
      name: 'Admin One',
      role: 'admin',
    });
    this.createUser({
      email: 'admin2@safetysystem.com',
      name: 'Admin Two',
      role: 'admin',
    });
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.googleId === googleId);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      googleId: insertUser.googleId || null,
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  // Tourist methods
  async getTourist(id: string): Promise<Tourist | undefined> {
    return this.tourists.get(id);
  }

  async getTouristByUserId(userId: string): Promise<Tourist | undefined> {
    return Array.from(this.tourists.values()).find(tourist => tourist.userId === userId);
  }

  async createTourist(insertTourist: InsertTourist): Promise<Tourist> {
    const id = randomUUID();
    const digitalIdHash = `blockchain_${randomUUID().replace(/-/g, '')}`;
    const tourist: Tourist = {
      ...insertTourist,
      id,
      digitalIdHash,
      documentUrl: insertTourist.documentUrl || null,
      itinerary: insertTourist.itinerary || null,
      startDate: insertTourist.startDate || null,
      endDate: insertTourist.endDate || null,
      emergencyName: insertTourist.emergencyName || null,
      emergencyPhone: insertTourist.emergencyPhone || null,
      currentLocation: insertTourist.currentLocation || null,
      locationLat: insertTourist.locationLat || null,
      locationLng: insertTourist.locationLng || null,
      safetyScore: 85,
      isActive: true,
      createdAt: new Date(),
    };
    this.tourists.set(id, tourist);
    return tourist;
  }

  async updateTourist(id: string, updates: Partial<Tourist>): Promise<Tourist | undefined> {
    const tourist = this.tourists.get(id);
    if (!tourist) return undefined;
    
    const updated = { ...tourist, ...updates };
    this.tourists.set(id, updated);
    return updated;
  }

  async getAllActiveTourists(): Promise<Tourist[]> {
    return Array.from(this.tourists.values()).filter(tourist => tourist.isActive);
  }

  // Alert methods
  async getAlerts(): Promise<Alert[]> {
    return Array.from(this.alerts.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getAlertsByTouristId(touristId: string): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.touristId === touristId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = randomUUID();
    const alert: Alert = {
      ...insertAlert,
      id,
      touristId: insertAlert.touristId || null,
      location: insertAlert.location || null,
      isResolved: false,
      createdAt: new Date(),
    };
    this.alerts.set(id, alert);
    return alert;
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (!alert) return undefined;
    
    const updated = { ...alert, ...updates };
    this.alerts.set(id, updated);
    return updated;
  }

  // Emergency incident methods
  async getEmergencyIncidents(): Promise<EmergencyIncident[]> {
    return Array.from(this.emergencyIncidents.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getEmergencyIncidentsByTouristId(touristId: string): Promise<EmergencyIncident[]> {
    return Array.from(this.emergencyIncidents.values())
      .filter(incident => incident.touristId === touristId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createEmergencyIncident(insertIncident: InsertEmergencyIncident): Promise<EmergencyIncident> {
    const id = randomUUID();
    const incident: EmergencyIncident = {
      ...insertIncident,
      id,
      description: insertIncident.description || null,
      responderNotes: insertIncident.responderNotes || null,
      locationLat: insertIncident.locationLat || null,
      locationLng: insertIncident.locationLng || null,
      status: 'active',
      resolvedAt: null,
      createdAt: new Date(),
    };
    this.emergencyIncidents.set(id, incident);
    return incident;
  }

  async updateEmergencyIncident(id: string, updates: Partial<EmergencyIncident>): Promise<EmergencyIncident | undefined> {
    const incident = this.emergencyIncidents.get(id);
    if (!incident) return undefined;
    
    const updated = { 
      ...incident, 
      ...updates,
      resolvedAt: updates.status === 'resolved' ? new Date() : incident.resolvedAt
    };
    this.emergencyIncidents.set(id, updated);
    return updated;
  }
}

export const storage = new MemStorage();
