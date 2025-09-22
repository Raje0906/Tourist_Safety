import { type User, type InsertUser, type Tourist, type InsertTourist, type Alert, type InsertAlert, type EmergencyIncident, type InsertEmergencyIncident, type AIAnomaly, type InsertAIAnomaly, type EFIR, type InsertEFIR, type Authority, type InsertAuthority } from "@shared/schema";
import { randomUUID } from "crypto";
import { BlockchainTouristService, type BlockchainTouristProfile } from './blockchain';
import { MongoStorage } from './mongo-storage';

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
  
  // AI Anomaly methods
  getAIAnomalies(): Promise<AIAnomaly[]>;
  getAIAnomaliesByTouristId(touristId: string): Promise<AIAnomaly[]>;
  createAIAnomaly(anomaly: InsertAIAnomaly): Promise<AIAnomaly>;
  updateAIAnomaly(id: string, updates: Partial<AIAnomaly>): Promise<AIAnomaly | undefined>;
  
  // E-FIR methods
  getEFIRs(): Promise<EFIR[]>;
  getEFIRsByTouristId(touristId: string): Promise<EFIR[]>;
  createEFIR(efir: InsertEFIR): Promise<EFIR>;
  updateEFIR(id: string, updates: Partial<EFIR>): Promise<EFIR | undefined>;
  
  // Authority methods
  getAuthorities(): Promise<Authority[]>;
  getAuthorityById(id: string): Promise<Authority | undefined>;
  createAuthority(authority: InsertAuthority): Promise<Authority>;
  updateAuthority(id: string, updates: Partial<Authority>): Promise<Authority | undefined>;
  
  // Digital ID validation methods
  checkValidDigitalId(userId: string, startDate: Date, endDate: Date): Promise<{ isValid: boolean; tourist?: Tourist; message: string }>;
  updateTouristTripDates(touristId: string, startDate: Date, endDate: Date, itinerary?: string): Promise<Tourist | undefined>;
  
  // Blockchain methods
  verifyTouristIdentity(touristId: string, message: string, signature: string): Promise<boolean>;
  verifyTouristProfile(touristId: string, verificationLevel: number): Promise<string | null>;
  getBlockchainProfile(touristId: string): Promise<any>;
  emergencyAccessProfile(touristId: string): Promise<string | null>;
  isProfileVerified(touristId: string): Promise<boolean>;
  getBlockchainNetworkInfo(): Promise<{ name: string; chainId: number } | null>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private tourists: Map<string, Tourist> = new Map();
  private alerts: Map<string, Alert> = new Map();
  private emergencyIncidents: Map<string, EmergencyIncident> = new Map();
  private aiAnomalies: Map<string, AIAnomaly> = new Map();
  private efirs: Map<string, EFIR> = new Map();
  private authorities: Map<string, Authority> = new Map();
  private blockchainService: BlockchainTouristService;
  private encryptionKey: string;

  constructor() {
    // Initialize with admin users first
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
    
    // Initialize default authorities
    this.createAuthority({
      name: 'Delhi Police',
      type: 'police',
      email: 'delhi.police@gov.in',
      phone: '+91-11-23490000',
      jurisdiction: 'Delhi'
    });
    
    this.createAuthority({
      name: 'Tourist Helpline',
      type: 'tourist_police',
      email: 'tourist.help@gov.in',
      phone: '+91-11-1363',
      jurisdiction: 'All India'
    });
    
    this.createAuthority({
      name: 'Emergency Medical Services',
      type: 'medical',
      email: 'emergency@aiims.edu',
      phone: '+91-11-26588500',
      jurisdiction: 'Delhi NCR'
    });
    
    // Initialize blockchain service if configured
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    
    try {
      // Only initialize blockchain service if we have all required environment variables
      if (process.env.ETHEREUM_RPC_URL && process.env.TOURIST_ID_CONTRACT_ADDRESS) {
        console.log('🔗 Initializing blockchain service...');
        this.blockchainService = new BlockchainTouristService(
          process.env.ETHEREUM_RPC_URL,
          process.env.TOURIST_ID_CONTRACT_ADDRESS,
          process.env.IPFS_URL
        );
        
        // Initialize blockchain service with admin wallet if available
        if (process.env.ADMIN_PRIVATE_KEY) {
          this.blockchainService.initializeWithWallet(process.env.ADMIN_PRIVATE_KEY);
        }
        console.log('✅ Blockchain service initialized successfully');
      } else {
        console.warn('⚠️ Blockchain environment variables not configured, using fallback mode');
        console.warn('   Please set ETHEREUM_RPC_URL and TOURIST_ID_CONTRACT_ADDRESS in .env');
        this.blockchainService = null as any; // Will use fallback implementations
      }
    } catch (error) {
      console.error('❌ Failed to initialize blockchain service:', error);
      console.warn('🔄 Falling back to mock blockchain implementation');
      this.blockchainService = null as any; // Will use fallback implementations
    }
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

  // AI Anomaly methods
  async getAIAnomalies(): Promise<AIAnomaly[]> {
    return Array.from(this.aiAnomalies.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getAIAnomaliesByTouristId(touristId: string): Promise<AIAnomaly[]> {
    return Array.from(this.aiAnomalies.values())
      .filter(anomaly => anomaly.touristId === touristId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createAIAnomaly(insertAnomaly: InsertAIAnomaly): Promise<AIAnomaly> {
    const id = randomUUID();
    const anomaly: AIAnomaly = {
      ...insertAnomaly,
      id,
      locationLat: insertAnomaly.locationLat || null,
      locationLng: insertAnomaly.locationLng || null,
      behaviorData: insertAnomaly.behaviorData || null,
      isResolved: false,
      createdAt: new Date(),
    };
    this.aiAnomalies.set(id, anomaly);
    return anomaly;
  }

  async updateAIAnomaly(id: string, updates: Partial<AIAnomaly>): Promise<AIAnomaly | undefined> {
    const anomaly = this.aiAnomalies.get(id);
    if (!anomaly) return undefined;
    
    const updated = { ...anomaly, ...updates };
    this.aiAnomalies.set(id, updated);
    return updated;
  }

  // E-FIR methods
  async getEFIRs(): Promise<EFIR[]> {
    return Array.from(this.efirs.values()).sort((a, b) => 
      new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime()
    );
  }

  async getEFIRsByTouristId(touristId: string): Promise<EFIR[]> {
    return Array.from(this.efirs.values())
      .filter(efir => efir.touristId === touristId)
      .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime());
  }

  async createEFIR(insertEFIR: InsertEFIR): Promise<EFIR> {
    const id = randomUUID();
    const firNumber = `EFIR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
    const efir: EFIR = {
      ...insertEFIR,
      id,
      firNumber,
      locationLat: insertEFIR.locationLat || null,
      locationLng: insertEFIR.locationLng || null,
      evidenceFiles: insertEFIR.evidenceFiles || null,
      pdfPath: null,
      status: 'filed',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.efirs.set(id, efir);
    return efir;
  }

  async updateEFIR(id: string, updates: Partial<EFIR>): Promise<EFIR | undefined> {
    const efir = this.efirs.get(id);
    if (!efir) return undefined;
    
    const updated = { 
      ...efir, 
      ...updates,
      updatedAt: new Date()
    };
    this.efirs.set(id, updated);
    return updated;
  }

  // Authority methods
  async getAuthorities(): Promise<Authority[]> {
    return Array.from(this.authorities.values())
      .filter(authority => authority.isActive)
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  async getAuthorityById(id: string): Promise<Authority | undefined> {
    return this.authorities.get(id);
  }

  async createAuthority(insertAuthority: InsertAuthority): Promise<Authority> {
    const id = randomUUID();
    const authority: Authority = {
      ...insertAuthority,
      id,
      isActive: true,
      createdAt: new Date(),
    };
    this.authorities.set(id, authority);
    return authority;
  }

  async updateAuthority(id: string, updates: Partial<Authority>): Promise<Authority | undefined> {
    const authority = this.authorities.get(id);
    if (!authority) return undefined;
    
    const updated = { ...authority, ...updates };
    this.authorities.set(id, updated);
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
      tourist.safetyScore = Math.min(100, (tourist.safetyScore || 85) + (verificationLevel * 10));
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
  
  // Helper method to check if digital ID is valid for trip dates
  private isDigitalIdValid(tourist: Tourist, startDate: Date, endDate: Date): boolean {
    if (!tourist.digitalIdHash || !tourist.isActive) {
      return false;
    }
    
    // Check if the existing trip dates cover the new trip dates
    if (tourist.startDate && tourist.endDate) {
      const existingStart = new Date(tourist.startDate);
      const existingEnd = new Date(tourist.endDate);
      
      // Add 1 day buffer to existing end date as specified
      const bufferedEnd = new Date(existingEnd);
      bufferedEnd.setDate(bufferedEnd.getDate() + 1);
      
      // Check if new trip is within existing valid period
      return startDate >= existingStart && endDate <= bufferedEnd;
    }
    
    return false;
  }

  // Check if tourist has valid digital ID for given trip dates
  async checkValidDigitalId(userId: string, startDate: Date, endDate: Date): Promise<{ isValid: boolean; tourist?: Tourist; message: string }> {
    try {
      const existingTourist = await this.getTouristByUserId(userId);
      
      if (!existingTourist) {
        return {
          isValid: false,
          message: 'No existing digital ID found. Please complete registration.'
        };
      }
      
      if (this.isDigitalIdValid(existingTourist, startDate, endDate)) {
        return {
          isValid: true,
          tourist: existingTourist,
          message: `Valid digital ID found. Your ID ${existingTourist.digitalIdHash?.slice(-8)} is valid until ${new Date(existingTourist.endDate!).toLocaleDateString()}.`
        };
      }
      
      // Check if we need to extend the existing trip
      if (existingTourist.startDate && existingTourist.endDate) {
        const existingEnd = new Date(existingTourist.endDate);
        const newEnd = new Date(endDate);
        
        if (newEnd > existingEnd) {
          return {
            isValid: false,
            tourist: existingTourist,
            message: `Your existing digital ID expires on ${existingEnd.toLocaleDateString()}. You can extend it for your new trip ending ${newEnd.toLocaleDateString()}.`
          };
        }
      }
      
      return {
        isValid: false,
        tourist: existingTourist,
        message: 'Your existing digital ID has expired or does not cover your trip dates. Please update your registration.'
      };
      
    } catch (error) {
      console.error('Error checking digital ID validity:', error);
      return {
        isValid: false,
        message: 'Error checking digital ID. Please try again.'
      };
    }
  }

  // Update tourist trip dates without creating new digital ID
  async updateTouristTripDates(touristId: string, startDate: Date, endDate: Date, itinerary?: string): Promise<Tourist | undefined> {
    try {
      const updates: Partial<Tourist> = {
        startDate,
        endDate
      };
      
      if (itinerary) {
        updates.itinerary = itinerary;
      }
      
      const updatedTourist = await this.updateTourist(touristId, updates);
      
      if (updatedTourist) {
        console.log(`✅ Updated trip dates for tourist ${touristId}`);
        console.log(`   New dates: ${startDate.toLocaleDateString()} to ${endDate.toLocaleDateString()}`);
      }
      
      return updatedTourist;
    } catch (error) {
      console.error('Error updating tourist trip dates:', error);
      return undefined;
    }
  }
}

// Initialize storage based on environment configuration
let storage: IStorage;

if (process.env.MONGODB_URI) {
  console.log('🍃 Initializing MongoDB storage...');
  const mongoStorage = new MongoStorage();
  
  // Connect to MongoDB
  mongoStorage.connect(process.env.MONGODB_URI)
    .then(() => {
      console.log('✅ MongoDB storage initialized successfully');
    })
    .catch((error) => {
      console.error('❌ MongoDB connection failed, falling back to in-memory storage:', error);
      storage = new MemStorage();
    });
  
  storage = mongoStorage;
} else {
  console.log('⚠️ MONGODB_URI not set, using in-memory storage');
  console.log('   To use MongoDB, set MONGODB_URI in your environment variables');
  storage = new MemStorage();
}

export { storage };
