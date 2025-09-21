import { type User, type InsertUser, type Tourist, type InsertTourist, type Alert, type InsertAlert, type EmergencyIncident, type InsertEmergencyIncident } from "@shared/schema";
import { randomUUID } from "crypto";
import { BlockchainTouristService, type BlockchainTouristProfile } from './blockchain';

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
  private blockchainService: BlockchainTouristService;
  private encryptionKey: string;

  constructor() {
    // Initialize blockchain service
    this.blockchainService = new BlockchainTouristService();
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    
    // Initialize blockchain service with admin wallet if available
    if (process.env.ADMIN_PRIVATE_KEY) {
      this.blockchainService.initializeWithWallet(process.env.ADMIN_PRIVATE_KEY);
    }
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
    
    try {
      // Generate wallet for tourist
      const wallet = BlockchainTouristService.generateWallet();
      
      // Prepare profile data for blockchain
      const profileData = {
        firstName: insertTourist.firstName,
        lastName: insertTourist.lastName,
        phone: insertTourist.phone,
        documentType: insertTourist.documentType,
        email: `tourist_${id}@blockchain.local` // Mock email for demo
      };
      
      // Create mock document buffer (in production, this would be the actual document)
      const documentBuffer = Buffer.from(JSON.stringify({
        documentType: insertTourist.documentType,
        documentUrl: insertTourist.documentUrl,
        uploadTime: new Date().toISOString()
      }));
      
      // Prepare emergency contact
      const emergencyContactData = JSON.stringify({
        name: insertTourist.emergencyName,
        phone: insertTourist.emergencyPhone
      });
      
      // Create blockchain-secured digital ID
      let blockchainProfile: BlockchainTouristProfile;
      try {
        // Initialize blockchain service with tourist's wallet
        await this.blockchainService.initializeWithWallet(wallet.privateKey);
        
        // Create digital ID on blockchain
        blockchainProfile = await this.blockchainService.createDigitalTouristID(
          profileData,
          documentBuffer,
          emergencyContactData,
          this.encryptionKey
        );
      } catch (blockchainError) {
        console.warn('Blockchain creation failed, using fallback:', blockchainError);
        // Fallback to mock implementation for development
        blockchainProfile = {
          profileId: `blockchain_${randomUUID().replace(/-/g, '')}`,
          profileHash: `0x${randomUUID().replace(/-/g, '')}`,
          documentHash: `0x${randomUUID().replace(/-/g, '')}`,
          ipfsDocumentHash: `Qm${randomUUID().replace(/-/g, '')}`,
          touristAddress: wallet.address,
          createdAt: Math.floor(Date.now() / 1000),
          verificationLevel: 0,
          isActive: true,
          transactionHash: `0x${randomUUID().replace(/-/g, '')}`
        };
      }
      
      // Create tourist record with blockchain data
      const tourist: Tourist = {
        ...insertTourist,
        id,
        digitalIdHash: blockchainProfile.profileId,
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
      
      // Store additional blockchain metadata (in production, use proper database)
      (tourist as any).blockchainData = {
        walletAddress: wallet.address,
        profileHash: blockchainProfile.profileHash,
        documentHash: blockchainProfile.documentHash,
        ipfsHash: blockchainProfile.ipfsDocumentHash,
        transactionHash: blockchainProfile.transactionHash,
        verificationLevel: blockchainProfile.verificationLevel
      };
      
      this.tourists.set(id, tourist);
      
      console.log(`✅ Tourist created with blockchain ID: ${blockchainProfile.profileId}`);
      console.log(`   Wallet Address: ${wallet.address}`);
      console.log(`   Transaction: ${blockchainProfile.transactionHash}`);
      
      return tourist;
      
    } catch (error) {
      console.error('Error creating blockchain tourist:', error);
      
      // Fallback to original implementation
      const digitalIdHash = `fallback_${randomUUID().replace(/-/g, '')}`;
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

  // Blockchain-specific methods
  
  /**
   * Verify tourist identity using blockchain signature
   */
  async verifyTouristIdentity(
    touristId: string, 
    message: string, 
    signature: string
  ): Promise<boolean> {
    try {
      const tourist = this.tourists.get(touristId);
      if (!tourist?.digitalIdHash) return false;
      
      return await this.blockchainService.verifyDigitalSignature(
        tourist.digitalIdHash,
        message,
        signature
      );
    } catch (error) {
      console.error('Identity verification failed:', error);
      return false;
    }
  }
  
  /**
   * Verify tourist profile on blockchain (admin only)
   */
  async verifyTouristProfile(
    touristId: string, 
    verificationLevel: number
  ): Promise<string | null> {
    try {
      const tourist = this.tourists.get(touristId);
      if (!tourist?.digitalIdHash) return null;
      
      const txHash = await this.blockchainService.verifyProfile(
        tourist.digitalIdHash,
        verificationLevel
      );
      
      // Update local record
      tourist.safetyScore = Math.min(100, tourist.safetyScore + (verificationLevel * 10));
      this.tourists.set(touristId, tourist);
      
      return txHash;
    } catch (error) {
      console.error('Profile verification failed:', error);
      return null;
    }
  }
  
  /**
   * Get blockchain profile data
   */
  async getBlockchainProfile(touristId: string): Promise<any> {
    try {
      const tourist = this.tourists.get(touristId);
      if (!tourist?.digitalIdHash) return null;
      
      return await this.blockchainService.getProfile(tourist.digitalIdHash);
    } catch (error) {
      console.error('Failed to get blockchain profile:', error);
      return null;
    }
  }
  
  /**
   * Emergency access to encrypted data
   */
  async emergencyAccessProfile(
    touristId: string
  ): Promise<string | null> {
    try {
      const tourist = this.tourists.get(touristId);
      if (!tourist?.digitalIdHash) return null;
      
      return await this.blockchainService.emergencyAccess(
        tourist.digitalIdHash,
        this.encryptionKey
      );
    } catch (error) {
      console.error('Emergency access failed:', error);
      return null;
    }
  }
  
  /**
   * Check if tourist profile is verified on blockchain
   */
  async isProfileVerified(touristId: string): Promise<boolean> {
    try {
      const tourist = this.tourists.get(touristId);
      if (!tourist?.digitalIdHash) return false;
      
      return await this.blockchainService.isProfileVerified(tourist.digitalIdHash);
    } catch (error) {
      console.error('Verification check failed:', error);
      return false;
    }
  }
  
  /**
   * Get network information
   */
  async getBlockchainNetworkInfo(): Promise<{ name: string; chainId: number } | null> {
    try {
      return await this.blockchainService.getNetworkInfo();
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }
}

export const storage = new MemStorage();
