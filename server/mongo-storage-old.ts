import mongoose from 'mongoose';
import { type User, type InsertUser, type Tourist, type InsertTourist, type Alert, type InsertAlert, type EmergencyIncident, type InsertEmergencyIncident, type AIAnomaly, type InsertAIAnomaly, type EFIR, type InsertEFIR, type Authority, type InsertAuthority } from "@shared/schema";
import { BlockchainTouristService, type BlockchainTouristProfile } from './blockchain';
import { IStorage } from './storage';
import { UserModel, TouristModel, AlertModel, EmergencyIncidentModel, AIAnomalyModel, EFIRModel, AuthorityModel, type IUser, type ITourist, type IAlert, type IEmergencyIncident, type IAIAnomaly, type IEFIR, type IAuthority } from './mongodb-schemas';
import { randomUUID } from "crypto";

export class MongoStorage implements IStorage {
  private blockchainService: BlockchainTouristService | null = null;
  private encryptionKey: string;
  private isConnected: boolean = false;

  constructor() {
    this.encryptionKey = process.env.ENCRYPTION_KEY || 'default-encryption-key-change-in-production';
    this.initializeBlockchain();
  }

  async connect(connectionString: string): Promise<void> {
    try {
      await mongoose.connect(connectionString);
      this.isConnected = true;
      console.log('✅ Connected to MongoDB successfully');
      
      // Initialize with admin users if they don't exist
      await this.initializeAdminUsers();
      
    } catch (error) {
      console.error('❌ Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      await mongoose.disconnect();
      this.isConnected = false;
      console.log('🔌 Disconnected from MongoDB');
    }
  }

  private async initializeAdminUsers(): Promise<void> {
    try {
      const adminEmails = ['admin1@safetysystem.com', 'admin2@safetysystem.com'];
      
      for (const email of adminEmails) {
        const existingAdmin = await UserModel.findOne({ email });
        if (!existingAdmin) {
          await UserModel.create({
            email,
            name: email === 'admin1@safetysystem.com' ? 'Admin One' : 'Admin Two',
            role: 'admin',
          });
          console.log(`🔧 Created admin user: ${email}`);
        }
      }
    } catch (error) {
      console.error('Error initializing admin users:', error);
    }
  }

  private initializeBlockchain(): void {
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
        
        // Check service status
        this.blockchainService.getServiceStatus().then(status => {
          console.log('✅ Blockchain service initialized successfully');
          console.log(`   Blockchain: ${status.blockchain.connected ? '✅' : '❌'} ${status.blockchain.network || status.blockchain.error}`);
          console.log(`   IPFS: ${status.ipfs.enabled ? (status.ipfs.connected ? '✅' : '📴') : '📵'} ${status.ipfs.enabled ? (status.ipfs.version || status.ipfs.error) : 'Disabled'}`);
        }).catch(err => {
          console.warn('⚠️ Could not check service status:', err.message);
        });
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
  private mongoUserToUser(mongoUser: IUser): User {
    return {
      id: (mongoUser._id as any).toString(),
      email: mongoUser.email,
      name: mongoUser.name,
      role: mongoUser.role,
      googleId: mongoUser.googleId || null,
      createdAt: mongoUser.createdAt
    };
  }

  // Helper method to convert MongoDB document to Tourist type
  private mongoTouristToTourist(mongoTourist: ITourist): Tourist {
    return {
      id: (mongoTourist._id as any).toString(),
      userId: mongoTourist.userId,
      firstName: mongoTourist.firstName,
      lastName: mongoTourist.lastName,
      phone: mongoTourist.phone,
      documentType: mongoTourist.documentType,
      documentUrl: mongoTourist.documentUrl || null,
      itinerary: mongoTourist.itinerary || null,
      startDate: mongoTourist.startDate || null,
      endDate: mongoTourist.endDate || null,
      emergencyName: mongoTourist.emergencyName || null,
      emergencyPhone: mongoTourist.emergencyPhone || null,
      digitalIdHash: mongoTourist.digitalIdHash || null,
      safetyScore: mongoTourist.safetyScore,
      currentLocation: mongoTourist.currentLocation || null,
      locationLat: mongoTourist.locationLat ? mongoTourist.locationLat.toString() : null,
      locationLng: mongoTourist.locationLng ? mongoTourist.locationLng.toString() : null,
      isActive: mongoTourist.isActive,
      createdAt: mongoTourist.createdAt
    };
  }

  // Helper method to convert MongoDB document to Alert type
  private mongoAlertToAlert(mongoAlert: IAlert): Alert {
    return {
      id: (mongoAlert._id as any).toString(),
      touristId: mongoAlert.touristId || null,
      type: mongoAlert.type,
      severity: mongoAlert.severity,
      title: mongoAlert.title,
      message: mongoAlert.message,
      location: mongoAlert.location || null,
      isResolved: mongoAlert.isResolved,
      createdAt: mongoAlert.createdAt
    };
  }

  // Helper method to convert MongoDB document to Authority type
  private mongoAuthorityToAuthority(mongoAuthority: IAuthority): Authority {
    return {
      id: (mongoAuthority._id as any).toString(),
      name: mongoAuthority.name,
      type: mongoAuthority.type,
      email: mongoAuthority.email,
      phone: mongoAuthority.phone,
      jurisdiction: mongoAuthority.jurisdiction,
      isActive: mongoAuthority.isActive,
      createdAt: mongoAuthority.createdAt
    };
  }

  // Helper method to convert MongoDB document to AIAnomaly type
  private mongoAnomalyToAnomaly(mongoAnomaly: IAIAnomaly): AIAnomaly {
    return {
      id: (mongoAnomaly._id as any).toString(),
      touristId: mongoAnomaly.touristId,
      anomalyType: mongoAnomaly.anomalyType,
      severity: mongoAnomaly.severity,
      confidence: mongoAnomaly.confidence.toString(),
      description: mongoAnomaly.description,
      locationLat: mongoAnomaly.locationLat ? mongoAnomaly.locationLat.toString() : null,
      locationLng: mongoAnomaly.locationLng ? mongoAnomaly.locationLng.toString() : null,
      behaviorData: mongoAnomaly.behaviorData || null,
      isResolved: mongoAnomaly.isResolved,
      createdAt: mongoAnomaly.createdAt
    };
  }

  // Helper method to convert MongoDB document to EFIR type
  private mongoEFIRToEFIR(mongoEFIR: IEFIR): EFIR {
    return {
      id: (mongoEFIR._id as any).toString(),
      firNumber: mongoEFIR.firNumber,
      touristId: mongoEFIR.touristId,
      incidentType: mongoEFIR.incidentType,
      location: mongoEFIR.location,
      locationLat: mongoEFIR.locationLat ? mongoEFIR.locationLat.toString() : null,
      locationLng: mongoEFIR.locationLng ? mongoEFIR.locationLng.toString() : null,
      description: mongoEFIR.description,
      evidenceFiles: mongoEFIR.evidenceFiles || null,
      filedBy: mongoEFIR.filedBy,
      authorityContacted: mongoEFIR.authorityContacted,
      status: mongoEFIR.status,
      pdfPath: mongoEFIR.pdfPath || null,
      createdAt: mongoEFIR.createdAt,
      updatedAt: mongoEFIR.updatedAt
    };
  }

  // User methods
  async getUser(id: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findById(id);
      return user ? this.mongoUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ email });
      return user ? this.mongoUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByGoogleId(googleId: string): Promise<User | undefined> {
    try {
      const user = await UserModel.findOne({ googleId });
      return user ? this.mongoUserToUser(user) : undefined;
    } catch (error) {
      console.error('Error getting user by Google ID:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const user = await UserModel.create({
        email: insertUser.email,
        name: insertUser.name,
        role: insertUser.role,
        googleId: insertUser.googleId
      });
      return this.mongoUserToUser(user);
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  }

  // Tourist methods
  async getTourist(id: string): Promise<Tourist | undefined> {
    try {
      const tourist = await TouristModel.findById(id);
      return tourist ? this.mongoTouristToTourist(tourist) : undefined;
    } catch (error) {
      console.error('Error getting tourist:', error);
      return undefined;
    }
  }

  async getTouristByUserId(userId: string): Promise<Tourist | undefined> {
    try {
      const tourist = await TouristModel.findOne({ userId });
      return tourist ? this.mongoTouristToTourist(tourist) : undefined;
    } catch (error) {
      console.error('Error getting tourist by user ID:', error);
      return undefined;
    }
  }

  async createTourist(insertTourist: InsertTourist): Promise<Tourist> {
    try {
      // Generate wallet for tourist
      const wallet = BlockchainTouristService.generateWallet();
      
      // Prepare profile data for blockchain
      const profileData = {
        firstName: insertTourist.firstName,
        lastName: insertTourist.lastName,
        phone: insertTourist.phone,
        documentType: insertTourist.documentType,
        email: `tourist_${randomUUID()}@blockchain.local` // Mock email for demo
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
        if (this.blockchainService) {
          await this.blockchainService.initializeWithWallet(wallet.privateKey);
          
          // Create digital ID on blockchain
          blockchainProfile = await this.blockchainService.createDigitalTouristID(
            profileData,
            documentBuffer,
            emergencyContactData,
            this.encryptionKey
          );
        } else {
          throw new Error('Blockchain service not available');
        }
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
      const tourist = await TouristModel.create({
        userId: insertTourist.userId,
        firstName: insertTourist.firstName,
        lastName: insertTourist.lastName,
        phone: insertTourist.phone,
        documentType: insertTourist.documentType,
        documentUrl: insertTourist.documentUrl,
        itinerary: insertTourist.itinerary,
        startDate: insertTourist.startDate,
        endDate: insertTourist.endDate,
        emergencyName: insertTourist.emergencyName,
        emergencyPhone: insertTourist.emergencyPhone,
        digitalIdHash: blockchainProfile.profileId,
        safetyScore: 85,
        currentLocation: insertTourist.currentLocation,
        locationLat: insertTourist.locationLat ? Number(insertTourist.locationLat) : undefined,
        locationLng: insertTourist.locationLng ? Number(insertTourist.locationLng) : undefined,
        isActive: true
      });

      console.log(`✅ Tourist created with blockchain ID: ${blockchainProfile.profileId}`);
      console.log(`   Wallet Address: ${wallet.address}`);
      console.log(`   Transaction: ${blockchainProfile.transactionHash}`);
      
      return this.mongoTouristToTourist(tourist);
      
    } catch (error) {
      console.error('Error creating blockchain tourist:', error);
      
      // Fallback to original implementation
      const digitalIdHash = `fallback_${randomUUID().replace(/-/g, '')}`;
      const tourist = await TouristModel.create({
        userId: insertTourist.userId,
        firstName: insertTourist.firstName,
        lastName: insertTourist.lastName,
        phone: insertTourist.phone,
        documentType: insertTourist.documentType,
        documentUrl: insertTourist.documentUrl,
        itinerary: insertTourist.itinerary,
        startDate: insertTourist.startDate,
        endDate: insertTourist.endDate,
        emergencyName: insertTourist.emergencyName,
        emergencyPhone: insertTourist.emergencyPhone,
        digitalIdHash,
        safetyScore: 85,
        currentLocation: insertTourist.currentLocation,
        locationLat: insertTourist.locationLat ? Number(insertTourist.locationLat) : undefined,
        locationLng: insertTourist.locationLng ? Number(insertTourist.locationLng) : undefined,
        isActive: true
      });
      
      return this.mongoTouristToTourist(tourist);
    }
  }

  async updateTourist(id: string, updates: Partial<Tourist>): Promise<Tourist | undefined> {
    try {
      const updateData: any = { ...updates };
      
      // Convert string coordinates to numbers for MongoDB
      if (updateData.locationLat) updateData.locationLat = Number(updateData.locationLat);
      if (updateData.locationLng) updateData.locationLng = Number(updateData.locationLng);
      
      const tourist = await TouristModel.findByIdAndUpdate(id, updateData, { new: true });
      return tourist ? this.mongoTouristToTourist(tourist) : undefined;
    } catch (error) {
      console.error('Error updating tourist:', error);
      return undefined;
    }
  }

  async getAllActiveTourists(): Promise<Tourist[]> {
    try {
      const tourists = await TouristModel.find({ isActive: true });
      return tourists.map(tourist => this.mongoTouristToTourist(tourist));
    } catch (error) {
      console.error('Error getting active tourists:', error);
      return [];
    }
  }

  // Alert methods
  async getAlerts(): Promise<Alert[]> {
    try {
      const alerts = await AlertModel.find().sort({ createdAt: -1 });
      return alerts.map(alert => this.mongoAlertToAlert(alert));
    } catch (error) {
      console.error('Error getting alerts:', error);
      return [];
    }
  }

  async getAlertsByTouristId(touristId: string): Promise<Alert[]> {
    try {
      const alerts = await AlertModel.find({ touristId }).sort({ createdAt: -1 });
      return alerts.map(alert => this.mongoAlertToAlert(alert));
    } catch (error) {
      console.error('Error getting alerts by tourist ID:', error);
      return [];
    }
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    try {
      const alert = await AlertModel.create({
        touristId: insertAlert.touristId,
        type: insertAlert.type,
        severity: insertAlert.severity,
        title: insertAlert.title,
        message: insertAlert.message,
        location: insertAlert.location,
        isResolved: false
      });
      return this.mongoAlertToAlert(alert);
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  }

  async updateAlert(id: string, updates: Partial<Alert>): Promise<Alert | undefined> {
    try {
      const alert = await AlertModel.findByIdAndUpdate(id, updates, { new: true });
      return alert ? this.mongoAlertToAlert(alert) : undefined;
    } catch (error) {
      console.error('Error updating alert:', error);
      return undefined;
    }
  }

  // Emergency incident methods
  async getEmergencyIncidents(): Promise<EmergencyIncident[]> {
    try {
      const incidents = await EmergencyIncidentModel.find().sort({ createdAt: -1 });
      return incidents.map(incident => this.mongoIncidentToIncident(incident));
    } catch (error) {
      console.error('Error getting emergency incidents:', error);
      return [];
    }
  }

  async getEmergencyIncidentsByTouristId(touristId: string): Promise<EmergencyIncident[]> {
    try {
      const incidents = await EmergencyIncidentModel.find({ touristId }).sort({ createdAt: -1 });
      return incidents.map(incident => this.mongoIncidentToIncident(incident));
    } catch (error) {
      console.error('Error getting emergency incidents by tourist ID:', error);
      return [];
    }
  }

  async createEmergencyIncident(insertIncident: InsertEmergencyIncident): Promise<EmergencyIncident> {
    try {
      const incident = await EmergencyIncidentModel.create({
        touristId: insertIncident.touristId,
        type: insertIncident.type,
        location: insertIncident.location,
        locationLat: insertIncident.locationLat ? Number(insertIncident.locationLat) : undefined,
        locationLng: insertIncident.locationLng ? Number(insertIncident.locationLng) : undefined,
        status: 'active',
        description: insertIncident.description,
        responderNotes: insertIncident.responderNotes
      });
      return this.mongoIncidentToIncident(incident);
    } catch (error) {
      console.error('Error creating emergency incident:', error);
      throw error;
    }
  }

  async updateEmergencyIncident(id: string, updates: Partial<EmergencyIncident>): Promise<EmergencyIncident | undefined> {
    try {
      const updateData: any = { ...updates };
      
      // Convert string coordinates to numbers for MongoDB
      if (updateData.locationLat) updateData.locationLat = Number(updateData.locationLat);
      if (updateData.locationLng) updateData.locationLng = Number(updateData.locationLng);
      
      // Set resolvedAt if status is resolved
      if (updates.status === 'resolved' && !updateData.resolvedAt) {
        updateData.resolvedAt = new Date();
      }
      
      const incident = await EmergencyIncidentModel.findByIdAndUpdate(id, updateData, { new: true });
      return incident ? this.mongoIncidentToIncident(incident) : undefined;
    } catch (error) {
      console.error('Error updating emergency incident:', error);
      return undefined;
    }
  }

  // AI Anomaly methods
  async getAIAnomalies(): Promise<AIAnomaly[]> {
    try {
      const anomalies = await AIAnomalyModel.find().sort({ createdAt: -1 });
      return anomalies.map(anomaly => this.mongoAnomalyToAnomaly(anomaly));
    } catch (error) {
      console.error('Error getting AI anomalies:', error);
      return [];
    }
  }

  async getAIAnomaliesByTouristId(touristId: string): Promise<AIAnomaly[]> {
    try {
      const anomalies = await AIAnomalyModel.find({ touristId }).sort({ createdAt: -1 });
      return anomalies.map(anomaly => this.mongoAnomalyToAnomaly(anomaly));
    } catch (error) {
      console.error('Error getting AI anomalies by tourist ID:', error);
      return [];
    }
  }

  async createAIAnomaly(anomaly: InsertAIAnomaly): Promise<AIAnomaly> {
    try {
      const created = await AIAnomalyModel.create({
        touristId: anomaly.touristId,
        anomalyType: anomaly.anomalyType,
        severity: anomaly.severity,
        confidence: Number(anomaly.confidence),
        description: anomaly.description,
        locationLat: anomaly.locationLat ? Number(anomaly.locationLat) : undefined,
        locationLng: anomaly.locationLng ? Number(anomaly.locationLng) : undefined,
        behaviorData: anomaly.behaviorData,
        isResolved: false
      });
      return this.mongoAnomalyToAnomaly(created);
    } catch (error) {
      console.error('Error creating AI anomaly:', error);
      throw error;
    }
  }

  async updateAIAnomaly(id: string, updates: Partial<AIAnomaly>): Promise<AIAnomaly | undefined> {
    try {
      const anomaly = await AIAnomalyModel.findByIdAndUpdate(id, updates, { new: true });
      return anomaly ? this.mongoAnomalyToAnomaly(anomaly) : undefined;
    } catch (error) {
      console.error('Error updating AI anomaly:', error);
      return undefined;
    }
  }

  // E-FIR methods
  async getEFIRs(): Promise<EFIR[]> {
    try {
      const efirs = await EFIRModel.find().sort({ createdAt: -1 });
      return efirs.map(efir => this.mongoEFIRToEFIR(efir));
    } catch (error) {
      console.error('Error getting E-FIRs:', error);
      return [];
    }
  }

  async getEFIRsByTouristId(touristId: string): Promise<EFIR[]> {
    try {
      const efirs = await EFIRModel.find({ touristId }).sort({ createdAt: -1 });
      return efirs.map(efir => this.mongoEFIRToEFIR(efir));
    } catch (error) {
      console.error('Error getting E-FIRs by tourist ID:', error);
      return [];
    }
  }

  async createEFIR(efir: InsertEFIR): Promise<EFIR> {
    try {
      const firNumber = `EFIR${Date.now()}${Math.random().toString(36).substr(2, 5).toUpperCase()}`;
      const created = await EFIRModel.create({
        firNumber,
        touristId: efir.touristId,
        incidentType: efir.incidentType,
        location: efir.location,
        locationLat: efir.locationLat ? Number(efir.locationLat) : undefined,
        locationLng: efir.locationLng ? Number(efir.locationLng) : undefined,
        description: efir.description,
        evidenceFiles: efir.evidenceFiles || [],
        filedBy: efir.filedBy,
        authorityContacted: efir.authorityContacted,
        status: 'filed'
      });
      return this.mongoEFIRToEFIR(created);
    } catch (error) {
      console.error('Error creating E-FIR:', error);
      throw error;
    }
  }

  async updateEFIR(id: string, updates: Partial<EFIR>): Promise<EFIR | undefined> {
    try {
      const efir = await EFIRModel.findByIdAndUpdate(id, { ...updates, updatedAt: new Date() }, { new: true });
      return efir ? this.mongoEFIRToEFIR(efir) : undefined;
    } catch (error) {
      console.error('Error updating E-FIR:', error);
      return undefined;
    }
  }

  // Authority methods
  async getAuthorities(): Promise<Authority[]> {
    try {
      const authorities = await AuthorityModel.find({ isActive: true }).sort({ name: 1 });
      return authorities.map(authority => this.mongoAuthorityToAuthority(authority));
    } catch (error) {
      console.error('Error getting authorities:', error);
      return [];
    }
  }

  async getAuthorityById(id: string): Promise<Authority | undefined> {
    try {
      const authority = await AuthorityModel.findById(id);
      return authority ? this.mongoAuthorityToAuthority(authority) : undefined;
    } catch (error) {
      console.error('Error getting authority by ID:', error);
      return undefined;
    }
  }

  async createAuthority(authority: InsertAuthority): Promise<Authority> {
    try {
      const created = await AuthorityModel.create({
        name: authority.name,
        type: authority.type,
        email: authority.email,
        phone: authority.phone,
        jurisdiction: authority.jurisdiction,
        isActive: true
      });
      return this.mongoAuthorityToAuthority(created);
    } catch (error) {
      console.error('Error creating authority:', error);
      throw error;
    }
  }

  async updateAuthority(id: string, updates: Partial<Authority>): Promise<Authority | undefined> {
    try {
      const authority = await AuthorityModel.findByIdAndUpdate(id, updates, { new: true });
      return authority ? this.mongoAuthorityToAuthority(authority) : undefined;
    } catch (error) {
      console.error('Error updating authority:', error);
      return undefined;
    }
  }

  // Digital ID validation methods
  async checkValidDigitalId(userId: string, startDate: Date, endDate: Date): Promise<{ isValid: boolean; tourist?: Tourist; message: string }> {
    try {
      const existingTourist = await this.getTouristByUserId(userId);
      
      if (!existingTourist) {
        return {
          isValid: false,
          message: 'No existing digital ID found. Please complete registration.'
        };
      }
      
      // Check if digital ID is valid for the dates
      if (existingTourist.digitalIdHash && existingTourist.startDate && existingTourist.endDate) {
        const existingStart = new Date(existingTourist.startDate);
        const existingEnd = new Date(existingTourist.endDate);
        const bufferedEnd = new Date(existingEnd);
        bufferedEnd.setDate(bufferedEnd.getDate() + 1);
        
        if (startDate >= existingStart && endDate <= bufferedEnd) {
          return {
            isValid: true,
            tourist: existingTourist,
            message: `Valid digital ID found. Your ID ${existingTourist.digitalIdHash?.slice(-8)} is valid until ${existingEnd.toLocaleDateString()}.`
          };
        }
      }
      
      return {
        isValid: false,
        tourist: existingTourist,
        message: 'Digital ID needs to be updated for these travel dates.'
      };
    } catch (error) {
      console.error('Error checking digital ID validity:', error);
      return {
        isValid: false,
        message: 'Error checking digital ID validity'
      };
    }
  }

  async updateTouristTripDates(touristId: string, startDate: Date, endDate: Date, itinerary?: string): Promise<Tourist | undefined> {
    try {
      const updateData: any = {
        startDate,
        endDate
      };
      
      if (itinerary) {
        updateData.itinerary = itinerary;
      }
      
      const tourist = await TouristModel.findByIdAndUpdate(touristId, updateData, { new: true });
      return tourist ? this.mongoTouristToTourist(tourist) : undefined;
    } catch (error) {
      console.error('Error updating tourist trip dates:', error);
      return undefined;
    }
  }

  // Blockchain-specific methods (keeping same interface as MemStorage)
  async verifyTouristIdentity(touristId: string, message: string, signature: string): Promise<boolean> {
    try {
      const tourist = await this.getTourist(touristId);
      if (!tourist?.digitalIdHash || !this.blockchainService) return false;
      
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
  
  async verifyTouristProfile(touristId: string, verificationLevel: number): Promise<string | null> {
    try {
      const tourist = await this.getTourist(touristId);
      if (!tourist?.digitalIdHash || !this.blockchainService) return null;
      
      const txHash = await this.blockchainService.verifyProfile(
        tourist.digitalIdHash,
        verificationLevel
      );
      
      // Update local record
      await this.updateTourist(touristId, { 
        safetyScore: Math.min(100, (tourist.safetyScore || 85) + (verificationLevel * 10))
      });
      
      return txHash;
    } catch (error) {
      console.error('Profile verification failed:', error);
      return null;
    }
  }
  
  async getBlockchainProfile(touristId: string): Promise<any> {
    try {
      const tourist = await this.getTourist(touristId);
      if (!tourist?.digitalIdHash || !this.blockchainService) return null;
      
      return await this.blockchainService.getProfile(tourist.digitalIdHash);
    } catch (error) {
      console.error('Failed to get blockchain profile:', error);
      return null;
    }
  }
  
  async emergencyAccessProfile(touristId: string): Promise<string | null> {
    try {
      const tourist = await this.getTourist(touristId);
      if (!tourist?.digitalIdHash || !this.blockchainService) return null;
      
      return await this.blockchainService.emergencyAccess(
        tourist.digitalIdHash,
        this.encryptionKey
      );
    } catch (error) {
      console.error('Emergency access failed:', error);
      return null;
    }
  }
  
  async isProfileVerified(touristId: string): Promise<boolean> {
    try {
      const tourist = await this.getTourist(touristId);
      if (!tourist?.digitalIdHash || !this.blockchainService) return false;
      
      return await this.blockchainService.isProfileVerified(tourist.digitalIdHash);
    } catch (error) {
      console.error('Verification check failed:', error);
      return false;
    }
  }
  
  async getBlockchainNetworkInfo(): Promise<{ name: string; chainId: number } | null> {
    try {
      if (!this.blockchainService) return null;
      return await this.blockchainService.getNetworkInfo();
    } catch (error) {
      console.error('Failed to get network info:', error);
      return null;
    }
  }

  /**
   * Get comprehensive blockchain and IPFS service status
   */
  async getBlockchainServiceStatus(): Promise<any> {
    try {
      if (!this.blockchainService) {
        return {
          available: false,
          blockchain: { connected: false, error: 'Blockchain service not initialized' },
          ipfs: { connected: false, enabled: false, error: 'Service not available' }
        };
      }
      
      const status = await this.blockchainService.getServiceStatus();
      return {
        available: true,
        ...status
      };
    } catch (error) {
      return {
        available: false,
        error: error instanceof Error ? error.message : 'Unknown service error'
      };
    }
  }
}